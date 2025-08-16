// scripts/fix-express5-wildcards.js
const fs = require('fs');
const path = require('path');

const exts = new Set(['.js', '.mjs', '.cjs', '.ts']);
const files = [];

(function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      // ignore node_modules, .git, build artefacts
      if (!/node_modules|\.git|dist|build|out/.test(p)) walk(p);
    } else if (exts.has(path.extname(p))) {
      files.push(p);
    }
  }
})(process.cwd());

const patches = [
  // app / router com '*' ou '/*'
  { re: /(\bapp\.get\s*\()\s*(['"`])\*\2/g, to: "$1'/(.*)'" },
  { re: /(\bapp\.use\s*\()\s*(['"`])\*\2/g, to: "$1'/(.*)'" },
  { re: /(\brouter\.(all|get|use|post|put|patch|delete)\s*\()\s*(['"`])\*\3/g, to: "$1'/(.*)'" },
  { re: /(['"`])\/\*\1/g, to: "'/(.*)'" },

  // '/api/*' -> '/api/(.*)'
  { re: /(['"`])\/api\/\*\1/g, to: "'/api/(.*)'" },

  // parâmetro inválido ':*' -> ':rest(.*)'
  { re: /:([*])(?!\w)/g, to: ':rest(.*)' }
];

let changed = 0;
for (const f of files) {
  let src = fs.readFileSync(f, 'utf8');
  let orig = src;
  for (const { re, to } of patches) src = src.replace(re, to);
  if (src !== orig) {
    fs.writeFileSync(f, src);
    console.log('patched:', f);
    changed++;
  }
}
console.log(`Done. Files patched: ${changed}`);
