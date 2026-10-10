# Kleiderschrank-Daten

Daten für den [Fashion Tracker](https://github.com/MaximilianKellner/fashion-tracker): Kleidungsstücke, Outfits,
Wunschliste, Empfehlungen und Stilprofil als Markdown-Dateien mit Fotos. Dieses Repo sollte **privat** sein.

| Pfad | Inhalt |
|---|---|
| `profile.md` | Stilprofil, Maße, Größen |
| `wardrobe/<id>/item.md` + `photo-N.webp` | ein Ordner pro Kleidungsstück |
| `outfits/<id>.md` | gespeicherte Kombinationen |
| `wishlist/<id>.md` (+ `wishlist/<id>/photo-N.webp`) | Kaufwünsche |
| `recommendations/<id>.md` | Fragen an Claude und seine Antworten |
| `inbox/` | neue Rohfotos (nicht im Git) |

Alle Felder: [docs/schema.md](https://github.com/MaximilianKellner/fashion-tracker/blob/main/docs/schema.md) im Code-Repo.
