/**
 * VALEN MAKEUP - SCRIPT PRINCIPAL & GESTIÓN DE CATÁLOGO (ESTILO LAS BRATZ)
 */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const navMenu = document.getElementById('nav-menu');
    const headerCartBtn = document.getElementById('header-cart-btn');
    const headerCartCount = document.getElementById('header-cart-count');
    const navAdminBtn = document.getElementById('nav-admin-btn');
    const siteLogo = document.getElementById('site-logo');

    // Catalog & Filter Elements
    const searchInput = document.getElementById('search-input');
    const searchClearBtn = document.getElementById('search-clear-btn');
    const categoryFilters = document.getElementById('category-filters');
    const productsGrid = document.getElementById('products-grid');
    const loadingTrigger = document.getElementById('loading-trigger');
    const catalogCountText = document.getElementById('catalog-count-text');
    const heroTotalProds = document.getElementById('hero-total-prods');

    // Cart Modal Elements
    const cartModal = document.getElementById('cart-modal');
    const cartCloseBtn = document.getElementById('cart-close-btn');
    const cartItemsContainer = document.getElementById('cart-items');
    const cartTotalPrice = document.getElementById('cart-total-price');
    const checkoutCustomerName = document.getElementById('checkout-customer-name');
    const checkoutCustomerPhone = document.getElementById('checkout-customer-phone');
    const checkoutCustomerAddress = document.getElementById('checkout-customer-address');
    const btnCheckout = document.getElementById('btn-checkout');

    // Thank You Modal Elements
    const thankyouModal = document.getElementById('thankyou-modal');
    const thankyouCloseBtn = document.getElementById('thankyou-close-btn');
    const thankyouOkBtn = document.getElementById('thankyou-ok-btn');

    // Admin Modal Elements
    const adminPasswordModal = document.getElementById('admin-password-modal');
    const adminPanel = document.getElementById('admin-panel');
    const adminLoginForm = document.getElementById('admin-login-form');
    const adminLoginMessage = document.getElementById('admin-login-message');
    const adminCloseButtons = document.querySelectorAll('.admin-close');
    const adminPinInputs = [
        document.getElementById('admin-pin-input-1'),
        document.getElementById('admin-pin-input-2'),
        document.getElementById('admin-pin-input-3'),
        document.getElementById('admin-pin-input-4'),
    ];

    // Admin Form Elements
    const adminProductForm = document.getElementById('admin-product-form');
    const adminProductPanel = document.getElementById('admin-product-panel');
    const adminProductToggle = document.getElementById('admin-product-toggle');
    const adminProductCancel = document.getElementById('admin-product-cancel');
    const adminFormHeading = document.getElementById('admin-form-heading');
    const adminProductSubmitBtn = document.getElementById('admin-product-submit-btn');
    const adminProductImageInput = document.getElementById('admin-product-image');
    const adminImagePreviewWrap = document.getElementById('admin-image-preview-wrap');
    const adminImagePreviewImg = document.getElementById('admin-image-preview-img');
    const adminImagePreviewText = document.getElementById('admin-image-preview-text');
    const adminProductMessage = document.getElementById('admin-product-message');
    const adminCategorySelect = document.getElementById('admin-product-category');

    // Admin Category & Inventory Elements
    const adminCategoryForm = document.getElementById('admin-category-form');
    const adminCategoryList = document.getElementById('admin-category-list');
    const adminCategoryMessage = document.getElementById('admin-category-message');
    const adminProductSearch = document.getElementById('admin-product-search');
    const adminCategoryPills = document.getElementById('admin-category-pills');
    const adminProductList = document.getElementById('admin-product-list');
    const adminHeaderProductStat = document.getElementById('admin-header-product-stat');
    const adminHeaderCategoryStat = document.getElementById('admin-header-category-stat');
    const adminTotalProductsBadge = document.getElementById('admin-total-products-badge');
    const adminChangePasswordForm = document.getElementById('admin-change-password-form');
    const adminPasswordMessage = document.getElementById('admin-password-message');

    // Global State
    let allProducts = [];
    let filteredProducts = [];
    let allCategories = [];
    let selectedCategory = 'all';
    let cart = [];
    let adminPassword = '';
    let adminProducts = [];
    let adminCategories = [];
    let adminSelectedCat = 'all';
    let adminSearchQuery = '';

    const WHATSAPP_NUMBER = '573002525489';
    const API_BASE_URL = (window.API_BASE_URL || '').replace(/\/$/, '');

    const CANONICAL_CATEGORIES = [
        'Cuidado Facial y Corporal',
        'Maquillaje',
        'Cabello y Ducha',
        'Accesorios',
        'Bloomshell'
    ];

    // ==========================================
    // SPARKLE BACKGROUND GENERATOR
    // ==========================================
    function initSparkles() {
        const bg = document.getElementById('sparkle-bg');
        if (!bg) return;
        bg.innerHTML = '';
        const count = window.innerWidth < 768 ? 15 : 30;
        for (let i = 0; i < count; i++) {
            const dot = document.createElement('div');
            dot.className = 'sparkle-dot';
            const size = Math.random() * 4 + 2;
            dot.style.width = `${size}px`;
            dot.style.height = `${size}px`;
            dot.style.left = `${Math.random() * 100}%`;
            dot.style.top = `${Math.random() * 100}%`;
            dot.style.animationDelay = `${Math.random() * 5}s`;
            dot.style.animationDuration = `${Math.random() * 3 + 3}s`;
            bg.appendChild(dot);
        }
    }
    initSparkles();
    window.addEventListener('resize', initSparkles);

    // ==========================================
    // HELPERS & NETWORKING
    // ==========================================
    function normalizeCategoryName(name) {
        if (!name) return 'Maquillaje';
        const clean = String(name).replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1FA00}-\u{1FAFF}\u{200D}\u{FE0F}]/gu, '').replace(/\s+/g, ' ').trim();
        const lower = clean.toLowerCase();
        if (lower === 'cuidado facial' || lower === 'corporal' || lower === 'cuidado corporal' || lower === 'cuidado facial y corporal') {
            return 'Cuidado Facial y Corporal';
        }
        if (lower === 'maquillaje') return 'Maquillaje';
        if (lower === 'cabello' || lower === 'ducha' || lower === 'cabello y ducha') return 'Cabello y Ducha';
        if (lower === 'accesorios' || lower === 'herramientas') return 'Accesorios';
        if (lower === 'bloomshell') return 'Bloomshell';
        return clean;
    }

    function formatPrice(val) {
        return `$${Number(val || 0).toLocaleString('es-CO')}`;
    }

    async function fetchApi(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const sep = url.includes('?') ? '&' : '?';
        const finalUrl = `${url}${sep}_t=${Date.now()}`;
        return fetch(finalUrl, {
            cache: 'no-store',
            headers: {
                'Pragma': 'no-cache',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                ...(options.headers || {})
            },
            ...options
        });
    }

    // Floating Notification Toast
    function showNotification(message, icon = '💖') {
        const existing = document.querySelector('.floating-notification');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = 'floating-notification';
        toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(15px)';
            setTimeout(() => toast.remove(), 400);
        }, 3000);
    }

    // ==========================================
    // HAMBURGER & NAV
    // ==========================================
    if (hamburgerBtn && navMenu) {
        hamburgerBtn.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });

        navMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
            });
        });
    }

    // ==========================================
    // CATALOG LOADING & RENDERING
    // ==========================================
    async function loadCatalog() {
        if (loadingTrigger) loadingTrigger.style.display = 'block';
        try {
            const res = await fetchApi('/api/products');
            if (res.ok) {
                allProducts = await res.json();
            } else {
                throw new Error('Fallback to extracted JSON');
            }
        } catch (e) {
            try {
                const res = await fetchApi('/extracted_products.json');
                allProducts = await res.json();
            } catch (err) {
                allProducts = [];
            }
        }

        // Clean & ensure categories
        allProducts = (allProducts || []).map(p => ({
            ...p,
            category: normalizeCategoryName(p.category)
        }));

        if (heroTotalProds) {
            heroTotalProds.textContent = `${allProducts.length}+`;
        }

        await loadCategories();
        applyFilters();
    }

    async function loadCategories() {
        try {
            const res = await fetchApi('/api/categories');
            if (res.ok) {
                allCategories = await res.json();
            } else {
                allCategories = [];
            }
        } catch (e) {
            allCategories = [];
        }

        // Merge with canonical categories
        const catMap = new Map();
        allCategories.forEach(c => catMap.set(normalizeCategoryName(c.name).toLowerCase(), c.name));
        CANONICAL_CATEGORIES.forEach(c => {
            if (!catMap.has(c.toLowerCase())) {
                catMap.set(c.toLowerCase(), c);
            }
        });

        allCategories = Array.from(catMap.values());
        renderCategoryFilterPills();
    }

    function renderCategoryFilterPills() {
        if (!categoryFilters) return;
        categoryFilters.innerHTML = '';

        // "Todas"
        const allBtn = document.createElement('button');
        allBtn.type = 'button';
        allBtn.className = `category-pill ${selectedCategory === 'all' ? 'active' : ''}`;
        allBtn.innerHTML = `💖 Todas`;
        allBtn.addEventListener('click', () => {
            selectedCategory = 'all';
            renderCategoryFilterPills();
            applyFilters();
        });
        categoryFilters.appendChild(allBtn);

        const categoryIcons = {
            'Cuidado Facial y Corporal': '✨',
            'Maquillaje': '💄',
            'Cabello y Ducha': '💇‍♀️',
            'Accesorios': '👑',
            'Bloomshell': '🌸'
        };

        allCategories.forEach(catName => {
            const icon = categoryIcons[catName] || '✨';
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `category-pill ${selectedCategory.toLowerCase() === catName.toLowerCase() ? 'active' : ''}`;
            btn.innerHTML = `${icon} ${catName}`;
            btn.addEventListener('click', () => {
                selectedCategory = catName;
                renderCategoryFilterPills();
                applyFilters();
            });
            categoryFilters.appendChild(btn);
        });
    }

    function applyFilters() {
        const query = (searchInput ? searchInput.value : '').toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        filteredProducts = allProducts.filter(p => p.active !== false).filter(p => {
            const nameNorm = String(p.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            const catNorm = normalizeCategoryName(p.category).toLowerCase();
            const matchesSearch = !query || nameNorm.includes(query) || catNorm.includes(query);
            const matchesCat = selectedCategory === 'all' || catNorm === selectedCategory.toLowerCase();
            return matchesSearch && matchesCat;
        });

        renderProductsGrid();
    }

    function renderProductsGrid() {
        if (loadingTrigger) loadingTrigger.style.display = 'none';
        if (!productsGrid) return;
        productsGrid.innerHTML = '';

        if (catalogCountText) {
            catalogCountText.textContent = `Mostrando ${filteredProducts.length} de ${allProducts.length} productos`;
        }

        if (filteredProducts.length === 0) {
            productsGrid.innerHTML = `
                <div class="catalog-empty-state">
                    <i class="fas fa-heart-crack"></i>
                    <h3>No encontramos productos que coincidan</h3>
                    <p>Intenta con otra palabra clave o selecciona otra categoría.</p>
                </div>
            `;
            return;
        }

        const fragment = document.createDocumentFragment();

        filteredProducts.forEach(product => {
            const card = document.createElement('div');
            card.className = 'product-card';
            card.innerHTML = `
                <div class="product-image-container">
                    <img src="${product.image || 'Logo.jpeg'}" alt="${product.name}" loading="lazy" onerror="this.onerror=null;this.src='Logo.jpeg';">
                    <span class="product-category-tag">${product.category || 'Maquillaje'}</span>
                    ${product.page ? `<span class="product-page-tag">Pág. ${product.page}</span>` : ''}
                </div>
                <div class="product-info">
                    <h3 class="product-title" title="${product.name}">${product.name}</h3>
                    <div class="product-price-row">
                        <div class="product-price">${formatPrice(product.price)}</div>
                    </div>
                    <button class="btn-add-cart" data-id="${product.id}">
                        <i class="fas fa-shopping-bag"></i> Agregar al Carrito
                    </button>
                </div>
            `;

            const addBtn = card.querySelector('.btn-add-cart');
            addBtn.addEventListener('click', () => {
                addToCart(product);
            });

            fragment.appendChild(card);
        });

        productsGrid.appendChild(fragment);
    }

    // Search events
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            if (searchClearBtn) {
                if (searchInput.value.trim()) {
                    searchClearBtn.classList.remove('hidden');
                } else {
                    searchClearBtn.classList.add('hidden');
                }
            }
            applyFilters();
        });
    }

    if (searchClearBtn) {
        searchClearBtn.addEventListener('click', () => {
            searchInput.value = '';
            searchClearBtn.classList.add('hidden');
            applyFilters();
        });
    }

    // ==========================================
    // SHOPPING CART & WHATSAPP CHECKOUT
    // ==========================================
    function loadSavedCart() {
        try {
            const raw = localStorage.getItem('valen_cart');
            if (raw) cart = JSON.parse(raw);
        } catch (e) {
            cart = [];
        }
        updateCartUi();
    }

    function saveCart() {
        try {
            localStorage.setItem('valen_cart', JSON.stringify(cart));
        } catch (e) {}
        updateCartUi();
    }

    function addToCart(product) {
        const existing = cart.find(item => Number(item.id) === Number(product.id));
        if (existing) {
            existing.quantity = (existing.quantity || 1) + 1;
        } else {
            cart.push({ ...product, quantity: 1 });
        }
        saveCart();
        showNotification(`¡${product.name.slice(0, 22)}... agregado!`, '🛍️');
    }

    const floatingCartBar = document.getElementById('floating-cart-bar');
    const floatingCartCount = document.getElementById('floating-cart-count');
    const floatingCartTotal = document.getElementById('floating-cart-total');

    function updateCartUi() {
        const totalCount = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
        const total = cart.reduce((sum, item) => sum + (Number(item.price || 0) * (item.quantity || 1)), 0);

        if (headerCartCount) {
            headerCartCount.textContent = totalCount;
        }

        if (floatingCartCount) {
            floatingCartCount.textContent = totalCount;
        }

        if (floatingCartTotal) {
            floatingCartTotal.textContent = formatPrice(total);
        }

        if (floatingCartBar) {
            if (totalCount > 0) {
                floatingCartBar.style.display = 'flex';
            } else {
                floatingCartBar.style.display = 'none';
            }
        }

        if (cartItemsContainer) {
            if (cart.length === 0) {
                cartItemsContainer.innerHTML = `
                    <div style="text-align: center; padding: 35px 20px; color: #a89bb4;">
                        <i class="fas fa-bag-shopping" style="font-size: 2.2rem; margin-bottom: 10px; color: var(--bratz-pink);"></i>
                        <p style="font-weight: 600;">Tu carrito está vacío</p>
                    </div>
                `;
            } else {
                cartItemsContainer.innerHTML = cart.map(item => `
                    <div class="cart-item">
                        <img src="${item.image || 'Logo.jpeg'}" alt="${item.name}" onerror="this.onerror=null;this.src='Logo.jpeg';">
                        <div class="cart-item-details">
                            <h4>${item.name}</h4>
                            <div class="cart-item-price">${formatPrice(item.price)}</div>
                        </div>
                        <div class="quantity-control">
                            <button type="button" class="btn-qty-minus" data-id="${item.id}">-</button>
                            <span>${item.quantity || 1}</span>
                            <button type="button" class="btn-qty-plus" data-id="${item.id}">+</button>
                        </div>
                    </div>
                `).join('');

                cartItemsContainer.querySelectorAll('.btn-qty-minus').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const id = Number(btn.getAttribute('data-id'));
                        const item = cart.find(i => Number(i.id) === id);
                        if (item) {
                            item.quantity -= 1;
                            if (item.quantity <= 0) {
                                cart = cart.filter(i => Number(i.id) !== id);
                            }
                            saveCart();
                        }
                    });
                });

                cartItemsContainer.querySelectorAll('.btn-qty-plus').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const id = Number(btn.getAttribute('data-id'));
                        const item = cart.find(i => Number(i.id) === id);
                        if (item) {
                            item.quantity += 1;
                            saveCart();
                        }
                    });
                });
            }
        }

        if (cartTotalPrice) {
            cartTotalPrice.textContent = formatPrice(total);
        }
    }

    if (floatingCartBar && cartModal) {
        floatingCartBar.addEventListener('click', () => {
            cartModal.classList.add('active');
        });
    }

    if (headerCartBtn && cartModal) {
        headerCartBtn.addEventListener('click', (e) => {
            e.preventDefault();
            cartModal.classList.add('active');
        });
    }

    if (cartCloseBtn && cartModal) {
        cartCloseBtn.addEventListener('click', () => {
            cartModal.classList.remove('active');
        });
    }

    // Checkout button WhatsApp action
    if (btnCheckout) {
        btnCheckout.addEventListener('click', () => {
            if (cart.length === 0) {
                alert('Tu carrito está vacío. Agrega productos para realizar tu pedido.');
                return;
            }

            const name = (checkoutCustomerName ? checkoutCustomerName.value : '').trim();
            const phone = (checkoutCustomerPhone ? checkoutCustomerPhone.value : '').trim();
            const address = (checkoutCustomerAddress ? checkoutCustomerAddress.value : '').trim();

            if (!name || !address) {
                alert('Por favor ingresa tu Nombre y Dirección de entrega para coordinar tu pedido.');
                if (!name && checkoutCustomerName) checkoutCustomerName.focus();
                else if (checkoutCustomerAddress) checkoutCustomerAddress.focus();
                return;
            }

            let total = 0;
            let msg = `✨ *NUEVO PEDIDO - VALEN MAKEUP* ✨\n`;
            msg += `👑 _Belleza & Glamour Estilo Bratz_\n\n`;
            msg += `📋 *DATOS DEL CLIENTE:*\n`;
            msg += `👤 *Nombre:* ${name}\n`;
            if (phone) msg += `📱 *Teléfono:* ${phone}\n`;
            msg += `📍 *Dirección:* ${address}\n\n`;
            msg += `🛍️ *PRODUCTOS SELECCIONADOS:*\n`;

            cart.forEach((item, idx) => {
                const sub = (Number(item.price || 0)) * (item.quantity || 1);
                total += sub;
                msg += `*${idx + 1}.* ${item.name}\n`;
                msg += `   └ Cantidad: ${item.quantity} x ${formatPrice(item.price)} = ${formatPrice(sub)}\n`;
            });

            msg += `\n---------------------------------\n`;
            msg += `💰 *TOTAL ESTIMADO:* ${formatPrice(total)}\n`;
            msg += `---------------------------------\n\n`;
            msg += `🚚 *Por favor indícame disponibilidad y valor de envío.* ✨`;

            const encoded = encodeURIComponent(msg);
            const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encoded}`;
            window.open(waUrl, '_blank');

            // Close cart and show Thank You modal
            if (cartModal) cartModal.classList.remove('active');
            if (thankyouModal) thankyouModal.classList.add('active');
        });
    }

    if (thankyouCloseBtn && thankyouModal) {
        thankyouCloseBtn.addEventListener('click', () => thankyouModal.classList.remove('active'));
    }
    if (thankyouOkBtn && thankyouModal) {
        thankyouOkBtn.addEventListener('click', () => thankyouModal.classList.remove('active'));
    }

    // ==========================================
    // ADMIN PANEL & 3-TAP LOGO ACCESS
    // ==========================================
    let logoTaps = 0;
    let logoTapTimer = null;

    function handleLogoTap(e) {
        logoTaps += 1;
        clearTimeout(logoTapTimer);
        logoTapTimer = setTimeout(() => { logoTaps = 0; }, 1400);

        if (logoTaps >= 3) {
            logoTaps = 0;
            openAdminPinModal();
        }
    }

    if (siteLogo) {
        siteLogo.addEventListener('click', handleLogoTap);
    }

    function openAdminPinModal() {
        if (adminLoginMessage) adminLoginMessage.textContent = '';
        adminPinInputs.forEach(input => { if (input) input.value = ''; });
        if (adminPinInputs[0]) adminPinInputs[0].focus();
        if (adminPasswordModal) adminPasswordModal.classList.add('active');
    }

    adminCloseButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            if (adminPasswordModal) adminPasswordModal.classList.remove('active');
            if (adminPanel) adminPanel.classList.remove('active');
        });
    });

    window.addEventListener('click', (e) => {
        if (e.target === adminPasswordModal) adminPasswordModal.classList.remove('active');
        if (e.target === adminPanel) adminPanel.classList.remove('active');
        if (e.target === cartModal) cartModal.classList.remove('active');
        if (e.target === thankyouModal) thankyouModal.classList.remove('active');
    });

    // PIN auto-focus stepper
    adminPinInputs.forEach((input, idx) => {
        if (!input) return;
        input.addEventListener('input', (e) => {
            const val = e.target.value.replace(/\D/g, '');
            e.target.value = val;
            if (val && idx < adminPinInputs.length - 1) {
                adminPinInputs[idx + 1].focus();
            }
        });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && idx > 0) {
                adminPinInputs[idx - 1].focus();
            }
        });
    });

    // Submit PIN Login
    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (adminLoginMessage) adminLoginMessage.textContent = '';
            const enteredPin = adminPinInputs.map(i => (i ? i.value : '')).join('').trim();

            if (enteredPin.length < 4) {
                if (adminLoginMessage) adminLoginMessage.textContent = 'Ingresa los 4 dígitos del PIN.';
                return;
            }

            try {
                const res = await fetchApi('/api/admin/authenticate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: enteredPin })
                });

                if (!res.ok) {
                    if (adminLoginMessage) adminLoginMessage.textContent = 'PIN incorrecto. Intenta de nuevo.';
                    return;
                }

                adminPassword = enteredPin;
                if (adminPasswordModal) adminPasswordModal.classList.remove('active');
                if (adminPanel) adminPanel.classList.add('active');
                await loadAdminData();
            } catch (err) {
                if (adminLoginMessage) adminLoginMessage.textContent = 'Error al conectar con el servidor.';
            }
        });
    }

    async function loadAdminData() {
        try {
            const [prodsRes, catsRes] = await Promise.all([
                fetchApi('/api/products?active=false'),
                fetchApi('/api/categories')
            ]);

            if (prodsRes.ok) adminProducts = await prodsRes.json();
            if (catsRes.ok) adminCategories = await catsRes.json();

            populateAdminCategorySelect();
            renderAdminCategoryChips();
            renderAdminCategoryPills();
            renderAdminProductsList();
            updateAdminStats();
        } catch (e) {
            console.error('Error loading admin data:', e);
        }
    }

    function updateAdminStats() {
        if (adminHeaderProductStat) adminHeaderProductStat.innerHTML = `<i class="fas fa-boxes"></i> ${adminProducts.length} Productos`;
        if (adminHeaderCategoryStat) adminHeaderCategoryStat.innerHTML = `<i class="fas fa-tags"></i> ${adminCategories.length} Categorías`;
        if (adminTotalProductsBadge) adminTotalProductsBadge.textContent = `${adminProducts.length} productos en base de datos`;
    }

    function populateAdminCategorySelect() {
        if (!adminCategorySelect) return;
        adminCategorySelect.innerHTML = '<option value="">Selecciona una categoría existente</option>';
        adminCategories.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat.id || cat.name;
            opt.textContent = cat.name;
            adminCategorySelect.appendChild(opt);
        });
    }

    function renderAdminCategoryChips() {
        if (!adminCategoryList) return;
        adminCategoryList.innerHTML = '';
        adminCategories.forEach(cat => {
            const count = adminProducts.filter(p => normalizeCategoryName(p.category).toLowerCase() === cat.name.toLowerCase()).length;
            const chip = document.createElement('div');
            chip.className = 'admin-category-chip';
            chip.innerHTML = `
                <span>${cat.name}</span>
                <span class="chip-count">${count}</span>
            `;
            adminCategoryList.appendChild(chip);
        });
    }

    function renderAdminCategoryPills() {
        if (!adminCategoryPills) return;
        adminCategoryPills.innerHTML = '';

        const allPill = document.createElement('button');
        allPill.type = 'button';
        allPill.className = `admin-pill-btn ${adminSelectedCat === 'all' ? 'active' : ''}`;
        allPill.innerHTML = `<span>Todas</span> (${adminProducts.length})`;
        allPill.addEventListener('click', () => {
            adminSelectedCat = 'all';
            renderAdminCategoryPills();
            renderAdminProductsList();
        });
        adminCategoryPills.appendChild(allPill);

        adminCategories.forEach(cat => {
            const count = adminProducts.filter(p => normalizeCategoryName(p.category).toLowerCase() === cat.name.toLowerCase()).length;
            const pill = document.createElement('button');
            pill.type = 'button';
            pill.className = `admin-pill-btn ${adminSelectedCat.toLowerCase() === cat.name.toLowerCase() ? 'active' : ''}`;
            pill.innerHTML = `<span>${cat.name}</span> (${count})`;
            pill.addEventListener('click', () => {
                adminSelectedCat = cat.name;
                renderAdminCategoryPills();
                renderAdminProductsList();
            });
            adminCategoryPills.appendChild(pill);
        });
    }

    function renderAdminProductsList() {
        if (!adminProductList) return;
        adminProductList.innerHTML = '';

        let list = adminProducts.slice();
        if (adminSelectedCat !== 'all') {
            list = list.filter(p => normalizeCategoryName(p.category).toLowerCase() === adminSelectedCat.toLowerCase());
        }
        if (adminSearchQuery) {
            const q = adminSearchQuery.toLowerCase();
            list = list.filter(p => String(p.name || '').toLowerCase().includes(q) || String(p.id).includes(q));
        }

        if (list.length === 0) {
            adminProductList.innerHTML = `<p style="padding: 20px; color: #a99bb5; text-align: center; grid-column: 1/-1;">No hay productos que coincidan.</p>`;
            return;
        }

        list.forEach(p => {
            const card = document.createElement('div');
            card.className = `admin-prod-card ${p.active === false ? 'inactive-product' : ''}`;
            card.innerHTML = `
                <div class="admin-prod-card-main">
                    <img src="${p.image || 'Logo.jpeg'}" class="admin-prod-thumb" alt="${p.name}" onerror="this.onerror=null;this.src='Logo.jpeg';">
                    <div class="admin-prod-info">
                        <div class="admin-prod-name" title="${p.name}">#${p.id} - ${p.name}</div>
                        <div class="admin-prod-price">${formatPrice(p.price)}</div>
                        <small style="color: var(--bratz-light-pink); font-size: 0.72rem;">${p.category || 'Maquillaje'} ${p.active === false ? '• (Oculto)' : ''}</small>
                    </div>
                </div>
                <div class="admin-prod-actions">
                    <button type="button" class="admin-action-btn admin-action-edit" data-id="${p.id}"><i class="fas fa-pen"></i> Editar</button>
                    <button type="button" class="admin-action-btn admin-action-toggle ${p.active === false ? 'to-inactive' : ''}" data-id="${p.id}" data-active="${p.active !== false}">
                        <i class="fas ${p.active === false ? 'fa-eye' : 'fa-eye-slash'}"></i> ${p.active === false ? 'Mostrar' : 'Ocultar'}
                    </button>
                    <button type="button" class="admin-action-btn admin-action-delete" data-id="${p.id}"><i class="fas fa-trash"></i></button>
                </div>
            `;

            card.querySelector('.admin-action-edit').addEventListener('click', () => openEditProduct(p.id));
            card.querySelector('.admin-action-toggle').addEventListener('click', (e) => toggleProductState(p.id, p.active !== false));
            card.querySelector('.admin-action-delete').addEventListener('click', () => deleteProduct(p.id));

            adminProductList.appendChild(card);
        });
    }

    if (adminProductSearch) {
        adminProductSearch.addEventListener('input', (e) => {
            adminSearchQuery = e.target.value.trim();
            renderAdminProductsList();
        });
    }

    // Toggle Product Form Visibility
    if (adminProductToggle && adminProductPanel) {
        adminProductToggle.addEventListener('click', () => {
            adminProductPanel.classList.toggle('hidden');
        });
    }

    if (adminProductCancel && adminProductPanel && adminProductForm) {
        adminProductCancel.addEventListener('click', () => {
            adminProductForm.reset();
            delete adminProductForm.dataset.editingId;
            if (adminFormHeading) adminFormHeading.innerHTML = '<i class="fas fa-plus-circle"></i> Agregar Producto';
            if (adminProductSubmitBtn) adminProductSubmitBtn.innerHTML = '<i class="fas fa-save"></i> Guardar en Base de Datos';
            if (adminImagePreviewWrap) adminImagePreviewWrap.classList.add('hidden');
            adminProductPanel.classList.add('hidden');
        });
    }

    // Image compression helper
    function compressImageFile(file, maxWidth = 800) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.85));
                };
                img.onerror = () => resolve(event.target.result);
            };
            reader.onerror = reject;
        });
    }

    // Image input preview
    if (adminProductImageInput) {
        adminProductImageInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                const compressed = await compressImageFile(file);
                if (adminImagePreviewImg) adminImagePreviewImg.src = compressed;
                if (adminImagePreviewWrap) adminImagePreviewWrap.classList.remove('hidden');
            }
        });
    }

    // Submit Add / Edit Product
    if (adminProductForm) {
        adminProductForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (adminProductMessage) adminProductMessage.textContent = 'Guardando producto en base de datos...';

            const name = document.getElementById('admin-product-name').value.trim();
            const price = parseInt(document.getElementById('admin-product-price').value, 10);
            const catSelect = document.getElementById('admin-product-category').value;
            const catNew = document.getElementById('admin-product-category-new').value.trim();
            const active = document.getElementById('admin-product-active').checked;
            const editingId = adminProductForm.dataset.editingId;

            let image = adminProductForm.dataset.existingImage || 'img/product_1.jpg';
            if (adminProductImageInput && adminProductImageInput.files[0]) {
                image = await compressImageFile(adminProductImageInput.files[0]);
            }

            const category = normalizeCategoryName(catNew || catSelect || 'Maquillaje');

            const payload = {
                name,
                price,
                image,
                category,
                active,
                page: 1
            };

            try {
                const endpoint = editingId ? `/api/products/${editingId}` : '/api/products';
                const method = editingId ? 'PATCH' : 'POST';

                const res = await fetchApi(endpoint, {
                    method,
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Admin-Password': adminPassword
                    },
                    body: JSON.stringify(payload)
                });

                if (!res.ok) {
                    throw new Error('Error al guardar en el servidor');
                }

                showNotification(editingId ? 'Producto actualizado en la base de datos' : '¡Producto agregado con éxito!', '✅');
                adminProductForm.reset();
                delete adminProductForm.dataset.editingId;
                delete adminProductForm.dataset.existingImage;
                if (adminProductMessage) adminProductMessage.textContent = '';
                if (adminImagePreviewWrap) adminImagePreviewWrap.classList.add('hidden');
                if (adminProductPanel) adminProductPanel.classList.add('hidden');

                await loadAdminData();
                await loadCatalog();
            } catch (err) {
                if (adminProductMessage) adminProductMessage.textContent = `Error: No se pudo guardar el producto. (${err.message})`;
            }
        });
    }

    function openEditProduct(id) {
        const prod = adminProducts.find(p => Number(p.id) === Number(id));
        if (!prod) return;

        document.getElementById('admin-product-name').value = prod.name;
        document.getElementById('admin-product-price').value = prod.price;
        document.getElementById('admin-product-category').value = prod.category || '';
        document.getElementById('admin-product-category-new').value = '';
        document.getElementById('admin-product-active').checked = prod.active !== false;

        adminProductForm.dataset.editingId = prod.id;
        adminProductForm.dataset.existingImage = prod.image;

        if (adminImagePreviewImg && prod.image) {
            adminImagePreviewImg.src = prod.image;
            if (adminImagePreviewWrap) adminImagePreviewWrap.classList.remove('hidden');
        }

        if (adminFormHeading) adminFormHeading.innerHTML = `<i class="fas fa-edit"></i> Editando: ${prod.name}`;
        if (adminProductSubmitBtn) adminProductSubmitBtn.innerHTML = '<i class="fas fa-save"></i> Actualizar Producto';
        if (adminProductPanel) adminProductPanel.classList.remove('hidden');

        document.getElementById('admin-product-card-form').scrollIntoView({ behavior: 'smooth' });
    }

    async function toggleProductState(id, currentActive) {
        try {
            const res = await fetchApi(`/api/products/${id}/state`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Admin-Password': adminPassword
                },
                body: JSON.stringify({ active: !currentActive })
            });

            if (res.ok) {
                showNotification(!currentActive ? 'Producto activado' : 'Producto ocultado');
                await loadAdminData();
                await loadCatalog();
            }
        } catch (e) {
            alert('No se pudo cambiar el estado del producto');
        }
    }

    async function deleteProduct(id) {
        const prod = adminProducts.find(p => Number(p.id) === Number(id));
        const name = prod ? prod.name : 'este producto';
        if (!confirm(`¿Estás seguro de que deseas eliminar permanentemente "${name}"? Esta acción se reflejará para todos los usuarios.`)) {
            return;
        }

        try {
            const res = await fetchApi(`/api/products/${id}`, {
                method: 'DELETE',
                headers: {
                    'X-Admin-Password': adminPassword
                }
            });

            if (res.ok) {
                showNotification('Producto eliminado de la base de datos', '🗑️');
                await loadAdminData();
                await loadCatalog();
            } else {
                alert('No se pudo eliminar el producto del servidor.');
            }
        } catch (e) {
            alert('Error al conectar con la base de datos para eliminar el producto.');
        }
    }

    // Submit New Category
    if (adminCategoryForm) {
        adminCategoryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const catInput = document.getElementById('admin-new-category');
            const name = catInput.value.trim();
            if (!name) return;

            try {
                const res = await fetchApi('/api/categories', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Admin-Password': adminPassword
                    },
                    body: JSON.stringify({ name })
                });

                if (res.ok) {
                    catInput.value = '';
                    showNotification('Categoría creada', '✨');
                    await loadAdminData();
                    await loadCatalog();
                }
            } catch (err) {
                if (adminCategoryMessage) adminCategoryMessage.textContent = 'Error al crear la categoría.';
            }
        });
    }

    // Change Admin PIN
    if (adminChangePasswordForm) {
        adminChangePasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newPin = document.getElementById('admin-new-password').value.trim();
            if (!newPin || newPin.length < 4) {
                if (adminPasswordMessage) adminPasswordMessage.textContent = 'El PIN debe tener al menos 4 dígitos.';
                return;
            }

            try {
                const res = await fetchApi('/api/admin/password', {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Admin-Password': adminPassword
                    },
                    body: JSON.stringify({ password: newPin })
                });

                if (res.ok) {
                    adminPassword = newPin;
                    document.getElementById('admin-new-password').value = '';
                    if (adminPasswordMessage) adminPasswordMessage.textContent = 'PIN actualizado con éxito.';
                    showNotification('PIN de acceso actualizado', '🔒');
                }
            } catch (e) {
                if (adminPasswordMessage) adminPasswordMessage.textContent = 'No se pudo actualizar el PIN.';
            }
        });
    }

    // Initialize App
    loadSavedCart();
    loadCatalog();
});