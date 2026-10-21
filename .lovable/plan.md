# Fichier SQL complet pour recréer la base dans votre Supabase

## Ce que vous recevrez
Un seul fichier téléchargeable `hold_supabase_migration.sql` à coller dans l'éditeur SQL de votre projet supabase.com. Il recrée toute la structure actuelle :
- Tables : profils, check-ins, événements (résistances / rechutes), abonnements, compteur d'usage du coach
- Règles de sécurité (chaque utilisateur ne voit que ses propres données) et droits d'accès
- Création automatique du profil à l'inscription
- Fonction du quota de messages du coach
- Contraintes (plans d'abonnement, tons du coach, sources d'acquisition, etc.)

## Étapes
1. Lire tous les fichiers de migration du projet (0000 à 0008) et les assembler dans l'ordre, sans modifier le SQL.
2. Comparer le résultat avec la base réelle actuelle (tables, colonnes, règles, fonctions) pour ne rien oublier.
3. Ajouter en tête un court mode d'emploi en commentaire : exécuter sur un projet vide, activer ensuite la connexion anonyme et email dans Supabase.
4. Enregistrer le fichier dans vos Fichiers et vous le présenter.

## À savoir
- Ce fichier contient uniquement la structure, pas les données ni les comptes utilisateurs.
- Si vous voulez aussi les données, je peux faire un second fichier d'export (sans les comptes, qui ne se transfèrent pas).
