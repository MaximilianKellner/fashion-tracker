---
description: Outfit-Vorschläge aus dem vorhandenen Kleiderschrank
argument-hint: "[Anlass, z. B. Büro, Date, Hochzeit am Samstag]"
---

Schlag mir Outfits aus meinem Kleiderschrank vor. Anlass/Wunsch: $ARGUMENTS

1. Lies `profile.md`. Fehlt der Anlass oben, frag kurz danach (ein Satz genügt).
2. Bestimme Saison und, wenn der Anlass heute oder in den nächsten Tagen ist, das Wetter am Wohnort per Websuche.
3. Lies alle `wardrobe/*/item.md` mit `status: aktiv`. Filtere nach Saison und passender Formalität.
   Sieh dir die Fotos der Kandidaten an, wenn Farbtöne oder Muster für die Kombination wichtig sind.
4. Schau in `outfits/`, welche Kombinationen ich schon gespeichert und gut bewertet habe. Nutze sie als Hinweis auf meinen Geschmack, schlag aber auch Neues vor.
   Bevorzuge Teile, die in noch keinem Outfit vorkommen (`npm run stats -- --json` → `outfits.itemsNotInAnyOutfit`).
5. Schlag **2–3 komplette Outfits** vor (Oberteil, Hose/Rock, Schuhe, ggf. Jacke/Accessoire). Für jedes Outfit:
   - die Teile mit Namen (und ID in Klammern),
   - 1–2 Sätze, warum es funktioniert (Farben, Proportionen, Anlass),
   - optional: welches fehlende Teil es noch besser machen würde.
6. Frag, ob ich eins davon speichern will. Falls ja: Leg `outfits/<id>.md` mit `source: claude` an (Felder siehe `docs/schema.md`), frag nach einem `rating` und führ `npm run validate` aus.
