// Holt die neueste Version (git pull) und kopiert neue/geänderte Artikel in den Benutzerordner der installierten App.
// Aufruf: node tools/update.mjs   (oder: npm run update / update.bat)
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const run = c => execSync(c, { cwd: ROOT, stdio: 'inherit' });
const before = execSync('git rev-parse HEAD', { cwd: ROOT }).toString().trim();
run('git pull --ff-only');
const after = execSync('git rev-parse HEAD', { cwd: ROOT }).toString().trim();
if (before === after) console.log('\nBereits auf dem neuesten Stand.');
else {
  const changed = execSync(`git diff --name-only ${before} ${after}`, { cwd: ROOT }).toString();
  if (/package(-lock)?\.json/.test(changed)) run('npm install');
  console.log('\nAktualisiert: ' + changed.split('\n').filter(Boolean).length + ' Dateien geändert.');
}

// Eigene Artikel in den Ordner der installierten App übertragen (nur gleichnamige Dateien werden überschrieben)
const target = process.env.SOLARPEDIA_USER_DIR || path.join(os.homedir(), 'Solarpedia', 'user-articles');
const src = path.join(ROOT, 'user-articles');
if (fs.existsSync(target) && path.resolve(target) !== path.resolve(src)) {
  let n = 0;
  const copy = (from, to) => {
    fs.mkdirSync(to, { recursive: true });
    for (const e of fs.readdirSync(from, { withFileTypes: true })) {
      const a = path.join(from, e.name), b = path.join(to, e.name);
      if (e.isDirectory()) copy(a, b);
      else if (!fs.existsSync(b) || fs.readFileSync(a, 'utf8') !== fs.readFileSync(b, 'utf8')) { fs.copyFileSync(a, b); n++; }
    }
  };
  copy(src, target);
  console.log(`Eigene Artikel: ${n} Datei(en) nach ${target} übertragen.`);
}
console.log('\nFertig. Die App danach neu starten (oder bei der installierten App neu bauen: npm run dist:win).');
