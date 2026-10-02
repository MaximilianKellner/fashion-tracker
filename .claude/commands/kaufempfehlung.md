---
description: Lückenanalyse und konkrete Kaufempfehlungen für die Wunschliste
argument-hint: "[optional: konkreter Wunsch, z. B. Winterjacke bis 200 €]"
---

Gib mir Kaufempfehlungen. Konkreter Wunsch (optional): $ARGUMENTS

1. Lies `profile.md` (Stil, Größen, Budget, Shops, No-Gos), alle aktiven Teile in `wardrobe/`, `outfits/` und die offenen Einträge in `wishlist/`.
   Führ `npm run stats -- --json` für den Überblick aus.
2. **Lückenanalyse** (überspringen, wenn ich einen konkreten Wunsch genannt habe):
   - Welche Kategorien, Farben, Saisons oder Formalitätsstufen fehlen bzw. sind dünn besetzt, gemessen an meinem Alltag laut Profil?
   - Welche Teile lassen sich kaum kombinieren, und was würde sie „freischalten“?
   - Bewerte die Kandidaten danach, **mit wie vielen vorhandenen Teilen** sie kombinierbar wären.
   - Nenn die Top 3 Lücken mit kurzer Begründung. Wenn eigentlich nichts fehlt, sag das ehrlich.
3. Für die Top-Lücke (oder meinen Wunsch): Such per Websuche **3 konkrete, aktuell verfügbare Produkte**, passend zu Stil, Größe, Budget und bevorzugten Shops.
   Pro Produkt: Name, Shop, Preis, Link, warum es passt und mit welchen meiner Teile (Namen) es sich kombinieren lässt.
   Gib keine erfundenen Links aus. Nur URLs, die du in der Suche tatsächlich gefunden hast.
4. Frag, welche Produkte ich auf die Wunschliste setzen will. Leg dafür `wishlist/<id>.md` mit `status: offen` an (Felder siehe `docs/schema.md`) und führ `npm run validate` aus.
