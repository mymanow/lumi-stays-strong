Remplacer les portraits de l'écran « Ton plan sur-mesure est prêt »

- Envoyer les 3 photos (elodie.png, marc.png, camille.png) sur le CDN des assets.
- Dans la config des portraits de cet écran, remplacer les 3 silhouettes par ces photos, dans l'ordre déjà affiché : Elodie, Marc, Camille (prénoms inchangés, FR et EN).
- Rien d'autre ne change (textes, mise en page, autres écrans d'avis).

Technique : `lovable-assets create` vers `src/assets/stories/*.png.asset.json`, puis `STORY_PHOTOS` dans `src/config/reviews.ts` utilise les `.url` importées.
