---
description: Offene Fragen von der Website beantworten (Seite „Empfehlungen“)
---

Beantworte die Fragen, die ich auf der Website gestellt habe.

1. Führ `git pull` aus. Fragen kommen über die Website auf dem Home-PC ins Repo.
2. Lies alle `recommendations/*.md` mit `kind: frage` und `status: offen`. Gibt es keine, sag das und hör auf.
3. Lies `profile.md` und je nach Frage die aktiven Teile in `wardrobe/`, `outfits/` und `wishlist/`.
   Geh vor wie bei `/outfit`, `/kaufempfehlung` oder `/analyse`, je nachdem, worum es geht. Sieh dir Fotos an, wenn es auf Farbton oder Stil ankommt.
   Für Kaufempfehlungen gilt: echte, aktuell verfügbare Produkte per Websuche, nur Links, die du tatsächlich gefunden hast.
4. Leg für jede Frage eine Antwort an: `recommendations/<id>.md` mit `kind: empfehlung`, `status: offen`, `date` von heute,
   `answers: <id der Frage>`, passendem `topic` und einem kurzen `title`. Trag erwähnte Teile, Outfits und Wünsche in `items`, `outfits`
   und `wishes` ein, dann erscheinen sie auf der Website mit Foto. Der Text ist Markdown: kurze Überschriften, Listen, bei Produkten eine Tabelle mit Preis und Link.
   Schreib die Antwort so, dass sie ohne diesen Chat verständlich ist.
5. Setz bei der Frage `status: beantwortet`. Neue Wünsche für die Wunschliste oder Outfits nur anlegen, wenn die Frage danach verlangt; sonst als Vorschlag in der Antwort nennen.
6. Führ `npm run validate` aus, zeig mir die Antworten kurz im Chat und frag, ob ich sie committen und pushen will (erst dann erscheinen sie auf der Website).
