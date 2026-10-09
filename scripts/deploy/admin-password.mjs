import fs from 'node:fs/promises';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { createPasswordHash } from '../../server/auth.mjs';

const args = process.argv.slice(2);
if (args[0] !== '--output' || !args[1] || (args[2] && (args[2] !== '--generate' || !args[3])) || args.length > 4) {
  console.error('Use admin-password.mjs --output NEW_HASH_FILE [--generate NEW_PRIVATE_PASSWORD_FILE]. Without --generate, read the password from stdin.');
  process.exitCode = 1;
} else {
  try {
    let password;
    if (args[2]) password = randomBytes(24).toString('base64url');
    else {
      const chunks = [];
      let size = 0;
      for await (const chunk of process.stdin) {
        size += chunk.length;
        if (size > 1024) throw new Error('Password is too long.');
        chunks.push(chunk);
      }
      password = Buffer.concat(chunks).toString('utf8').replace(/\r?\n$/, '');
    }
    const output = path.resolve(args[1]);
    await fs.mkdir(path.dirname(output), { recursive: true });
    await fs.writeFile(output, `${createPasswordHash(password)}\n`, { flag: 'wx', mode: 0o600 });
    if (args[2]) await fs.writeFile(path.resolve(args[3]), `${password}\n`, { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ passwordHashFile: output, privatePasswordFile: args[3] ? path.resolve(args[3]) : undefined }));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
