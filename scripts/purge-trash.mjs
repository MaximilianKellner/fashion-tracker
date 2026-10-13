// Aufruf: npm run purge-trash
// Löscht Wünsche, die seit mehr als 30 Tagen im Papierkorb liegen. Läuft auch bei jedem prepare-server.
import { purgeTrash, TRASH_DAYS } from './lib/trash.mjs';

const purged = await purgeTrash();
console.log(purged.length ? `${purged.length} Wunsch/Wünsche endgültig gelöscht: ${purged.join(', ')}` : `Nichts zu löschen (Papierkorb: ${TRASH_DAYS} Tage)`);
