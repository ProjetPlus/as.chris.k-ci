# Test E2E manuel — Mode Hors Ligne & Reconnexion Realtime

Ce protocole vérifie :
1. L'app démarre offline sans écran blanc (PWA + navigateur)
2. Le login fonctionne 100 % offline (auth cachée)
3. Aucune erreur realtime n'apparaît au cycle online → offline → online
4. La synchronisation reprend automatiquement à la reconnexion

> ⚠️ Le Service Worker ne s'active **qu'en production** (URL `.lovable.app` ou domaine custom). Il est volontairement désactivé dans la preview iframe Lovable.

## Prérequis
- App publiée
- Une première session **en ligne** réussie (login + navigation Dashboard, Membres, Cotisations, Paramètres) pour cacher assets + données + credentials admin
- Compte par défaut : `admin` / `12345678`

---

## Scénario 1 — PWA Mobile (mode avion)

1. **En ligne** : ouvrir l'app, login admin, naviguer Dashboard / Membres / Paramètres
2. Installer la PWA (Chrome : "Ajouter à l'écran d'accueil")
3. Forcer la fermeture du navigateur **et** de la PWA (force quit)
4. **Activer mode avion** ✈️
5. Lancer la PWA depuis l'icône
   - ✅ Login s'affiche, **PAS d'écran blanc**
   - ✅ Bannière rouge "Mode hors ligne — connectez-vous avec un identifiant déjà utilisé sur cet appareil."
   - ✅ Badge "Hors ligne" rouge
6. Connexion `admin` / `12345678`
   - ✅ Accepte (auth offline via cache SHA-256)
7. Naviguer Dashboard, Membres, Cotisations, Paramètres
   - ✅ Données affichées depuis cache
   - ✅ **Console : 0 erreur** `cannot add postgres_changes callbacks`
8. Ajouter un membre
   - ✅ Sauvegarde dans la file (badge orange `1` dans le header)
9. **Désactiver mode avion**
   - ✅ Badge passe "En ligne" vert en < 5s
   - ✅ Badge realtime `n/n` apparaît
   - ✅ Console : `[realtime] network online -> resubscribing N channels`
   - ✅ File se vide automatiquement (compteur → 0)
   - ✅ Le membre ajouté est visible côté serveur (vérifier sur un autre device)

---

## Scénario 2 — Cycle complet online → offline → online (DevTools)

1. Ouvrir l'app publiée dans Chrome desktop, F12 ouvert sur Console
2. Login admin, aller dans **Paramètres → Diagnostic Realtime**
   - ✅ Plusieurs canaux affichés en statut **"Connecté"** vert (members, deaths, contributions, treasury, settings)
3. Network → cocher **Offline**
   - ✅ Console : `[realtime] network offline -> tearing down channels`
   - ✅ Diagnostic : tous les canaux passent **"Fermé"**
   - ✅ **Aucune** erreur `subscribe` dans la console
4. Naviguer entre pages (Dashboard ↔ Membres ↔ Settings)
   - ✅ Pas d'écran blanc
   - ✅ Console reste propre
5. Décocher Offline
   - ✅ Console : `[realtime] network online -> resubscribing N channels`
   - ✅ Pour chaque table : `[realtime] subscribe -> tbl:xxx` puis `[realtime] status xxx SUBSCRIBED`
   - ✅ Diagnostic : compteur **"Resub"** incrémenté de +1, statut "Connecté"
   - ✅ **Aucune** erreur `cannot add postgres_changes callbacks for realtime:... after subscribe()`
6. Refaire 3 cycles offline ↔ online consécutifs
   - ✅ Diagnostic montre `Resub: 3+`, `Erreurs: 0`, statut toujours "Connecté"

---

## Scénario 3 — React StrictMode (dev local)

1. `bun dev` (StrictMode actif → useEffect monte 2x)
2. Console
   - ✅ Pour chaque table : **un seul** log `[realtime] subscribe -> tbl:xxx`
   - ✅ Au moins un `[realtime] guard: listener already registered for ...` ou `guard: channel already exists` (preuve que le double-mount est dédupliqué)
   - ✅ **Zéro** erreur `cannot add postgres_changes callbacks`
3. Naviguer plusieurs fois entre pages (mount/unmount répétés)
   - ✅ Diagnostic montre listeners stables (pas de fuite)

---

## Scénario 4 — Cold start offline avec PWA neuve

1. Désinstaller la PWA, vider le cache navigateur
2. Visite **online** unique : login + naviguer Dashboard, Members, Settings (~30s pour cacher assets et données)
3. Fermer tout, mode avion
4. Relancer l'app
   - ✅ Index.html sert depuis cache (badge SW actif dans Application tab)
   - ✅ Tous les chunks Vite `/assets/*-[hash].js` chargent depuis cache
   - ✅ Login → dashboard → données affichées

---

---

## Scénario 5 — Persistance du formulaire d'inscription (capture photo)

But : prouver que prendre/charger une photo n'efface JAMAIS les champs.

1. Login admin → **Membres → Nouvelle inscription**
2. Remplir Nom, Prénom, Contact (vérifier que `+225 ` reste verrouillé : essayer Backspace au début du champ → ne supprime pas le préfixe)
3. Sélectionner Département + Sous-préfecture + Type de pièce
4. Cliquer **"Prendre une photo"** (membre OU pièce d'identité) sur mobile
5. Prendre la photo et valider
   - ✅ Retour sur le formulaire : **TOUS les champs précédents intacts**
   - ✅ La photo s'affiche
6. Forcer un rechargement F5 / pull-to-refresh
   - ✅ Toutes les valeurs et la photo restaurées (sessionStorage)
7. Activer mode avion ✈️ → cliquer **Suivant** → remplir Étape 2 → **Enregistrer**
   - ✅ Membre ajouté localement, badge file de sync = `1`
8. Désactiver mode avion
   - ✅ File se vide automatiquement en < 30s (auto-sync toutes les 15s)
   - ✅ Membre visible sur le serveur

## Scénario 6 — Sync auto avec retry

1. Mode avion → ajouter 3 membres + modifier 1 cotisation
2. Vérifier badge file = `4`
3. Désactiver mode avion
   - ✅ Auto-flush dans les 15s suivant la reconnexion
   - ✅ En cas d'échec d'un item, retry automatique jusqu'à 8 fois (visible en console : `[sync] item failed (retry n/8)`)
   - ✅ Items qui réussissent sont retirés ; items en échec restent en file
4. Patienter 15s supplémentaires
   - ✅ Nouveau cycle de retry automatique

---

## Critères d'acceptation finaux

- [ ] **Aucun écran blanc**, jamais, en mode avion (PWA + navigateur)
- [ ] Login offline avec admin/12345678 fonctionne du premier coup
- [ ] Bannière "Mode hors ligne" visible sur le login avec message rassurant
- [ ] Préfixe `+225 ` non supprimable sur les 3 champs téléphone
- [ ] Capture photo n'efface jamais les autres champs (sessionStorage)
- [ ] Vue **Paramètres → Diagnostic Realtime** affiche statut + erreurs + resub par table
- [ ] Cycle online↔offline×3 sans aucune erreur realtime en console
- [ ] StrictMode : un seul subscribe par table, double-mount silencieusement dédupliqué
- [ ] File de sync se vide automatiquement à la reconnexion (auto-sync 15s + retry 8x)

## En cas d'erreur
- Ouvrir **Paramètres → Diagnostic Realtime** : la colonne "Dernière erreur" indique la cause
- Console filtrer sur `[realtime]` pour voir tout le cycle subscribe/unsubscribe/event
- Console filtrer sur `[sync]` pour voir les retries de la file offline
- Vérifier que le SW est bien `activated` (DevTools → Application → Service Workers)

---

## Scénario 7 — Photo + bascule réseau pendant la capture

But : la photo et tous les champs ne doivent jamais être vidés, même si le réseau change pendant la capture.

1. Login admin → **Membres → Nouvelle inscription**
2. Activer **mode avion** ✈️
3. Remplir Nom, Prénom, Contacts, Département, Sous-préfecture, Type de pièce
4. Cliquer **"Prendre une photo"** (caméra du membre)
5. **Pendant** que la caméra est ouverte, **désactiver mode avion** (revenir en ligne)
6. Valider la photo et revenir au formulaire
   - ✅ Tous les champs précédents sont intacts
   - ✅ La photo s'affiche
   - ✅ Console : `[autosync]` reprend automatiquement (visibilitychange/pageshow)
7. Réactiver mode avion ✈️ pendant la photo de la pièce d'identité
   - ✅ Mêmes garanties : aucun champ vidé, aucun crash
8. Remettre en ligne → **Suivant** → **Enregistrer**
   - ✅ La file de sync (Paramètres → File de synchronisation) se vide automatiquement

## Scénario 8 — Refresh hors ligne

1. Mode avion ✈️
2. Recharger la page (F5 / pull-to-refresh)
   - ✅ Login s'affiche immédiatement (PAS d'écran "vous êtes hors connexion")
   - ✅ Bannière "Mode hors ligne" visible
   - ✅ Connexion `admin` / `12345678` fonctionne
