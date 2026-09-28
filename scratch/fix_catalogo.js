const fs = require('fs');
const products = JSON.parse(fs.readFileSync('extracted_products.json', 'utf8'));
const jsContent = `const INLINE_PRODUCTS = ${JSON.stringify(products, null, 2)};`;
fs.writeFileSync('catalogo.js', jsContent, 'utf8');
console.log('Fixed catalogo.js with correct images');
