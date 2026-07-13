# Refonte complète AS.CHRIS.K

Direction validée : **Ivoire & Terracotta** (#FAF5EE crème, #E8D5C4 sable, #C4654A terracotta, #2D2D2D anthracite) + carte membre **moderne épurée**.

Vu l'ampleur (visuel + UX + architecture + base de données), je livre en **4 lots successifs** pour ne jamais casser l'offline-first ni la synchronisation. Chaque lot est testable indépendamment.

---

## Lot 1 — Charte graphique complète (visuel)

- Réécriture de `src/index.css` : palette Ivoire/Terracotta sur tous les tokens (`--background`, `--primary` terracotta, `--accent` sable, `--sidebar-*` ivoire chaud au lieu de bordeaux foncé).
- Suppression des classes `bordeaux-*` / `or-*` partout, remplacement par tokens sémantiques (`primary`, `accent`, `secondary`).
- Sidebar : fond ivoire clair `#FBF6EC`, texte anthracite, accent terracotta — fini le fond bordeaux foncé.
- Logo : conteneur agrandi (56–64 px), suppression du `rounded-full` qui rogne, ajout d'un `padding` interne et fond transparent réel partout (Login, Sidebar, Header mobile).
- Régénération des icônes PWA (192/512/180) avec halo terracotta subtil, pas de fond blanc.
- Typographie : on garde Playfair Display (titres) + DM Sans (corps), ajustement des poids et interlignages.

## Lot 2 — Refonte UX (navigation + écrans clés)

- Nouvelle `AppLayout` avec header flottant ivoire, breadcrumb, bouton scan QR proéminent.
- Sidebar regroupée en 3 sections (Pilotage / Adhérents / Administration) avec icônes terracotta.
- Dashboard : cartes statistiques redesignées (KPI grands chiffres + sparkline), nouveaux graphiques.
- Liste membres : vue carte (mobile) + tableau (desktop), filtres en pilule.
- Formulaires d'inscription : steps visuels, champs plus grands, photo en cercle 120px.
- Page Login : split-screen avec illustration logo agrandi côté gauche.

## Lot 3 — Nouvelle carte membre CR80 (moderne épurée)

Recto :
- Fond ivoire `#FAF5EE`, bandeau terracotta fin en haut.
- Photo carrée arrondie 22×22mm, gauche.
- Nom en très gros (Playfair 14pt), ID en monospace terracotta dessous.
- Infos secondaires (campement, S/P, tél) en colonne droite, gris anthracite.
- Bandeau bas avec drapeau CI miniature + nom association.

Verso :
- QR code centré et **grand** (32×32mm) sur fond ivoire pur — scan rapide priorité.
- ID répété en gros sous le QR.
- Mentions légales discrètes.
- Footer terracotta avec AS.CHRIS.K.

Régénération automatique :
- Hook `useEffect` dans `MemberProfile` qui régénère le PDF à chaque update du membre (online ET offline).
- Cache PDF dans IndexedDB, invalidation sur `CACHE_EVENT` photo.
- File de retry exponentielle si échec de génération offline.

## Lot 4 — Architecture & base de données

- Migration : suppression des colonnes legacy `deceased_member_id` / `member_id` (texte) au profit des UUID FK uniquement, avec triggers de compatibilité descendante pendant 1 release.
- Ajout table `member_pdfs` (id, member_id FK, pdf_data bytea, generated_at, photo_hash) pour cache PDF côté serveur.
- Ajout table `audit_log` (action, table, record_id, user_id, payload, timestamp) pour traçabilité.
- Refonte `useDb.ts` : cache mémoire LRU, requêtes paginées, sélection de colonnes (réduction payload).
- Refactor `offline.ts` : séparation en modules (`syncQueue.ts`, `cache.ts`, `realtime.ts`).
- Tests : ajout de tests Vitest sur les helpers offline et la génération de carte.

---

## Détails techniques (pour référence)

```text
src/
├── index.css                    # Lot 1 — palette Ivoire/Terracotta
├── components/
│   ├── AppSidebar.tsx           # Lot 1+2 — fond clair, logo agrandi
│   ├── AppLayout.tsx            # Lot 2 — nouveau header
│   └── MemberCard.tsx           # Lot 3 — nouveau composant carte
├── pages/
│   ├── Dashboard.tsx            # Lot 2 — KPI redesign
│   ├── Members.tsx              # Lot 2 — vue carte/tableau
│   ├── Cards.tsx                # Lot 3 — nouvelle génération PDF
│   └── Login.tsx                # Lot 2 — split-screen
├── lib/
│   ├── pdfGenerator.ts          # Lot 3 — extraction logique PDF
│   ├── syncQueue.ts             # Lot 4 — split offline.ts
│   └── cache.ts                 # Lot 4 — LRU cache
└── db/
    ├── useDb.ts                 # Lot 4 — pagination + LRU
    └── pdfCache.ts              # Lot 3 — cache IndexedDB

supabase/migrations/             # Lot 4 — member_pdfs + audit_log
public/
├── icon-192.png                 # Lot 1 — régénérés terracotta
├── icon-512.png
└── apple-touch-icon.png
```

**Risques connus** :
- Le Lot 4 (DB) peut perturber la sync offline si fait trop vite — c'est pourquoi il vient en dernier, après validation visuelle.
- La suppression des colonnes legacy nécessite une migration de données préalable.

**Ordre d'exécution proposé** : Lot 1 → tu valides visuel → Lot 2 → tu valides UX → Lot 3 → tu valides carte → Lot 4 → tests.

Confirme et je commence immédiatement par le **Lot 1** (charte + sidebar + logos).
