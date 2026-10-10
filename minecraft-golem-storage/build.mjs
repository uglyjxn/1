// Concatenates src/ into one self-contained index.html (and an artifact-ready fragment)
import fs from 'node:fs';
const rd = f => fs.readFileSync(new URL('./src/' + f, import.meta.url), 'utf8');
const script = '<script>\n' + rd('engine.js') + '\n' + rd('model.js') + '\n' + rd('ui.js') + '\n</script>';
const body = rd('template.html').replace('<!--SCRIPT-->', () => script);
const full = '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n</head>\n<body>\n' + body + '\n</body>\n</html>\n';
fs.writeFileSync(new URL('./index.html', import.meta.url), full);
if (process.argv[2]) fs.writeFileSync(process.argv[2], body);
console.log('built', full.length, 'bytes');
