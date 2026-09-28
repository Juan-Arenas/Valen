const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');
const regex = /<script>\s*window\.INITIAL_PRODUCTS = \[[^]*?\];\s*<\/script>/;
html = html.replace(regex, '<script src="catalogo.js"></script>');
fs.writeFileSync('index.html', html);
