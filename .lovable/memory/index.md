# Memory: index.md

# Project Memory

## Core
Local-first PWA synced with Supabase (permissive RLS, offline support).
Login uses custom RPC with username (no email). Admin: admin / 12345678.
Theme: Bordeaux #6B1A2E, Gold #C9A84C, Cream #FAF7F4. Playfair Display (headings), DM Sans (body).
Mobile payments via Wave, Orange, MTN, Moov. 10k FCFA join fee.
Association officielle: AS.CHRIS.K (Association des Chrétiens de Kouassikankro). Initiales ID: A. Format: A-YY-NNN.
Logo: arbre de mains colorées (src/assets/logo-camp-bethel.png) — utilisé partout (login, sidebar, favicon, PWA).
Scanner QR: implémentation native video + jsQR (pas html5-qrcode), avec fallback saisie manuelle.

## Memories
- [Authentication & Roles](mem://auth/credentials) — Login via username (no email) using custom RPC, 6 user roles
- [Design System](mem://style/design-system) — Bordeaux/Gold/Cream palette, specific fonts for layout and cards
- [Membership Rules & Cards](mem://features/membership-rules) — ID format A-YY-NNN, max 2 dependents, 10k FCFA fee, CR80 card specs with QR
- [Death Compensations & Contributions](mem://features/financials-deaths) — Compensation amounts, 1000 FCFA auto-contribution, payment proofs
- [Dashboard Analytics](mem://features/dashboard-analytics) — Recharts metrics for member status, collections, and financial history
- [Navigation Layout](mem://navigation/layout) — QR scanner as main CTA, specific sidebar exclusions
- [Dynamic Settings](mem://features/settings) — Association config and financial variables stored in 'settings' table
