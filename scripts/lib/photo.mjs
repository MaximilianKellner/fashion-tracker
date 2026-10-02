// Fotos verkleinern, nach WebP konvertieren und Metadaten (EXIF inkl. GPS) entfernen.
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

export const MAX_SIZE = 1024;

/**
 * Verarbeitet ein Foto (Pfad oder Buffer) und speichert es als nächstes photo-N.webp in itemDir.
 * Gibt den Dateinamen zurück (z. B. "photo-2.webp").
 */
export async function processPhoto(input, itemDir) {
  await fs.mkdir(itemDir, { recursive: true });
  const existing = await fs.readdir(itemDir);
  let n = 1;
  while (existing.includes(`photo-${n}.webp`)) n++;
  const name = `photo-${n}.webp`;

  await sharp(input)
    .rotate() // Handy-Fotos anhand der EXIF-Ausrichtung drehen, bevor die Metadaten wegfallen
    .resize({ width: MAX_SIZE, height: MAX_SIZE, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(path.join(itemDir, name));
  // sharp übernimmt Metadaten nur mit .withMetadata() – ohne den Aufruf ist die Ausgabe EXIF-frei.

  return name;
}
