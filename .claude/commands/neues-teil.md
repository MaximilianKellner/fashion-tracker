---
description: Neue Kleidungsstücke aus den Fotos in inbox/ erfassen
---

Erfasse die neuen Kleidungsstücke aus `inbox/`. $ARGUMENTS

1. Liste alle Bilddateien in `inbox/` auf (jpg, jpeg, png, heic, webp). Ist der Ordner leer, sag das und hör auf.
2. Sieh dir jedes Foto an. Gehören mehrere Fotos zum selben Teil (z. B. Vorder- und Rückseite, Etikett), gruppiere sie und frag kurz nach, wenn du unsicher bist.
   Liest du auf einem Etikett Marke, Größe oder Material, übernimm das.
3. Pro Kleidungsstück:
   - Lies `docs/schema.md`, falls noch nicht geschehen.
   - Vergib eine ID `JJJJ-MM-TT-slug` (heutiges Datum, kurzer beschreibender Slug) und prüfe, dass es `wardrobe/<id>/` noch nicht gibt.
   - Verarbeite jedes Foto mit `npm run photo -- "inbox/<datei>" <id> --delete` (Etikett-Fotos ebenfalls, sie sind später nützlich).
   - Leg `wardrobe/<id>/item.md` an. Fülle aus dem Foto aus: `name`, `category`, `subcategory`, `colors`, `pattern`, `material` (wenn erkennbar), `fit`, `seasons`, `formality`, `status: aktiv`, `photos`.
     Schreib in den Text eine kurze Beschreibung (Farbton, Details, Stil) und womit es sich gut kombinieren lässt.
4. Zeig mir am Ende eine kompakte Tabelle aller erfassten Teile und frag gesammelt nach den Feldern, die du nicht erkennen konntest:
   Marke, Größe, Kaufdatum, Preis, Shop. Trag meine Antworten ein. Was ich nicht weiß, bleibt leer.
5. Führ `npm run validate` aus und behebe eventuelle Fehler.
