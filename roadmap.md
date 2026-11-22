# Roadmap
- [x] Migrate CreativeScroll code, schema, roles, storage bucket into Lovable Cloud
- [x] First-sign-in password setup for migrated users
- [ ] Import existing records, users and media files (blocked: exports from the old project not supplied)
- [ ] Grant moderator role to the right accounts after users are imported (blocked: user export)

## Creator experience polish (requested 22 Nov)
- [ ] Creator landing = "Accueil" dashboard: notifications (reports, moderation decisions, important events) with a real empty state, quick stats, recent content
- [ ] Bottom nav: Accueil in the middle; "Mes contenus" (list + create inside it); "Scroll" feed placeholder ("À venir"); no separate "Créer" tab, no "Bibliothèque"
- [ ] Bottom nav: smaller, thinner, compact iOS-style floating pill
- [ ] Profile avatar moves to top-left and opens an expanding quick-settings popover (no longer duplicates Réglages)
- [ ] Mes contenus: icon search that expands on tap, icon filter menu instead of full-width dropdowns, compact toolbar
- [ ] Smoothness: skeleton loaders per page, spinners on busy buttons, overscroll bounce on scroll areas
- [ ] Sign-up → app transition: staggered per-element bounce (slight dip down, then smooth glide up)
