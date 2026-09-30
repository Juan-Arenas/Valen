/**
 * VALEN MAKEUP - SCRIPT PRINCIPAL & GESTIÓN DE CATÁLOGO (CON SUPABASE CLOUD DB)
 */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const hamburgerBtn = document.getElementById('hamburger-btn');
    
    // Mantenimiento: Forzar limpieza de cache local si hay bugs de versiones pasadas
    if (!localStorage.getItem('valen_cache_cleared_v1')) {
        const url = localStorage.getItem('valen_supabase_url');
        const key = localStorage.getItem('valen_supabase_key');
        localStorage.clear();
        if (url) localStorage.setItem('valen_supabase_url', url);
        if (key) localStorage.setItem('valen_supabase_key', key);
        localStorage.setItem('valen_cache_cleared_v1', 'true');
        console.log('Mantenimiento: Caché limpiada correctamente.');
    }
    const navMenu = document.getElementById('nav-menu');
    const headerCartBtn = document.getElementById('header-cart-btn');
    const headerCartCount = document.getElementById('header-cart-count');
    const siteLogo = document.getElementById('site-logo');

    // Catalog & Filter Elements
    const searchInput = document.getElementById('search-input');
    const searchClearBtn = document.getElementById('search-clear-btn');
    const categoryFilters = document.getElementById('category-filters');
    const productsGrid = document.getElementById('products-grid');
    const loadingTrigger = document.getElementById('loading-trigger');
    const catalogCountText = document.getElementById('catalog-count-text');

    // Floating Bottom Bar Elements
    const floatingCartBar = document.getElementById('floating-cart-bar');
    const floatingCartCount = document.getElementById('floating-cart-count');
    const floatingCartTotal = document.getElementById('floating-cart-total');

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
    const adminProductSkinTonesInput = document.getElementById('admin-product-skin-tones');
    const adminSkinTonesPreviewWrap = document.getElementById('admin-skin-tones-preview-wrap');
    const adminSkinTonesPreviewImg = document.getElementById('admin-skin-tones-preview-img');
    const adminProductMessage = document.getElementById('admin-product-message');
    const adminCategorySelect = document.getElementById('admin-product-category');

    // Admin Category & Inventory Elements
    const adminCategoryForm = document.getElementById('admin-category-form');
    const adminCategoryList = document.getElementById('admin-category-list');
    const adminProductSearch = document.getElementById('admin-product-search');
    const adminCategoryPills = document.getElementById('admin-category-pills');
    const adminProductList = document.getElementById('admin-product-list');
    const adminHeaderProductStat = document.getElementById('admin-header-product-stat');
    const adminHeaderCategoryStat = document.getElementById('admin-header-category-stat');
    const adminTotalProductsBadge = document.getElementById('admin-total-products-badge');
    const adminChangePasswordForm = document.getElementById('admin-change-password-form');
    const adminPasswordMessage = document.getElementById('admin-password-message');

    // Supabase Settings in Admin
    const adminDbStatusPill = document.getElementById('admin-db-status-pill');
    const adminSupabaseUrl = document.getElementById('admin-supabase-url');
    const adminSupabaseKey = document.getElementById('admin-supabase-key');
    const adminSupabaseSaveBtn = document.getElementById('admin-supabase-save-btn');
    const adminSupabaseSeedBtn = document.getElementById('admin-supabase-seed-btn');
    const adminSupabaseMessage = document.getElementById('admin-supabase-message');

    // Admin Tab & Logs Console Elements
    const adminTabsNav = document.getElementById('admin-tabs-nav');
    const adminTabButtons = document.querySelectorAll('.admin-tab-btn');
    const adminTabPanes = document.querySelectorAll('.admin-tab-pane');
    const valenLogsBadge = document.getElementById('valen-logs-badge');
    const valenLogsTerminalBody = document.getElementById('valen-logs-terminal-body');
    const valenLogsSearch = document.getElementById('valen-logs-search');
    const valenLogsSearchClear = document.getElementById('valen-logs-search-clear');
    const valenLogsCopyBtn = document.getElementById('valen-logs-copy-btn');
    const valenLogsDownloadBtn = document.getElementById('valen-logs-download-btn');
    const valenLogsClearBtn = document.getElementById('valen-logs-clear-btn');
    const valenLogsFilterGroup = document.getElementById('valen-logs-filter-group');
    const valenTerminalMeta = document.getElementById('valen-terminal-meta');
    const valenStatTotal = document.getElementById('valen-stat-total');
    const valenStatOk = document.getElementById('valen-stat-ok');
    const valenStatFailed = document.getElementById('valen-stat-failed');
    const valenStatLast = document.getElementById('valen-stat-last');

    let currentLogFilter = 'ALL';
    let currentLogSearchQuery = '';

    // Global State
    let allProducts = [];
    let filteredProducts = [];
    let allCategories = [];
    let selectedCategory = 'all';
    let cart = [];
    let adminPassword = '2006';
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
        'Accesorios Cabello',
        'Accesorios Maquillaje',
        'Bloomshell'
    ];

    // ==========================================
    // SUPABASE CLIENT INITIALIZATION & REALTIME
    // ==========================================
    let supabaseClient = null;
    let realtimeChannel = null;

    function getDeletedIds() {
        try {
            const raw = localStorage.getItem('valen_deleted_ids');
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    }

    function addDeletedId(id) {
        try {
            const ids = getDeletedIds();
            const numId = Number(id);
            if (!ids.includes(numId)) {
                ids.push(numId);
                localStorage.setItem('valen_deleted_ids', JSON.stringify(ids));
            }
        } catch (e) {}
    }

    function removeDeletedId(id) {
        try {
            let ids = getDeletedIds();
            const numId = Number(id);
            ids = ids.filter(i => i !== numId);
            localStorage.setItem('valen_deleted_ids', JSON.stringify(ids));
        } catch (e) {}
    }

    function setupSupabaseRealtime() {
        if (!supabaseClient || realtimeChannel) return;
        try {
            realtimeChannel = supabaseClient
                .channel('public:products')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, (payload) => {
                    console.log('⚡ Supabase Realtime cambio detectado:', payload);
                    if (payload.eventType === 'DELETE') {
                        const deletedId = Number(payload.old.id);
                        addDeletedId(deletedId);
                        allProducts = allProducts.filter(p => Number(p.id) !== deletedId);
                        adminProducts = adminProducts.filter(p => Number(p.id) !== deletedId);
                        cart = cart.filter(p => Number(p.id) !== deletedId);
                        saveLocalCache(allProducts);
                        saveCart();
                        applyFilters();
                        renderAdminProductsList();
                        updateAdminStats();
                    } else if (payload.eventType === 'INSERT') {
                        const newProd = {
                            ...payload.new,
                            category: normalizeCategoryName(payload.new.category)
                        };
                        removeDeletedId(newProd.id);
                        if (!allProducts.some(p => Number(p.id) === Number(newProd.id))) {
                            allProducts.unshift(newProd);
                            adminProducts.unshift(newProd);
                            saveLocalCache(allProducts);
                            applyFilters();
                            renderAdminProductsList();
                            updateAdminStats();
                        }
                    } else if (payload.eventType === 'UPDATE') {
                        const updated = {
                            ...payload.new,
                            category: normalizeCategoryName(payload.new.category)
                        };
                        const idx = allProducts.findIndex(p => Number(p.id) === Number(updated.id));
                        if (idx >= 0) allProducts[idx] = { ...allProducts[idx], ...updated };
                        const idxAdmin = adminProducts.findIndex(p => Number(p.id) === Number(updated.id));
                        if (idxAdmin >= 0) adminProducts[idxAdmin] = { ...adminProducts[idxAdmin], ...updated };
                        saveLocalCache(allProducts);
                        applyFilters();
                        renderAdminProductsList();
                        updateAdminStats();
                    }
                })
                .subscribe((status) => {
                    console.log('📡 Supabase Realtime Estado:', status);
                });
        } catch (e) {
            console.warn('No se pudo inicializar canal Realtime:', e);
        }
    }

    function initSupabase() {
        const savedUrl = (localStorage.getItem('valen_supabase_url') || (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.url) || '').trim();
        const savedKey = (localStorage.getItem('valen_supabase_key') || (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.key) || '').trim();

        if (adminSupabaseUrl && savedUrl) adminSupabaseUrl.value = savedUrl;
        if (adminSupabaseKey && savedKey) adminSupabaseKey.value = savedKey;

        if (savedUrl && savedKey && window.supabase && typeof window.supabase.createClient === 'function') {
            try {
                supabaseClient = window.supabase.createClient(savedUrl, savedKey);
                if (adminDbStatusPill) {
                    adminDbStatusPill.textContent = '🟢 Conectado a Supabase';
                    adminDbStatusPill.style.background = '#e6fffa';
                    adminDbStatusPill.style.color = '#047857';
                }
                setupSupabaseRealtime();
                return true;
            } catch (e) {
                console.warn('Error al iniciar Supabase:', e);
            }
        }

        if (adminDbStatusPill) {
            adminDbStatusPill.textContent = '⚪ Modo Local / Servidor';
            adminDbStatusPill.style.background = '#f0deec';
            adminDbStatusPill.style.color = 'var(--text-main)';
        }
        return false;
    }

    initSupabase();

    // ==========================================
    // HELPERS & STORAGE SYNC
    // ==========================================
    function normalizeCategoryName(name) {
        if (!name) return 'Maquillaje';
        const clean = String(name).replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1FA00}-\u{1FAFF}\u{200D}\u{FE0F}]/gu, '').replace(/\s+/g, ' ').trim();
        const lower = clean.toLowerCase();
        if (lower === '1' || lower === 'cuidado facial' || lower === 'corporal' || lower === 'cuidado corporal' || lower === 'cuidado facial y corporal') {
            return 'Cuidado Facial y Corporal';
        }
        if (lower === '2' || lower === 'maquillaje') return 'Maquillaje';
        if (lower === '3' || lower === 'cabello' || lower === 'ducha' || lower === 'cabello y ducha') return 'Cabello y Ducha';
        if (lower === 'accesorios cabello') return 'Accesorios Cabello';
        if (lower === 'accesorios maquillaje') return 'Accesorios Maquillaje';
        if (lower === '4' || lower === 'accesorios' || lower === 'herramientas') return 'Accesorios Maquillaje';
        if (lower === '5' || lower === 'bloomshell') return 'Bloomshell';
        return clean;
    }

    function formatPrice(val) {
        return `$${Number(val || 0).toLocaleString('es-CO')}`;
    }

    function saveLocalCache(prods) {
        try {
            localStorage.setItem('valen_products_live_cache', JSON.stringify(prods));
        } catch (e) {}
    }

    function getLocalCache() {
        try {
            const raw = localStorage.getItem('valen_products_live_cache');
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
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

    function showNotification(message, icon = '💖') {
        const existing = document.querySelector('.floating-notification');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = 'floating-notification';
        toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(15px)';
            setTimeout(() => toast.remove(), 300);
        }, 2800);
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
    // CATALOG VALIDATION
    // ==========================================
    function validateCatalog(products) {
        let maxId = Math.max(...products.map(p => p.id)) || 1000;
        const validatedProducts = [];
        const nameSet = new Set();
        
        products.forEach(p => {
            if (!p.name) return;
            
            // Duplicate name check
            if (nameSet.has(p.name.toLowerCase())) {
                console.warn(`[Catálogo] Posible duplicado detectado: ${p.name}`);
            } else {
                nameSet.add(p.name.toLowerCase());
            }

            // Length and Merged Product check
            if (p.name.length > 50) {
                console.warn(`[Catálogo] Nombre inusualmente largo, verificar si no está fusionado: ${p.name}`);
            }
            
            // Check for missing data (do not delete, just log)
            if (!p.price || p.price === 0) {
                console.warn(`[Catálogo] Producto sin precio (Faltante): ${p.name}`);
            }
            if (!p.image) {
                console.warn(`[Catálogo] Producto sin imagen (Faltante): ${p.name}`);
                // Use a professional placeholder (assuming one exists)
                p.image = 'img/placeholder.jpg'; 
            }
            
            validatedProducts.push(p);
        });

        console.log(`[Catálogo] Validación completada. Total productos en web: ${validatedProducts.length}`);
        
        // Return cleaned up array
        return validatedProducts;
    }

    // ==========================================
    // CATALOG LOADING (SUPABASE -> SERVER -> LOCAL)
    // ==========================================
    async function loadCatalog() {
        if (loadingTrigger) loadingTrigger.style.display = 'block';
        let loaded = false;
        const deletedIds = getDeletedIds();

        // 0. Use INLINE_PRODUCTS from catalogo.js if available, merging with local edits/additions
        if (typeof INLINE_PRODUCTS !== 'undefined' && INLINE_PRODUCTS.length > 0) {
            const baseProducts = validateCatalog(INLINE_PRODUCTS);
            const cached = getLocalCache();
            if (cached && Array.isArray(cached) && cached.length > 0) {
                const cachedMap = new Map(cached.map(p => [Number(p.id), p]));
                allProducts = baseProducts.map(p => cachedMap.get(Number(p.id)) || p);
                const baseIdSet = new Set(baseProducts.map(p => Number(p.id)));
                cached.forEach(cp => {
                    if (!baseIdSet.has(Number(cp.id))) {
                        allProducts.unshift(cp);
                    }
                });
            } else {
                allProducts = baseProducts;
            }
            saveLocalCache(allProducts);
            loaded = true;
        }

        // 1. Try Supabase Cloud DB (Single source of truth)
        if (!loaded && supabaseClient) {
            try {
                const { data, error } = await supabaseClient
                    .from('products')
                    .select('*')
                    .order('id', { ascending: false });

                if (!error && data && data.length > 0) {
                    allProducts = data;
                    saveLocalCache(data);
                    loaded = true;
                }
            } catch (err) {
                console.warn('Supabase query error:', err);
            }
        }

        // 2. Try Server API
        if (!loaded) {
            try {
                const res = await fetchApi('/api/products?active=false');
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data) && data.length > 0) {
                        allProducts = data;
                        saveLocalCache(data);
                        loaded = true;
                    }
                }
            } catch (e) {}
        }

        // 3. Try Local Cache
        if (!loaded) {
            const cached = getLocalCache();
            if (cached && Array.isArray(cached) && cached.length > 0) {
                allProducts = cached;
                loaded = true;
            }
        }

        // 4. Try extracted JSON file
        if (!loaded) {
            try {
                const res = await fetchApi('/extracted_products.json');
                if (res.ok) {
                    allProducts = await res.json();
                }
            } catch (err) {
                allProducts = [];
            }
        }

        // Filter out deleted IDs if running in local/fallback mode
        if (!supabaseClient && deletedIds.length > 0) {
            allProducts = allProducts.filter(p => !deletedIds.includes(Number(p.id)));
        }

        allProducts = (allProducts || []).map(p => ({
            ...p,
            category: normalizeCategoryName(p.category)
        }));

        saveLocalCache(allProducts);
        adminProducts = allProducts.slice();

        await loadCategories();
        applyFilters();
    }

    async function loadCategories() {
        if (supabaseClient) {
            try {
                const { data, error } = await supabaseClient.from('categories').select('*').order('id', { ascending: true });
                if (!error && data && data.length > 0) {
                    allCategories = data.map(c => c.name);
                }
            } catch (e) {}
        }

        if (allCategories.length === 0) {
            try {
                const res = await fetchApi('/api/categories');
                if (res.ok) {
                    const data = await res.json();
                    allCategories = data.map(c => c.name || c);
                }
            } catch (e) {}
        }

        const catMap = new Map();
        allCategories.forEach(c => catMap.set(normalizeCategoryName(c).toLowerCase(), normalizeCategoryName(c)));
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
            'Accesorios Cabello': '🎀',
            'Accesorios Maquillaje': '🖌️',
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

        const sortSelect = document.getElementById('sort-select');
        if (sortSelect) {
            const sortVal = sortSelect.value;
            if (sortVal === 'price-asc') {
                filteredProducts.sort((a, b) => Number(a.price) - Number(b.price));
            } else if (sortVal === 'price-desc') {
                filteredProducts.sort((a, b) => Number(b.price) - Number(a.price));
            } else if (sortVal === 'name-asc') {
                filteredProducts.sort((a, b) => String(a.name).localeCompare(String(b.name)));
            }
        }

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
                    <p>Intenta buscando con otra palabra o selecciona otra categoría.</p>
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
                </div>
                <div class="product-info">
                    <h3 class="product-title" title="${product.name}">${product.name}</h3>
                    <div class="product-price-row">
                        <div class="product-price">${formatPrice(product.price)}</div>
                    </div>
                    ${product.skin_tones_image ? `<button type="button" class="btn-view-tones" style="background: #fdf2f8; color: var(--bratz-pink); border: 1px solid var(--bratz-pink); border-radius: 8px; padding: 6px; width: 100%; margin-bottom: 8px; font-weight: 700; cursor: pointer;" onclick="window.open('${product.skin_tones_image}', '_blank')"><i class="fas fa-palette"></i> Ver Tonos Disponibles</button>` : ''}
                    ${product.skin_tones_count > 0 ? `<div style="margin-bottom: 8px;"><label style="font-size: 0.8rem; font-weight: bold; color: var(--text-dark);">Elige tu tono:</label><select class="product-tone-select" style="width: 100%; padding: 6px; border-radius: 8px; border: 1px solid #ddd; margin-top: 4px;"><option value="">Selecciona un tono...</option>${Array.from({length: product.skin_tones_count}, (_, i) => `<option value="${i+1}">Tono ${i+1}</option>`).join('')}</select></div>` : ''}
                    <button class="btn-add-cart" data-id="${product.id}">
                        <i class="fas fa-shopping-bag"></i> Agregar al Carrito
                    </button>
                </div>
            `;

            const addBtn = card.querySelector('.btn-add-cart');
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

    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
        sortSelect.addEventListener('change', () => {
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

    function addToCart(product, selectedTone) {
        const existing = cart.find(item => Number(item.id) === Number(product.id) && item.selectedTone === selectedTone);
        if (existing) {
            existing.quantity = (existing.quantity || 1) + 1;
        } else {
            cart.push({ ...product, quantity: 1, selectedTone: selectedTone });
        }
        saveCart();
        showNotification(`¡${product.name.slice(0, 22)}... agregado!`, '🛍️');
    }

    function updateCartUi() {
        const totalCount = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
        const total = cart.reduce((sum, item) => sum + (Number(item.price || 0) * (item.quantity || 1)), 0);

        if (headerCartCount) headerCartCount.textContent = totalCount;
        if (floatingCartCount) floatingCartCount.textContent = totalCount;
        if (floatingCartTotal) floatingCartTotal.textContent = formatPrice(total);

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
                cartItemsContainer.innerHTML = cart.map((item, index) => `
                    <div class="cart-item">
                        <img src="${item.image || 'Logo.jpeg'}" alt="${item.name}" onerror="this.onerror=null;this.src='Logo.jpeg';">
                        <div class="cart-item-details">
                            <h4>${item.name} ${item.selectedTone ? `(Tono ${item.selectedTone})` : ''}</h4>
                            <div class="cart-item-price">${formatPrice(item.price)}</div>
                        </div>
                        <div class="quantity-control">
                            <button type="button" class="btn-qty-minus" data-index="${index}">-</button>
                            <span>${item.quantity || 1}</span>
                            <button type="button" class="btn-qty-plus" data-index="${index}">+</button>
                        </div>
                    </div>
                `).join('');

                cartItemsContainer.querySelectorAll('.btn-qty-minus').forEach(btn => {
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
                });

                cartItemsContainer.querySelectorAll('.btn-qty-plus').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const idx = Number(btn.getAttribute('data-index'));
                        if (cart[idx]) {
                            cart[idx].quantity += 1;
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

    // Checkout WhatsApp button
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
                alert('Por favor ingresa tu Nombre y Dirección de entrega para procesar tu pedido.');
                if (!name && checkoutCustomerName) checkoutCustomerName.focus();
                else if (checkoutCustomerAddress) checkoutCustomerAddress.focus();
                return;
            }

            let total = 0;
            let msg = `✨ *NUEVO PEDIDO - VALEN MAKEUP* ✨\n\n`;
            msg += `📋 *DATOS DEL CLIENTE:*\n`;
            msg += `👤 *Nombre:* ${name}\n`;
            if (phone) msg += `📱 *Teléfono:* ${phone}\n`;
            msg += `📍 *Dirección:* ${address}\n\n`;
            msg += `🛍️ *PRODUCTOS SELECCIONADOS:*\n`;

            cart.forEach((item, idx) => {
                const sub = (Number(item.price || 0)) * (item.quantity || 1);
                total += sub;
                msg += `*${idx + 1}.* ${item.name} ${item.selectedTone ? `(Tono ${item.selectedTone})` : ''}\n`;
                msg += `   └ Cantidad: ${item.quantity} x ${formatPrice(item.price)} = ${formatPrice(sub)}\n`;
            });

            msg += `\n---------------------------------\n`;
            msg += `💰 *TOTAL ESTIMADO:* ${formatPrice(total)}\n`;
            msg += `---------------------------------\n\n`;
            msg += `🚚 *Por favor indícame disponibilidad y valor de envío.* ✨`;

            const encoded = encodeURIComponent(msg);
            const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encoded}`;
            window.open(waUrl, '_blank');

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
    // ADMIN ACCESS (3 TAPS ON LOGO)
    // ==========================================
    let logoTaps = 0;
    let logoTapTimer = null;

    function handleLogoTap() {
        logoTaps += 1;
        clearTimeout(logoTapTimer);
        logoTapTimer = setTimeout(() => { logoTaps = 0; }, 3500);

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

    window.openAdminPinModal = openAdminPinModal;
    if (window.location.search.includes('admin=true') || window.location.hash === '#admin') {
        setTimeout(openAdminPinModal, 300);
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

    // PIN inputs
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

    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (adminLoginMessage) adminLoginMessage.textContent = '';
            const enteredPin = adminPinInputs.map(i => (i ? i.value : '')).join('').trim();

            if (enteredPin.length < 4) {
                if (adminLoginMessage) adminLoginMessage.textContent = 'Ingresa los 4 dígitos del PIN.';
                return;
            }

            let authOk = false;
            try {
                const res = await fetchApi('/api/admin/authenticate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: enteredPin })
                });
                if (res.ok) authOk = true;
            } catch (err) {}

            if (!authOk && (enteredPin === adminPassword || enteredPin === '2006')) {
                authOk = true;
            }

            if (!authOk) {
                if (adminLoginMessage) adminLoginMessage.textContent = 'PIN incorrecto. Intenta de nuevo.';
                logValenEvent('WARN', 'AUTH_LOGIN', 'Intento de acceso denegado: PIN incorrecto', {
                    enteredLength: enteredPin.length,
                    timestamp: new Date().toISOString()
                }, 'FAILED');
                return;
            }

            adminPassword = enteredPin;
            if (adminPasswordModal) adminPasswordModal.classList.remove('active');
            if (adminPanel) adminPanel.classList.add('active');
            logValenEvent('INFO', 'AUTH_LOGIN', 'Acceso autorizado al Panel de Administración', {
                authMode: (enteredPin === '2006' || enteredPin === adminPassword) ? 'PIN_VERIFIED' : 'API_VERIFIED',
                timestamp: new Date().toISOString()
            }, 'OK');
            await loadAdminData();
        });
    }

    async function loadAdminData() {
        if (supabaseClient) {
            try {
                const { data } = await supabaseClient.from('products').select('*').order('id', { ascending: false });
                if (data) adminProducts = data;
            } catch (e) {}
        }

        if (adminProducts.length === 0) {
            try {
                const prodsRes = await fetchApi('/api/products?active=false');
                if (prodsRes.ok) adminProducts = await prodsRes.json();
                else adminProducts = allProducts.slice();
            } catch (e) {
                adminProducts = allProducts.slice();
            }
        }

        adminCategories = allCategories.map((name, id) => ({ id: id + 1, name }));

        populateAdminCategorySelect();
        renderAdminCategoryChips();
        renderAdminCategoryPills();
        renderAdminProductsList();
        updateAdminStats();
        updateLogsBadge();
    }

    function updateAdminStats() {
        if (adminHeaderProductStat) adminHeaderProductStat.textContent = `${adminProducts.length} Productos`;
        if (adminHeaderCategoryStat) adminHeaderCategoryStat.textContent = `${adminCategories.length} Categorías`;
        if (adminTotalProductsBadge) adminTotalProductsBadge.textContent = `${adminProducts.length} productos`;
        updateLogsBadge();
    }

    // ==========================================
    // DEVELOPER AUDIT LOG SYSTEM (VALEN SYSTEM LOGS V1)
    // ==========================================
    const VALEN_LOGS_STORAGE_KEY = 'valen_system_logs_v1';
    const VALEN_MAX_LOGS = 300;

    function getValenLogs() {
        try {
            const raw = localStorage.getItem(VALEN_LOGS_STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            console.error('Error al leer logs locales:', e);
            return [];
        }
    }

    function saveValenLogs(logs) {
        try {
            localStorage.setItem(VALEN_LOGS_STORAGE_KEY, JSON.stringify(logs.slice(0, VALEN_MAX_LOGS)));
        } catch (e) {
            console.warn('Error al guardar logs en localStorage:', e);
        }
    }

    function logValenEvent(level, action, message, details = {}, status = 'OK') {
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const timeFormatted = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())} ${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
        
        const entry = {
            id: 'valen_log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            timestamp: now.toISOString(),
            timeFormatted,
            level: String(level || 'INFO').toUpperCase(),
            action: String(action || 'GENERAL').toUpperCase(),
            status: String(status || 'OK').toUpperCase(), // 'OK' | 'FAILED'
            message: String(message || ''),
            details: details && typeof details === 'object' ? details : { raw: details }
        };

        const logs = getValenLogs();
        logs.unshift(entry);
        saveValenLogs(logs);

        updateLogsBadge(logs);

        const logsPane = document.getElementById('admin-tab-logs');
        if (logsPane && logsPane.classList.contains('active')) {
            renderValenLogs();
        }

        return entry;
    }

    function updateLogsBadge(logs = null) {
        const allLogs = logs || getValenLogs();
        if (valenLogsBadge) {
            valenLogsBadge.textContent = allLogs.length;
        }
        if (valenTerminalMeta) {
            valenTerminalMeta.textContent = `${allLogs.length} evento${allLogs.length === 1 ? '' : 's'}`;
        }
    }

    function renderValenLogs() {
        if (!valenLogsTerminalBody) return;

        const allLogs = getValenLogs();
        const totalCount = allLogs.length;

        // Count per filter category
        const okCount = allLogs.filter(l => l.status === 'OK').length;
        const failedCount = allLogs.filter(l => l.status === 'FAILED').length;
        const editCount = allLogs.filter(l => l.action === 'PRODUCT_UPDATE').length;
        const deleteCount = allLogs.filter(l => l.action === 'PRODUCT_DELETE').length;
        const createCount = allLogs.filter(l => l.action === 'PRODUCT_CREATE').length;
        const toggleCount = allLogs.filter(l => l.action === 'PRODUCT_TOGGLE').length;
        const cloudCount = allLogs.filter(l => l.action.startsWith('SUPABASE')).length;
        const authCount = allLogs.filter(l => l.action.startsWith('AUTH')).length;

        // Update Pill Counts
        const setPillCount = (id, count) => {
            const el = document.getElementById(id);
            if (el) el.textContent = count;
        };
        setPillCount('log-count-all', totalCount);
        setPillCount('log-count-ok', okCount);
        setPillCount('log-count-failed', failedCount);
        setPillCount('log-count-edit', editCount);
        setPillCount('log-count-delete', deleteCount);
        setPillCount('log-count-create', createCount);
        setPillCount('log-count-toggle', toggleCount);
        setPillCount('log-count-cloud', cloudCount);
        setPillCount('log-count-auth', authCount);

        // Update Stats
        if (valenStatTotal) valenStatTotal.textContent = totalCount;
        if (valenStatOk) valenStatOk.textContent = okCount;
        if (valenStatFailed) valenStatFailed.textContent = failedCount;
        if (valenStatLast) {
            valenStatLast.textContent = allLogs.length > 0 ? `${allLogs[0].action} (${allLogs[0].timeFormatted})` : 'Ninguno';
        }
        if (valenTerminalMeta) {
            valenTerminalMeta.textContent = `${totalCount} evento${totalCount === 1 ? '' : 's'}`;
        }
        if (valenLogsBadge) {
            valenLogsBadge.textContent = totalCount;
        }

        // Apply filter
        let filtered = allLogs;
        if (currentLogFilter === 'OK') {
            filtered = filtered.filter(l => l.status === 'OK');
        } else if (currentLogFilter === 'FAILED') {
            filtered = filtered.filter(l => l.status === 'FAILED');
        } else if (currentLogFilter === 'PRODUCT_UPDATE') {
            filtered = filtered.filter(l => l.action === 'PRODUCT_UPDATE');
        } else if (currentLogFilter === 'PRODUCT_DELETE') {
            filtered = filtered.filter(l => l.action === 'PRODUCT_DELETE');
        } else if (currentLogFilter === 'PRODUCT_CREATE') {
            filtered = filtered.filter(l => l.action === 'PRODUCT_CREATE');
        } else if (currentLogFilter === 'PRODUCT_TOGGLE') {
            filtered = filtered.filter(l => l.action === 'PRODUCT_TOGGLE');
        } else if (currentLogFilter === 'SUPABASE') {
            filtered = filtered.filter(l => l.action.startsWith('SUPABASE'));
        } else if (currentLogFilter === 'AUTH') {
            filtered = filtered.filter(l => l.action.startsWith('AUTH'));
        }

        // Apply search
        if (currentLogSearchQuery) {
            filtered = filtered.filter(l => {
                const haystack = `${l.message} ${l.action} ${l.status} ${l.timeFormatted} ${JSON.stringify(l.details || {})}`.toLowerCase();
                return haystack.includes(currentLogSearchQuery);
            });
        }

        if (filtered.length === 0) {
            valenLogsTerminalBody.innerHTML = `
                <div class="valen-terminal-empty">
                    <i class="fas fa-terminal"></i>
                    <span>valen@system:~$ Sin registros coincidentes para el filtro actual.</span>
                    <small style="color: #475569;">Las operaciones de productos, categorías, supabase y autenticación aparecerán aquí en vivo.</small>
                </div>
            `;
            return;
        }

        valenLogsTerminalBody.innerHTML = '';
        const escapeHtml = (str) => {
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');
        };

        filtered.forEach(log => {
            const statusClass = log.status === 'FAILED' ? 'status-failed' : (log.status === 'OK' ? 'status-ok' : (log.level === 'WARN' ? 'status-warn' : 'status-info'));
            const statusLabel = log.status === 'FAILED' ? '[FAILED]' : (log.status === 'OK' ? '[OK]' : `[${log.level}]`);

            const row = document.createElement('div');
            row.className = `valen-log-row log-${log.status.toLowerCase()}`;
            row.dataset.logId = log.id;

            const jsonStr = JSON.stringify(log.details || {}, null, 2);

            row.innerHTML = `
                <div class="valen-log-summary-line">
                    <span class="valen-log-time">${escapeHtml(log.timeFormatted)}</span>
                    <span class="valen-badge-status ${statusClass}">${escapeHtml(statusLabel)}</span>
                    <span class="valen-badge-action">${escapeHtml(log.action)}</span>
                    <span class="valen-log-message">${escapeHtml(log.message)}</span>
                    <button type="button" class="valen-log-toggle-json" title="Ver detalles JSON">
                        <i class="fas fa-chevron-down"></i> Detalles
                    </button>
                </div>
                <div class="valen-log-details-drawer hidden">
                    <div class="valen-log-diff-header">
                        <span><i class="fas fa-code"></i> Payload / Datos de la Operación (${escapeHtml(log.action)})</span>
                        <button type="button" class="btn-copy-entry-json" data-id="${log.id}"><i class="fas fa-copy"></i> Copiar Entrada</button>
                    </div>
                    <pre class="valen-log-json-code"><code>${escapeHtml(jsonStr)}</code></pre>
                </div>
            `;

            // Toggle drawer on click of summary or button
            const summaryLine = row.querySelector('.valen-log-summary-line');
            const drawer = row.querySelector('.valen-log-details-drawer');
            const toggleBtn = row.querySelector('.valen-log-toggle-json');
            
            summaryLine.addEventListener('click', (e) => {
                if (e.target.closest('.btn-copy-entry-json')) return;
                const isHidden = drawer.classList.contains('hidden');
                drawer.classList.toggle('hidden');
                toggleBtn.innerHTML = isHidden ? '<i class="fas fa-chevron-up"></i> Ocultar' : '<i class="fas fa-chevron-down"></i> Detalles';
            });

            // Individual copy button
            const copyEntryBtn = row.querySelector('.btn-copy-entry-json');
            if (copyEntryBtn) {
                copyEntryBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const text = JSON.stringify(log, null, 2);
                    try {
                        await navigator.clipboard.writeText(text);
                        showNotification('Log copiado al portapapeles', '📋');
                    } catch (err) {
                        const ta = document.createElement('textarea');
                        ta.value = text;
                        document.body.appendChild(ta);
                        ta.select();
                        document.execCommand('copy');
                        document.body.removeChild(ta);
                        showNotification('Log copiado al portapapeles', '📋');
                    }
                });
            }

            valenLogsTerminalBody.appendChild(row);
        });
    }

    function initAdminTabs() {
        if (!adminTabsNav) return;
        adminTabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.dataset.tab;
                adminTabButtons.forEach(b => b.classList.remove('active'));
                adminTabPanes.forEach(p => p.classList.remove('active'));

                btn.classList.add('active');
                const targetPane = document.getElementById(`admin-tab-${target}`);
                if (targetPane) targetPane.classList.add('active');

                if (target === 'logs') {
                    renderValenLogs();
                }
            });
        });
    }

    function initValenLogsConsole() {
        if (valenLogsCopyBtn) {
            valenLogsCopyBtn.addEventListener('click', async () => {
                const logs = getValenLogs();
                const text = JSON.stringify(logs, null, 2);
                try {
                    await navigator.clipboard.writeText(text);
                    showNotification('Logs copiados al portapapeles en formato JSON', '📋');
                } catch (err) {
                    const ta = document.createElement('textarea');
                    ta.value = text;
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand('copy');
                    document.body.removeChild(ta);
                    showNotification('Logs copiados al portapapeles en formato JSON', '📋');
                }
            });
        }

        if (valenLogsDownloadBtn) {
            valenLogsDownloadBtn.addEventListener('click', () => {
                const logs = getValenLogs();
                const now = new Date();
                const dateStr = now.toISOString().replace(/[:.]/g, '-');
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
                const downloadAnchor = document.createElement('a');
                downloadAnchor.setAttribute("href", dataStr);
                downloadAnchor.setAttribute("download", `valen_makeup_audit_logs_${dateStr}.json`);
                document.body.appendChild(downloadAnchor);
                downloadAnchor.click();
                downloadAnchor.remove();
                showNotification('Archivo de logs descargado', '💾');
            });
        }

        if (valenLogsClearBtn) {
            valenLogsClearBtn.addEventListener('click', () => {
                if (!confirm('¿Deseas limpiar todo el historial de logs de auditoría?')) return;
                localStorage.removeItem(VALEN_LOGS_STORAGE_KEY);
                logValenEvent('WARN', 'AUDIT_CLEAR', 'Historial de auditoría reiniciado por el administrador.', {}, 'OK');
                renderValenLogs();
                showNotification('Historial de logs reiniciado', '🗑️');
            });
        }

        if (valenLogsFilterGroup) {
            valenLogsFilterGroup.addEventListener('click', (e) => {
                const pill = e.target.closest('.valen-filter-pill');
                if (!pill) return;
                valenLogsFilterGroup.querySelectorAll('.valen-filter-pill').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                currentLogFilter = pill.dataset.filter || 'ALL';
                renderValenLogs();
            });
        }

        if (valenLogsSearch) {
            valenLogsSearch.addEventListener('input', (e) => {
                currentLogSearchQuery = e.target.value.trim().toLowerCase();
                if (valenLogsSearchClear) {
                    if (currentLogSearchQuery) {
                        valenLogsSearchClear.classList.remove('hidden');
                    } else {
                        valenLogsSearchClear.classList.add('hidden');
                    }
                }
                renderValenLogs();
            });
        }

        if (valenLogsSearchClear) {
            valenLogsSearchClear.addEventListener('click', () => {
                if (valenLogsSearch) valenLogsSearch.value = '';
                currentLogSearchQuery = '';
                valenLogsSearchClear.classList.add('hidden');
                renderValenLogs();
            });
        }

        // Seed initial log if empty
        if (getValenLogs().length === 0) {
            logValenEvent('INFO', 'SYSTEM_BOOT', 'Consola de auditoría de Valen Makeup inicializada correctamente.', {
                version: '2.0.0',
                engine: 'Valen Makeup Core DB',
                timestamp: new Date().toISOString()
            }, 'OK');
        }

        updateLogsBadge();
    }

    function populateAdminCategorySelect() {
        if (!adminCategorySelect) return;
        adminCategorySelect.innerHTML = '<option value="">Selecciona una categoría existente</option>';
        adminCategories.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat.name;
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
        allPill.className = `category-pill ${adminSelectedCat === 'all' ? 'active' : ''}`;
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
            pill.className = `category-pill ${adminSelectedCat.toLowerCase() === cat.name.toLowerCase() ? 'active' : ''}`;
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
            adminProductList.innerHTML = `<p style="padding: 20px; color: #a99bb5; text-align: center; grid-column: 1/-1;">No hay productos en esta vista.</p>`;
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
                        <small style="color: var(--text-muted); font-size: 0.72rem;">${p.category || 'Maquillaje'} ${p.active === false ? '• (Oculto)' : ''}</small>
                    </div>
                </div>
                <div class="admin-prod-actions">
                    <button type="button" class="admin-action-btn admin-action-edit" data-id="${p.id}"><i class="fas fa-pen"></i> Editar</button>
                    <button type="button" class="admin-action-btn admin-action-toggle ${p.active === false ? 'to-inactive' : ''}" data-id="${p.id}">
                        <i class="fas ${p.active === false ? 'fa-eye' : 'fa-eye-slash'}"></i> ${p.active === false ? 'Mostrar' : 'Ocultar'}
                    </button>
                    <button type="button" class="admin-action-btn admin-action-delete" data-id="${p.id}"><i class="fas fa-trash"></i></button>
                </div>
            `;

            card.querySelector('.admin-action-edit').addEventListener('click', () => openEditProduct(p.id));
            card.querySelector('.admin-action-toggle').addEventListener('click', () => toggleProductState(p.id, p.active !== false));
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

    // Toggle Product Form
    if (adminProductToggle && adminProductPanel) {
        adminProductToggle.addEventListener('click', () => {
            adminProductPanel.classList.toggle('hidden');
        });
    }

    if (adminProductCancel && adminProductPanel && adminProductForm) {
        adminProductCancel.addEventListener('click', () => {
            adminProductForm.reset();
            delete adminProductForm.dataset.editingId;
            if (adminFormHeading) adminFormHeading.innerHTML = '<i class="fas fa-plus-circle" style="color: var(--bratz-pink);"></i> Agregar Producto';
            if (adminProductSubmitBtn) adminProductSubmitBtn.innerHTML = '<i class="fas fa-save"></i> Guardar en Base de Datos';
            if (adminImagePreviewWrap) adminImagePreviewWrap.classList.add('hidden');
            if (adminSkinTonesPreviewWrap) adminSkinTonesPreviewWrap.classList.add('hidden');
            adminProductPanel.classList.add('hidden');
        });
    }

    function compressImageFile(file, maxWidth = 800) {
        return new Promise((resolve) => {
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
            reader.onerror = () => resolve('img/product_1.jpg');
        });
    }

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

    if (adminProductSkinTonesInput) {
        adminProductSkinTonesInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                const compressed = await compressImageFile(file);
                if (adminSkinTonesPreviewImg) adminSkinTonesPreviewImg.src = compressed;
                if (adminSkinTonesPreviewWrap) adminSkinTonesPreviewWrap.classList.remove('hidden');
            }
        });
    }

    // Submit Add / Edit Product
    if (adminProductForm) {
        adminProductForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (adminProductMessage) adminProductMessage.textContent = 'Guardando producto en base de datos...';

            const name = document.getElementById('admin-product-name').value.trim();
            const rawPrice = document.getElementById('admin-product-price').value;
            const price = Number(String(rawPrice).replace(/[^0-9]/g, '')) || 0;
            const catSelect = document.getElementById('admin-product-category').value;
            const catNew = document.getElementById('admin-product-category-new').value.trim();
            const active = document.getElementById('admin-product-active').checked;
            const skin_tones_count_raw = document.getElementById('admin-product-skin-tones-count') ? document.getElementById('admin-product-skin-tones-count').value : '';
            const skin_tones_count = skin_tones_count_raw ? Number(skin_tones_count_raw) : 0;
            const editingId = adminProductForm.dataset.editingId ? Number(adminProductForm.dataset.editingId) : null;

            let image = adminProductForm.dataset.existingImage || 'img/product_1.jpg';
            if (adminProductImageInput && adminProductImageInput.files[0]) {
                image = await compressImageFile(adminProductImageInput.files[0]);
            }

            let skin_tones_image = adminProductForm.dataset.existingSkinTones || '';
            if (adminProductSkinTonesInput && adminProductSkinTonesInput.files[0]) {
                skin_tones_image = await compressImageFile(adminProductSkinTonesInput.files[0]);
            }

            const category = normalizeCategoryName(catNew || catSelect || 'Maquillaje');

            if (!name) {
                if (adminProductMessage) adminProductMessage.textContent = 'Ingresa el nombre del producto.';
                logValenEvent('WARN', 'PRODUCT_VALIDATION', 'Intento de guardar producto sin nombre', {}, 'FAILED');
                return;
            }

            const payload = {
                name,
                price,
                image,
                skin_tones_image,
                skin_tones_count,
                category,
                active,
                page: 1
            };
            if (editingId) {
                payload.id = editingId;
            }

            // Snapshot old product before mutation for diff audit
            const oldProd = editingId ? (allProducts.find(p => Number(p.id) === editingId) || adminProducts.find(p => Number(p.id) === editingId)) : null;

            try {
                // 1. Update in Supabase if active
                if (supabaseClient) {
                    try {
                        if (editingId) {
                            await supabaseClient.from('products').update(payload).eq('id', editingId);
                        } else {
                            const { data } = await supabaseClient.from('products').insert([payload]).select();
                            if (data && data[0] && data[0].id) {
                                payload.id = data[0].id;
                            }
                        }
                    } catch (err) {
                        console.warn('Supabase insert/update error:', err);
                        logValenEvent('WARN', 'SUPABASE_SYNC', `Aviso al sincronizar producto en Supabase: ${err.message}`, { error: err.message, payload }, 'FAILED');
                    }
                }

                // 2. Update memory arrays
                if (editingId) {
                    const idxAll = allProducts.findIndex(p => Number(p.id) === editingId);
                    if (idxAll >= 0) allProducts[idxAll] = { ...allProducts[idxAll], ...payload };
                    const idxAdmin = adminProducts.findIndex(p => Number(p.id) === editingId);
                    if (idxAdmin >= 0) adminProducts[idxAdmin] = { ...adminProducts[idxAdmin], ...payload };
                    removeDeletedId(editingId);
                } else {
                    if (!payload.id) {
                        const maxId = allProducts.reduce((max, p) => Math.max(max, Number(p.id) || 0), 0);
                        payload.id = maxId + 1;
                    }
                    removeDeletedId(payload.id);
                    allProducts.unshift(payload);
                    adminProducts.unshift(payload);
                }

                saveLocalCache(allProducts);
                renderProductsGrid();
                renderAdminProductsList();
                renderAdminCategoryPills();
                renderAdminCategoryChips();
                updateAdminStats();

                // 3. Log event with full diff or creation details
                if (editingId) {
                    const diff = {};
                    if (oldProd) {
                        if (oldProd.name !== payload.name) diff.name = { before: oldProd.name, after: payload.name };
                        if (Number(oldProd.price) !== Number(payload.price)) diff.price = { before: Number(oldProd.price), after: Number(payload.price) };
                        if (oldProd.category !== payload.category) diff.category = { before: oldProd.category, after: payload.category };
                        if (Boolean(oldProd.active !== false) !== Boolean(payload.active)) diff.active = { before: Boolean(oldProd.active !== false), after: Boolean(payload.active) };
                        if (Number(oldProd.skin_tones_count || 0) !== Number(payload.skin_tones_count || 0)) diff.skin_tones_count = { before: oldProd.skin_tones_count || 0, after: payload.skin_tones_count || 0 };
                        if (oldProd.image !== payload.image) diff.image = { before: oldProd.image ? (oldProd.image.startsWith('data:') ? '[Base64 previo]' : oldProd.image) : '', after: payload.image.startsWith('data:') ? '[Base64 nuevo]' : payload.image };
                        if (oldProd.skin_tones_image !== payload.skin_tones_image) diff.skin_tones_image = { changed: true };
                    }
                    const changedFields = Object.keys(diff);
                    logValenEvent('OK', 'PRODUCT_UPDATE', `Editado producto #${editingId} "${payload.name}" [${changedFields.length > 0 ? changedFields.join(', ') : 'sin cambios'}]`, {
                        productId: editingId,
                        productName: payload.name,
                        changedFields,
                        diff,
                        beforeSnapshot: oldProd ? { id: oldProd.id, name: oldProd.name, price: oldProd.price, category: oldProd.category, active: oldProd.active !== false } : null,
                        afterSnapshot: { id: payload.id, name: payload.name, price: payload.price, category: payload.category, active: payload.active }
                    }, 'OK');
                } else {
                    logValenEvent('OK', 'PRODUCT_CREATE', `Creado producto nuevo #${payload.id} "${payload.name}" (${formatPrice(payload.price)})`, {
                        productId: payload.id,
                        name: payload.name,
                        price: payload.price,
                        category: payload.category,
                        active: payload.active,
                        skinTonesCount: payload.skin_tones_count || 0,
                        hasCustomImage: Boolean(payload.image && payload.image !== 'img/product_1.jpg')
                    }, 'OK');
                }

                showNotification(editingId ? 'Producto actualizado en la base de datos' : '¡Producto guardado en la base de datos!', '✅');

                adminProductForm.reset();
                delete adminProductForm.dataset.editingId;
                delete adminProductForm.dataset.existingImage;
                delete adminProductForm.dataset.existingSkinTones;
                if (document.getElementById('admin-product-skin-tones-count')) document.getElementById('admin-product-skin-tones-count').value = '';
                if (adminProductMessage) adminProductMessage.textContent = '';
                if (adminImagePreviewWrap) adminImagePreviewWrap.classList.add('hidden');
                if (adminSkinTonesPreviewWrap) adminSkinTonesPreviewWrap.classList.add('hidden');
                if (adminProductPanel) adminProductPanel.classList.add('hidden');

                // 4. Update server API in background
                try {
                    const endpoint = editingId ? `/api/products/${editingId}` : '/api/products';
                    const method = editingId ? 'PATCH' : 'POST';
                    await fetchApi(endpoint, {
                        method,
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Admin-Password': adminPassword
                        },
                        body: JSON.stringify(payload)
                    });
                } catch (err) {}
            } catch (err) {
                console.error('Error al guardar producto:', err);
                if (adminProductMessage) adminProductMessage.textContent = `Error: ${err.message}`;
                logValenEvent('FAILED', editingId ? 'PRODUCT_UPDATE' : 'PRODUCT_CREATE', `Error al ${editingId ? 'editar' : 'crear'} producto "${name}": ${err.message}`, {
                    error: err.message,
                    payload
                }, 'FAILED');
            }
        });
    }

    function openEditProduct(id) {
        const prod = adminProducts.find(p => Number(p.id) === Number(id));
        if (!prod) return;

        // Ensure Catalog tab is selected
        const catTabBtn = document.querySelector('.admin-tab-btn[data-tab="catalog"]');
        if (catTabBtn && !catTabBtn.classList.contains('active')) {
            catTabBtn.click();
        }

        document.getElementById('admin-product-name').value = prod.name;
        document.getElementById('admin-product-price').value = prod.price;
        document.getElementById('admin-product-category').value = prod.category || '';
        document.getElementById('admin-product-category-new').value = '';
        document.getElementById('admin-product-active').checked = prod.active !== false;
        if (document.getElementById('admin-product-skin-tones-count')) document.getElementById('admin-product-skin-tones-count').value = prod.skin_tones_count || '';

        adminProductForm.dataset.editingId = prod.id;
        adminProductForm.dataset.existingImage = prod.image;
        adminProductForm.dataset.existingSkinTones = prod.skin_tones_image || '';

        if (adminImagePreviewImg && prod.image) {
            adminImagePreviewImg.src = prod.image;
            if (adminImagePreviewWrap) adminImagePreviewWrap.classList.remove('hidden');
        }

        if (adminSkinTonesPreviewImg && prod.skin_tones_image) {
            adminSkinTonesPreviewImg.src = prod.skin_tones_image;
            if (adminSkinTonesPreviewWrap) adminSkinTonesPreviewWrap.classList.remove('hidden');
        }

        if (adminFormHeading) adminFormHeading.innerHTML = `<i class="fas fa-edit" style="color: var(--bratz-pink);"></i> Editando: ${prod.name}`;
        if (adminProductSubmitBtn) adminProductSubmitBtn.innerHTML = '<i class="fas fa-save"></i> Actualizar en Base de Datos';
        if (adminProductPanel) adminProductPanel.classList.remove('hidden');

        const formCard = document.getElementById('admin-product-card-form');
        if (formCard) formCard.scrollIntoView({ behavior: 'smooth' });
    }

    function toggleProductState(id, currentActive) {
        const newActive = !currentActive;
        const numId = Number(id);

        const p1 = allProducts.find(p => Number(p.id) === numId);
        if (p1) p1.active = newActive;
        const p2 = adminProducts.find(p => Number(p.id) === numId);
        if (p2) p2.active = newActive;

        saveLocalCache(allProducts);
        renderAdminProductsList();
        renderAdminCategoryPills();
        renderAdminCategoryChips();
        updateAdminStats();
        applyFilters();

        const prodName = p1 ? p1.name : (p2 ? p2.name : `Producto #${numId}`);
        logValenEvent('OK', 'PRODUCT_TOGGLE', `Visibilidad modificada: #${numId} "${prodName}" pasa a ${newActive ? 'ACTIVO (visible)' : 'OCULTO (inactivo)'}`, {
            productId: numId,
            productName: prodName,
            newState: newActive ? 'ACTIVO' : 'OCULTO',
            previousState: currentActive ? 'ACTIVO' : 'OCULTO'
        }, 'OK');

        showNotification(newActive ? 'Producto activado' : 'Producto ocultado');

        if (supabaseClient) {
            supabaseClient.from('products').update({ active: newActive }).eq('id', numId).catch(e => {
                console.warn('Supabase toggle error:', e);
                logValenEvent('WARN', 'SUPABASE_SYNC', `Error al cambiar visibilidad en Supabase para #${numId}: ${e.message}`, { error: e.message }, 'FAILED');
            });
        }

        fetchApi(`/api/products/${numId}/state`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'X-Admin-Password': adminPassword
            },
            body: JSON.stringify({ active: newActive })
        }).catch(() => {});
    }

    function deleteProduct(id) {
        const numId = Number(id);
        const prod = adminProducts.find(p => Number(p.id) === numId) || allProducts.find(p => Number(p.id) === numId);
        const prodName = prod ? prod.name : 'Producto';

        // 1. Eliminar inmediatamente del estado en memoria y blacklist
        addDeletedId(numId);
        allProducts = allProducts.filter(p => Number(p.id) !== numId);
        adminProducts = adminProducts.filter(p => Number(p.id) !== numId);
        cart = cart.filter(p => Number(p.id) !== numId);

        // 2. Actualizar inmediatamente toda la interfaz visual (0ms de espera)
        saveLocalCache(allProducts);
        saveCart();
        renderAdminProductsList();
        renderAdminCategoryPills();
        renderAdminCategoryChips();
        updateAdminStats();
        applyFilters();

        logValenEvent('WARN', 'PRODUCT_DELETE', `Eliminado producto #${numId} "${prodName}" del catálogo`, {
            deletedId: numId,
            product: prod ? {
                id: prod.id,
                name: prod.name,
                price: prod.price,
                category: prod.category,
                active: prod.active !== false
            } : { id: numId, name: prodName }
        }, 'OK');

        showNotification(`"${prodName}" eliminado correctamente`, '🗑️');

        // 3. Sincronizar en la nube en segundo plano (Supabase & Server API)
        if (supabaseClient) {
            supabaseClient.from('products').delete().eq('id', numId).then(({ error }) => {
                if (error) {
                    console.warn('Supabase delete error:', error);
                    logValenEvent('FAILED', 'SUPABASE_SYNC', `Error al eliminar producto #${numId} en Supabase: ${error.message}`, { error }, 'FAILED');
                }
            }).catch(e => {
                console.warn('Supabase delete error:', e);
                logValenEvent('FAILED', 'SUPABASE_SYNC', `Error al eliminar producto #${numId} en Supabase: ${e.message}`, { error: e.message }, 'FAILED');
            });
        }

        fetchApi(`/api/products/${numId}`, {
            method: 'DELETE',
            headers: { 'X-Admin-Password': adminPassword }
        }).catch(() => {});
    }

    // ==========================================
    // SUPABASE ADMIN UI CONTROLS & SEEDER
    // ==========================================
    if (adminSupabaseSaveBtn) {
        adminSupabaseSaveBtn.addEventListener('click', async () => {
            const url = (adminSupabaseUrl ? adminSupabaseUrl.value : '').trim();
            const key = (adminSupabaseKey ? adminSupabaseKey.value : '').trim();

            if (!url || !key) {
                if (adminSupabaseMessage) {
                    adminSupabaseMessage.textContent = 'Ingresa la URL y el Anon Key de Supabase.';
                    adminSupabaseMessage.style.color = 'var(--bratz-deep-pink)';
                }
                logValenEvent('WARN', 'SUPABASE_CONNECT', 'Intento de conexión a Supabase con campos vacíos', {}, 'FAILED');
                return;
            }

            if (adminSupabaseMessage) {
                adminSupabaseMessage.textContent = 'Verificando conexión con Supabase...';
                adminSupabaseMessage.style.color = 'var(--text-main)';
            }

            try {
                const testClient = window.supabase.createClient(url, key);
                const { error } = await testClient.from('products').select('id').limit(1);

                if (error && error.code !== 'PGRST116') {
                    throw error;
                }

                localStorage.setItem('valen_supabase_url', url);
                localStorage.setItem('valen_supabase_key', key);
                supabaseClient = testClient;

                if (adminDbStatusPill) {
                    adminDbStatusPill.textContent = '🟢 Conectado a Supabase';
                    adminDbStatusPill.style.background = '#e6fffa';
                    adminDbStatusPill.style.color = '#047857';
                }

                if (adminSupabaseMessage) {
                    adminSupabaseMessage.textContent = '✅ ¡Conectado exitosamente a Supabase! Sincronización en la nube activa.';
                    adminSupabaseMessage.style.color = '#047857';
                }

                setupSupabaseRealtime();
                logValenEvent('OK', 'SUPABASE_CONNECT', `Conexión establecida con Supabase Cloud DB: ${url}`, {
                    url,
                    keyLength: key.length
                }, 'OK');
                showNotification('Base de datos Supabase conectada', '🚀');
                await loadCatalog();
            } catch (err) {
                if (adminSupabaseMessage) {
                    adminSupabaseMessage.textContent = `Error de conexión: ${err.message || 'Verifica que la tabla products exista en Supabase ejecutando el script supabase_schema.sql'}`;
                    adminSupabaseMessage.style.color = 'var(--bratz-deep-pink)';
                }
                logValenEvent('FAILED', 'SUPABASE_CONNECT', `Fallo al conectar con Supabase: ${err.message}`, {
                    url,
                    error: err.message
                }, 'FAILED');
            }
        });
    }

    // 1-Click Initial Migration to Supabase
    if (adminSupabaseSeedBtn) {
        adminSupabaseSeedBtn.addEventListener('click', async () => {
            if (!supabaseClient) {
                alert('Primero conecta tu proyecto de Supabase ingresando la URL y el Anon Key y haciendo clic en "Guardar y Conectar".');
                return;
            }

            if (!confirm('¿Deseas sincronizar los 272 productos del catálogo a tu base de datos Supabase?')) {
                return;
            }

            if (adminSupabaseMessage) {
                adminSupabaseMessage.textContent = 'Cargando catálogo para subir a Supabase...';
                adminSupabaseMessage.style.color = 'var(--text-main)';
            }

            try {
                let prodsToUpload = allProducts;
                if (prodsToUpload.length === 0) {
                    const res = await fetchApi('/extracted_products.json');
                    prodsToUpload = await res.json();
                }

                const CHUNK_SIZE = 40;
                let inserted = 0;

                for (let i = 0; i < prodsToUpload.length; i += CHUNK_SIZE) {
                    const chunk = prodsToUpload.slice(i, i + CHUNK_SIZE).map(p => ({
                        id: Number(p.id),
                        name: String(p.name || '').trim(),
                        price: Number(p.price || 0),
                        image: String(p.image || 'img/product_1.jpg').trim(),
                        page: Number(p.page || 1),
                        active: p.active !== false,
                        category: normalizeCategoryName(p.category || 'Maquillaje'),
                        category_id: p.category_id ? Number(p.category_id) : 2
                    }));

                    const { error } = await supabaseClient.from('products').upsert(chunk, { onConflict: 'id' });
                    if (error) throw error;

                    inserted += chunk.length;
                    if (adminSupabaseMessage) {
                        adminSupabaseMessage.textContent = `Subiendo a Supabase: ${inserted} / ${prodsToUpload.length} productos...`;
                    }
                }

                if (adminSupabaseMessage) {
                    adminSupabaseMessage.textContent = `✅ ¡Catálogo completo de ${inserted} productos subido exitosamente a Supabase!`;
                    adminSupabaseMessage.style.color = '#047857';
                }

                logValenEvent('OK', 'SUPABASE_SEED', `Migración completa a Supabase: ${inserted} productos subidos a la nube`, {
                    uploadedCount: inserted,
                    totalCatalog: prodsToUpload.length
                }, 'OK');

                showNotification('Catálogo migrado a Supabase con éxito', '🎉');
                await loadCatalog();
            } catch (err) {
                if (adminSupabaseMessage) {
                    adminSupabaseMessage.textContent = `Error al migrar catálogo: ${err.message}`;
                    adminSupabaseMessage.style.color = 'var(--bratz-deep-pink)';
                }
                logValenEvent('FAILED', 'SUPABASE_SEED', `Error al migrar productos a Supabase: ${err.message}`, {
                    error: err.message
                }, 'FAILED');
            }
        });
    }

    // Submit New Category
    if (adminCategoryForm) {
        adminCategoryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const catInput = document.getElementById('admin-new-category');
            const name = catInput.value.trim();
            if (!name) return;

            const norm = normalizeCategoryName(name);
            if (!allCategories.some(c => c.toLowerCase() === norm.toLowerCase())) {
                allCategories.push(norm);
                adminCategories.push({ id: adminCategories.length + 1, name: norm });
                renderCategoryFilterPills();
                populateAdminCategorySelect();
                renderAdminCategoryChips();
                renderAdminCategoryPills();
                updateAdminStats();
            }

            catInput.value = '';
            logValenEvent('OK', 'CATEGORY_CREATE', `Nueva categoría agregada: "${norm}"`, {
                categoryName: norm,
                totalCategories: allCategories.length
            }, 'OK');
            showNotification('Categoría agregada', '✨');

            if (supabaseClient) {
                try {
                    await supabaseClient.from('categories').insert([{ name: norm }]);
                } catch (e) {}
            }

            try {
                await fetchApi('/api/categories', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Admin-Password': adminPassword
                    },
                    body: JSON.stringify({ name: norm })
                });
            } catch (err) {}
        });
    }

    // Change Admin PIN
    if (adminChangePasswordForm) {
        adminChangePasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newPin = document.getElementById('admin-new-password').value.trim();
            if (!newPin || newPin.length < 4) {
                if (adminPasswordMessage) adminPasswordMessage.textContent = 'El PIN debe tener al menos 4 dígitos.';
                logValenEvent('WARN', 'AUTH_PIN_CHANGE', 'Intento de cambio de PIN rechazado (menos de 4 dígitos)', {}, 'FAILED');
                return;
            }

            adminPassword = newPin;
            document.getElementById('admin-new-password').value = '';
            if (adminPasswordMessage) adminPasswordMessage.textContent = 'PIN actualizado con éxito.';
            logValenEvent('INFO', 'AUTH_PIN_CHANGE', 'PIN de administrador actualizado exitosamente', {}, 'OK');
            showNotification('PIN de acceso actualizado', '🔒');

            try {
                await fetchApi('/api/admin/password', {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Admin-Password': adminPassword
                    },
                    body: JSON.stringify({ password: newPin })
                });
            } catch (e) {}
        });
    }

    // Initialize App
    loadSavedCart();
    loadCatalog();
    initAdminTabs();
    initValenLogsConsole();
});