const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');
const startIdx = html.indexOf('<script>\n        window.INITIAL_PRODUCTS = [');
if (startIdx === -1) {
    console.log('Not found');
    process.exit(1);
}
const endIdx = html.indexOf('</script>', startIdx);
if (endIdx === -1) {
    console.log('End not found');
    process.exit(1);
}
const newHtml = html.substring(0, startIdx) + '<script src="catalogo.js"></script>' + html.substring(endIdx + 9);
fs.writeFileSync('index.html', newHtml);
console.log('Replaced');
