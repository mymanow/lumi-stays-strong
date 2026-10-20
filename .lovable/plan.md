# Héberger Hold sur Vercel avec votre propre base Supabase

## À savoir avant de commencer
- La base actuelle (Lovable Cloud) ne peut pas être déplacée vers votre compte supabase.com. Votre Supabase sur Vercel sera une base **séparée** : il faudra y recréer les tables et, si besoin, y copier les données.
- Le coach IA utilise une clé Lovable qui ne marche pas hors de Lovable : il faudra la remplacer par votre propre fournisseur d'IA (par exemple une clé OpenAI).
- Le lien de paiement Whop devra pointer vers la nouvelle adresse Vercel.

## Étapes
1. **Récupérer le code** : connecter le projet à GitHub (Paramètres → GitHub), puis importer ce dépôt dans Vercel.
2. **Préparer votre Supabase** : dans votre projet supabase.com, exécuter dans l'ordre les fichiers de `drizzle/migrations/` (0000 à 0008), puis activer la connexion anonyme et par email.
3. **Adapter le code pour Vercel** (je peux le faire) : ajouter la configuration de déploiement Vercel pour TanStack Start, et faire passer le coach par votre propre clé IA.
4. **Variables dans Vercel** : `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, les mêmes en `VITE_SUPABASE_*`, `WHOP_API_KEY`, la clé du webhook Whop, la clé de votre IA.
5. **Whop** : remplacer l'adresse du webhook par `https://votre-app.vercel.app/api/public/whop-webhook`.
6. **Données existantes** (facultatif) : exporter les tables depuis le panneau Cloud et les importer dans votre Supabase. Les comptes utilisateurs ne se transfèrent pas : il faudra se reconnecter.

## Alternative plus simple
Garder Lovable Cloud et brancher un nom de domaine personnalisé sur l'app publiée : pas de migration, rien ne casse.
