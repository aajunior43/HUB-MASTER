/**
 * Copia data/inaja.sqlite (+ wal/shm se existirem) e uploads para data/backups/AAAA-MM-DD_HHMMSS/
 * Uso: npm run backup
 */
import { createBackup } from "../server/backup.mjs";

try {
  const result = createBackup();
  for (const f of result.files) console.log("  +", f);
  if (result.uploads) console.log(`  + uploads/ (${result.uploads} arquivo(s))`);
  console.log("\nBackup OK:", result.path);
  console.log(`Tamanho: ${(result.bytes / 1024).toFixed(1)} KB`);
} catch (e) {
  console.error(e?.message || e);
  process.exit(1);
}
