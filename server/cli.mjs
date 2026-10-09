import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

/** Node resolves ESM module URLs to real files, but keeps symlinks in argv[1]. */
export function isMainModule(moduleUrl) {
  if (!process.argv[1]) return false;
  try {
    return fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(moduleUrl));
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return false;
    throw error;
  }
}
