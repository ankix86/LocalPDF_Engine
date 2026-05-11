const fs = require('fs');
const en = JSON.parse(fs.readFileSync('./locales/en.json', 'utf-8'));
const es = JSON.parse(fs.readFileSync('./locales/es.json', 'utf-8'));

let missingInEs = [];
let missingInEn = [];

for (const key in en) {
  if (!(key in es)) missingInEs.push(key);
}
for (const key in es) {
  if (!(key in en)) missingInEn.push(key);
}

console.log("Missing in es.json:", missingInEs.length ? missingInEs : "None");
console.log("Missing in en.json:", missingInEn.length ? missingInEn : "None");
