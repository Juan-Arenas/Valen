const fs = require('fs');
let js = fs.readFileSync('script.js', 'utf8');

js = js.replace(
    /const active = document\.getElementById\('admin-product-active'\)\.checked;/,
    `const active = document.getElementById('admin-product-active').checked;
            const skin_tones_count_raw = document.getElementById('admin-product-skin-tones-count') ? document.getElementById('admin-product-skin-tones-count').value : '';
            const skin_tones_count = skin_tones_count_raw ? Number(skin_tones_count_raw) : 0;`
);

js = js.replace(
    /skin_tones_image,\s*category,\s*active,\s*page: 1/,
    `skin_tones_image,
                skin_tones_count,
                category,
                active,
                page: 1`
);

js = js.replace(
    /document\.getElementById\('admin-product-active'\)\.checked = prod\.active !== false;/,
    `document.getElementById('admin-product-active').checked = prod.active !== false;
        if (document.getElementById('admin-product-skin-tones-count')) document.getElementById('admin-product-skin-tones-count').value = prod.skin_tones_count || '';`
);

js = js.replace(
    /delete adminProductForm\.dataset\.existingSkinTones;/,
    `delete adminProductForm.dataset.existingSkinTones;
            if (document.getElementById('admin-product-skin-tones-count')) document.getElementById('admin-product-skin-tones-count').value = '';`
);

fs.writeFileSync('script.js', js, 'utf8');

let api = fs.readFileSync('api/[...rest].js', 'utf8');
api = api.replace(
    /skin_tones_image: payload\.skin_tones_image \? String\(payload\.skin_tones_image\)\.trim\(\) : ''/,
    `skin_tones_image: payload.skin_tones_image ? String(payload.skin_tones_image).trim() : '',
          skin_tones_count: payload.skin_tones_count ? Number(payload.skin_tones_count) : 0`
);

api = api.replace(
    /if \(payload\.skin_tones_image != null\) products\[index\]\.skin_tones_image = String\(payload\.skin_tones_image\)\.trim\(\);/,
    `if (payload.skin_tones_image != null) products[index].skin_tones_image = String(payload.skin_tones_image).trim();
        if (payload.skin_tones_count != null) products[index].skin_tones_count = Number(payload.skin_tones_count) || 0;`
);
fs.writeFileSync('api/[...rest].js', api, 'utf8');

console.log('Updated script.js and api/[...rest].js');
