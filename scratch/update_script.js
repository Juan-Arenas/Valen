const fs = require('fs');
let js = fs.readFileSync('script.js', 'utf8');

js = js.replace(
    /\$\{product\.skin_tones_image \? `<button type="button" class="btn-view-tones" [\s\S]*?<\/button>` : ''\}/,
    `\${product.skin_tones_image ? \`<button type="button" class="btn-view-tones" style="background: #fdf2f8; color: var(--bratz-pink); border: 1px solid var(--bratz-pink); border-radius: 8px; padding: 6px; width: 100%; margin-bottom: 8px; font-weight: 700; cursor: pointer;" onclick="window.open('\${product.skin_tones_image}', '_blank')"><i class="fas fa-palette"></i> Ver Tonos Disponibles</button>\` : ''}
                    \${product.skin_tones_count > 0 ? \`<div style="margin-bottom: 8px;"><label style="font-size: 0.8rem; font-weight: bold; color: var(--text-dark);">Elige tu tono:</label><select class="product-tone-select" style="width: 100%; padding: 6px; border-radius: 8px; border: 1px solid #ddd; margin-top: 4px;"><option value="">Selecciona un tono...</option>\${Array.from({length: product.skin_tones_count}, (_, i) => \`<option value="\${i+1}">Tono \${i+1}</option>\`).join('')}</select></div>\` : ''}`
);

js = js.replace(
    /const addBtn = card\.querySelector\('\.btn-add-cart'\);\s*addBtn\.addEventListener\('click', \(\) => \{\s*addToCart\(product\);\s*\}\);/,
    `const addBtn = card.querySelector('.btn-add-cart');
            addBtn.addEventListener('click', () => {
                let selectedTone = null;
                if (product.skin_tones_count > 0) {
                    const select = card.querySelector('.product-tone-select');
                    if (select && !select.value) {
                        alert('Por favor selecciona un tono antes de agregar al carrito.');
                        return;
                    }
                    if (select) selectedTone = select.value;
                }
                addToCart(product, selectedTone);
            });`
);

js = js.replace(
    /function addToCart\(product\) \{\s*const existing = cart\.find\(item => Number\(item\.id\) === Number\(product\.id\)\);\s*if \(existing\) \{\s*existing\.quantity = \(existing\.quantity \|\| 1\) \+ 1;\s*\} else \{\s*cart\.push\(\{ \.\.\.product, quantity: 1 \}\);\s*\}/,
    `function addToCart(product, selectedTone) {
        const existing = cart.find(item => Number(item.id) === Number(product.id) && item.selectedTone === selectedTone);
        if (existing) {
            existing.quantity = (existing.quantity || 1) + 1;
        } else {
            cart.push({ ...product, quantity: 1, selectedTone: selectedTone });
        }`
);

js = js.replace(
    /cartItemsContainer\.innerHTML = cart\.map\(item => `[\s\S]*?`\)\.join\(''\);/,
    `cartItemsContainer.innerHTML = cart.map((item, index) => \`
                    <div class="cart-item">
                        <img src="\${item.image || 'Logo.jpeg'}" alt="\${item.name}" onerror="this.onerror=null;this.src='Logo.jpeg';">
                        <div class="cart-item-details">
                            <h4>\${item.name} \${item.selectedTone ? \`(Tono \${item.selectedTone})\` : ''}</h4>
                            <div class="cart-item-price">\${formatPrice(item.price)}</div>
                        </div>
                        <div class="quantity-control">
                            <button type="button" class="btn-qty-minus" data-index="\${index}">-</button>
                            <span>\${item.quantity || 1}</span>
                            <button type="button" class="btn-qty-plus" data-index="\${index}">+</button>
                        </div>
                    </div>
                \`).join('');`
);

js = js.replace(
    /cartItemsContainer\.querySelectorAll\('\.btn-qty-minus'\)\.forEach\(btn => \{\s*btn\.addEventListener\('click', \(\) => \{\s*const id = Number\(btn\.getAttribute\('data-id'\)\);\s*const item = cart\.find\(i => Number\(i\.id\) === id\);\s*if \(item\) \{\s*item\.quantity -= 1;\s*if \(item\.quantity <= 0\) \{\s*cart = cart\.filter\(i => Number\(i\.id\) !== id\);\s*\}\s*saveCart\(\);\s*\}\s*\}\);\s*\}\);/,
    `cartItemsContainer.querySelectorAll('.btn-qty-minus').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const idx = Number(btn.getAttribute('data-index'));
                        const item = cart[idx];
                        if (item) {
                            item.quantity -= 1;
                            if (item.quantity <= 0) {
                                cart.splice(idx, 1);
                            }
                            saveCart();
                        }
                    });
                });`
);

js = js.replace(
    /cartItemsContainer\.querySelectorAll\('\.btn-qty-plus'\)\.forEach\(btn => \{\s*btn\.addEventListener\('click', \(\) => \{\s*const id = Number\(btn\.getAttribute\('data-id'\)\);\s*const item = cart\.find\(i => Number\(i\.id\) === id\);\s*if \(item\) \{\s*item\.quantity \+= 1;\s*saveCart\(\);\s*\}\s*\}\);\s*\}\);/,
    `cartItemsContainer.querySelectorAll('.btn-qty-plus').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const idx = Number(btn.getAttribute('data-index'));
                        if (cart[idx]) {
                            cart[idx].quantity += 1;
                            saveCart();
                        }
                    });
                });`
);

js = js.replace(
    /msg \+= `\*\$\{idx \+ 1\}\.\* \$\{item\.name\}\\n`;/g,
    `msg += \`*\${idx + 1}.* \${item.name} \${item.selectedTone ? \`(Tono \${item.selectedTone})\` : ''}\\n\`;`
);

fs.writeFileSync('script.js', js, 'utf8');
