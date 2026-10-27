# Connexion avec Whop sur « Content·e de te revoir. »

## Ce qui change à l'écran
- Le champ e-mail et le bouton « Recevoir le lien » disparaissent.
- Un seul bouton « Se connecter avec Whop » / « Sign in with Whop », même style que l'actuel bouton principal.
- Aucun bouton Google ou Facebook.
- Rien d'autre ne change : Lumi, le titre, le sous-titre, le retour, le choix de langue et le texte en bas restent tels quels.

## Point important sur l'adresse
`https://whop.com` est la page d'accueil de Whop, pas une page de connexion : un clic dessus n'identifierait personne et la personne ne reviendrait pas connectée dans Hold. Le bouton utilisera la vraie page de connexion Whop (`https://whop.com/oauth`), qui renvoie ensuite vers Hold avec la preuve de connexion.

## Ce dont j'aurai besoin de vous
Dans votre tableau de bord Whop (Developer → votre app → OAuth) :
- l'identifiant client (Client ID) et le secret client, que j'ajouterai aux secrets du projet (jamais dans le code) ;
- y déclarer l'adresse de retour : `https://lumi-stays-strong.lovable.app/api/public/whop-oauth/callback` (et celle de la prévisualisation).

## Section technique
- `src/routes/signin.tsx` : bouton qui appelle une server function générant `state` + PKCE (cookie httpOnly) et redirige vers `https://whop.com/oauth?client_id&redirect_uri&response_type=code&scope=openid profile email&state&code_challenge`.
- Nouvelle route `src/routes/api/public/whop-oauth/callback.ts` : vérifie `state`, échange le code sur `https://api.whop.com/oauth/token`, lit l'utilisateur Whop (id + e-mail), puis, via le client service role chargé dans le handler, retrouve l'utilisateur Supabase lié (metadata `whop_user_id` ou e-mail) et génère un lien de session (`auth.admin.generateLink` type magiclink) vers lequel on redirige — la personne arrive connectée sur l'accueil. Si aucun compte n'est trouvé : retour sur /signin avec un message « Aucun compte Hold lié à ce compte Whop ».
- i18n FR/EN : nouvelle clé `signin.whop`, message d'erreur ; anciennes clés e-mail retirées si inutilisées.
- Aucun changement de base, de `.env`, de `supabase/config.toml` ni de `src/integrations/supabase/*`.
- Test : vérification du `state` et du cas « compte introuvable ».
