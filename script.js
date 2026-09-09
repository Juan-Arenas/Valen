
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    const cartIcon = document.querySelector('.cart-icon');
    const cartModal = document.getElementById('cart-modal');
    const closeModal = document.querySelector('.close');
    const cartItemsContainer = document.getElementById('cart-items');
    const cartTotalPrice = document.getElementById('cart-total-price');
    const cartCount = document.querySelector('.cart-count');
    const productsGrid = document.getElementById('products-grid');
    const searchInput = document.getElementById('search-input');
    const categoryFilters = document.getElementById('category-filters');
    const loadingTrigger = document.getElementById('loading-trigger');
    const btnCheckout = document.getElementById('btn-checkout');

    // Global App State
    let allProducts = [];
    let filteredProducts = [];
    let displayedCount = 0;
    let allCategories = [];
    let selectedCategoryId = null;
    const ITEMS_PER_PAGE = Infinity;
    const API_BASE_URL = (window.API_BASE_URL || '').replace(/\/$/, '');
    const PRODUCTS_API_URL = API_BASE_URL ? `${API_BASE_URL}/api/products` : '/api/products';
    const CATEGORIES_API_URL = API_BASE_URL ? `${API_BASE_URL}/api/categories` : '/api/categories';
    let cart = [];

    const CANONICAL_CATEGORY_ORDER = [
        'Cuidado Facial',
        'Maquillaje',
        'Cabello',
        'Accesorios',
        'Herramientas',
        'Corporal'
    ];

    const CATEGORY_ICONS = {
        'cuidado facial': '🧴',
        'maquillaje': '💄',
        'cabello': '💇',
        'accesorios': '🎀',
        'herramientas': '🖌️',
        'corporal': '🌸',
        'sin categoría': '📦'
    };

    function getCategoryForPage(page) {
        const p = Number(page) || 1;
        if (p >= 2 && p <= 15) return 'Cuidado Facial';
        if (p >= 16 && p <= 30) return 'Maquillaje';
        if (p >= 31 && p <= 35) return 'Cabello';
        if (p >= 36 && p <= 40) return 'Accesorios';
        if (p >= 41 && p <= 47) return 'Herramientas';
        if (p >= 48 && p <= 50) return 'Corporal';
        return 'Cuidado Facial';
    }

    function getCategoryOrderIndex(catName) {
        const idx = CANONICAL_CATEGORY_ORDER.findIndex(
            c => c.toLowerCase() === String(catName || '').trim().toLowerCase()
        );
        return idx === -1 ? 999 : idx;
    }

    function sortCategoriesList(categories) {
        return categories.slice().sort((a, b) => {
            const nameA = typeof a === 'string' ? a : (a.name || '');
            const nameB = typeof b === 'string' ? b : (b.name || '');
            const idxA = getCategoryOrderIndex(nameA);
            const idxB = getCategoryOrderIndex(nameB);
            if (idxA !== idxB) return idxA - idxB;
            return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });
        });
    }

    async function fetchJson(url, options = {}) {
        return fetch(url, { cache: 'no-store', ...options });
    }

    // WhatsApp Number Config (Pre-filled from catalog header)
    const WHATSAPP_NUMBER = '573002525489'; 

    // Initialize Hamburger Toggle
    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navMenu.classList.toggle('active');
    });

    // Close Menu on Link Click
    document.querySelectorAll('.nav-menu a').forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
        });
    });

    // Cart Modal Event Listeners
    cartIcon.addEventListener('click', (e) => {
        e.preventDefault();
        cartModal.classList.add('active');
        renderCart();
    });

    closeModal.addEventListener('click', () => {
        cartModal.classList.remove('active');
    });

    window.addEventListener('click', (e) => {
        if (e.target === cartModal) {
            cartModal.classList.remove('active');
        }
    });

    function getDeletedProductIds() {
        try {
            const raw = localStorage.getItem('valen_deleted_ids');
            return new Set(raw ? JSON.parse(raw) : []);
        } catch (e) {
            return new Set();
        }
    }

    function saveDeletedProductId(id) {
        try {
            const deleted = getDeletedProductIds();
            deleted.add(Number(id));
            localStorage.setItem('valen_deleted_ids', JSON.stringify(Array.from(deleted)));
            // Remove from custom products if present
            const custom = getCustomProducts().filter(p => Number(p.id) !== Number(id));
            localStorage.setItem('valen_custom_products', JSON.stringify(custom));
        } catch (e) {}
    }

    function getCustomProducts() {
        try {
            const raw = localStorage.getItem('valen_custom_products');
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    }

    function saveCustomProduct(product) {
        try {
            const custom = getCustomProducts();
            const idx = custom.findIndex(p => Number(p.id) === Number(product.id));
            if (idx >= 0) {
                custom[idx] = product;
            } else {
                custom.push(product);
            }
            localStorage.setItem('valen_custom_products', JSON.stringify(custom));
        } catch (e) {}
    }

    function getEditedProductsMap() {
        try {
            const raw = localStorage.getItem('valen_edited_products');
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            return {};
        }
    }

    function saveEditedProduct(product) {
        try {
            const editedMap = getEditedProductsMap();
            editedMap[product.id] = product;
            localStorage.setItem('valen_edited_products', JSON.stringify(editedMap));
        } catch (e) {}
    }

    function getCustomCategories() {
        try {
            const raw = localStorage.getItem('valen_custom_categories');
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    }

    function saveCustomCategory(category) {
        try {
            const cats = getCustomCategories();
            if (!cats.some(c => c.name.toLowerCase() === category.name.toLowerCase())) {
                cats.push(category);
                localStorage.setItem('valen_custom_categories', JSON.stringify(cats));
            }
        } catch (e) {}
    }

    function mergeProductsWithLocalData(baseProducts) {
        const deletedIds = getDeletedProductIds();
        const editedMap = getEditedProductsMap();
        const customProducts = getCustomProducts();

        let merged = baseProducts.filter(p => !deletedIds.has(Number(p.id))).map(p => {
            if (editedMap[p.id]) {
                return { ...p, ...editedMap[p.id] };
            }
            return p;
        });

        // Add custom products not deleted
        customProducts.forEach(cp => {
            if (!deletedIds.has(Number(cp.id)) && !merged.some(p => Number(p.id) === Number(cp.id))) {
                merged.push(cp);
            }
        });

        merged.forEach(p => {
            if (!p.category) {
                p.category = getCategoryForPage(p.page);
            }
        });

        return merged;
    }

    // Load Products from backend API or fallback to local JSON
    async function loadProducts() {
        let products = [];
        try {
            const response = await fetchJson(PRODUCTS_API_URL);
            if (!response.ok) {
                throw new Error('Error al cargar el catálogo desde la API');
            }
            products = await response.json();
        } catch (apiError) {
            console.warn('No se pudo cargar desde la API, intentando fallback a JSON local:', apiError);
            try {
                const response = await fetchJson('extracted_products.json');
                if (!response.ok) {
                    throw new Error('Error al cargar el catálogo desde JSON local');
                }
                products = await response.json();
            } catch (jsonError) {
                console.error('Error:', jsonError);
                productsGrid.innerHTML = `
                    <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--primary-pink);">
                        <i class="fas fa-exclamation-triangle" style="font-size: 2.5rem; margin-bottom: 15px;"></i>
                        <h3>No pudimos cargar los productos en este momento.</h3>
                        <p>Por favor, recarga la página o inténtalo más tarde.</p>
                    </div>
                `;
                loadingTrigger.style.display = 'none';
                return;
            }
        }

        allProducts = mergeProductsWithLocalData(products);
        applyFilters();
    }

    async function loadCategories() {
        try {
            const response = await fetchJson(CATEGORIES_API_URL);
            if (!response.ok) {
                throw new Error('No se pudo cargar las categorías');
            }
            allCategories = await response.json();
        } catch (error) {
            console.warn('Error al cargar categorías:', error);
            allCategories = [];
        }
        if (!allCategories || allCategories.length === 0) {
            allCategories = CANONICAL_CATEGORY_ORDER.map((name, idx) => ({ id: idx + 1, name }));
        } else {
            allCategories = sortCategoriesList(allCategories);
        }
        renderCategoryFilters();
    }

    function renderCategoryFilters() {
        categoryFilters.innerHTML = '';
        const allOption = document.createElement('button');
        allOption.type = 'button';
        allOption.className = `category-pill${selectedCategoryId === null ? ' active' : ''}`;
        allOption.textContent = 'Todas';
        allOption.addEventListener('click', () => {
            selectedCategoryId = null;
            renderCategoryFilters();
            applyFilters();
        });
        categoryFilters.appendChild(allOption);

        allCategories.forEach(category => {
            const pill = document.createElement('button');
            pill.type = 'button';
            pill.className = `category-pill${selectedCategoryId === category.id ? ' active' : ''}`;
            const icon = CATEGORY_ICONS[category.name.toLowerCase()] || '';
            pill.textContent = icon ? `${icon} ${category.name}` : category.name;
            pill.addEventListener('click', () => {
                selectedCategoryId = category.id;
                renderCategoryFilters();
                applyFilters();
            });
            categoryFilters.appendChild(pill);
        });
    }

    function applyFilters() {
        const query = searchInput.value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        filteredProducts = allProducts
            .filter(product => product.active !== false)
            .filter(product => {
                const matchesSearch = !query || product.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(query);
                const currentCatName = product.category || getCategoryForPage(product.page);
                let matchesCategory = true;
                if (selectedCategoryId !== null) {
                    const selCat = allCategories.find(c => c.id === selectedCategoryId);
                    matchesCategory = product.category_id === selectedCategoryId || (selCat && currentCatName.toLowerCase() === selCat.name.toLowerCase());
                }
                return matchesSearch && matchesCategory;
            });
        displayedCount = 0;
        productsGrid.innerHTML = '';
        renderAllProducts();
    }

    // Render all products at once (no pagination)
    function renderAllProducts() {
        loadingTrigger.style.display = 'none';

        if (filteredProducts.length === 0) {
            productsGrid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--dark-purple);">
                    <i class="far fa-frown" style="font-size: 2.5rem; margin-bottom: 15px;"></i>
                    <h3>No encontramos productos que coincidan con tu búsqueda.</h3>
                    <p>Intenta buscando con palabras clave diferentes.</p>
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
                    <img src="${product.image}" alt="${product.name}" loading="lazy">
                </div>
                <div class="product-info">
                    <h3>${product.name}</h3>
                    <div class="product-price">$${product.price.toLocaleString('es-CO')}</div>
                    <button class="btn-add-cart" data-id="${product.id}">
                        <i class="fas fa-shopping-cart"></i> Agregar al Carrito
                    </button>
                </div>
            `;
            fragment.appendChild(card);
        });

        productsGrid.appendChild(fragment);

        // Add event listeners to all buttons
        productsGrid.querySelectorAll('.btn-add-cart').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.getAttribute('data-id'));
                const prodObj = allProducts.find(p => p.id === id);
                if (prodObj) {
                    addToCart(prodObj);
                }
            });
        });

        displayedCount = filteredProducts.length;
    }

    // Search Filtering
    searchInput.addEventListener('input', () => {
        applyFilters();
    });

    // Shopping Cart Operations
    function addToCart(product) {
        const existingItem = cart.find(item => item.id === product.id);
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.push({ ...product, quantity: 1 });
        }
        updateCartCount();
        showNotification(`¡${product.name.slice(0, 20)}... agregado!`);
        saveCartToLocalStorage();
    }

    function updateCartCount() {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCount.textContent = totalItems;
    }

    window.updateQuantity = function(id, change) {
        const item = cart.find(item => item.id === id);
        if (item) {
            item.quantity += change;
            if (item.quantity <= 0) {
                cart = cart.filter(item => item.id !== id);
            }
            updateCartCount();
            renderCart();
            saveCartToLocalStorage();
        }
    };

    function renderCart() {
        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<p style="text-align: center; padding: 30px; opacity: 0.6;">El carrito está vacío</p>';
            cartTotalPrice.textContent = '$0';
            return;
        }

        cartItemsContainer.innerHTML = '';
        let total = 0;

        cart.forEach(item => {
            total += item.price * item.quantity;
            const cartItem = document.createElement('div');
            cartItem.className = 'cart-item';
            cartItem.innerHTML = `
                <img src="${item.image}" alt="${item.name}">
                <div class="cart-item-details">
                    <h4>${item.name}</h4>
                    <p>$${item.price.toLocaleString('es-CO')}</p>
                    <div class="quantity-control">
                        <button onclick="updateQuantity(${item.id}, -1)">-</button>
                        <span>${item.quantity}</span>
                        <button onclick="updateQuantity(${item.id}, 1)">+</button>
                    </div>
                </div>
            `;
            cartItemsContainer.appendChild(cartItem);
        });

        cartTotalPrice.textContent = `$${total.toLocaleString('es-CO')}`;
    }

    // Checkout via WhatsApp
    btnCheckout.addEventListener('click', () => {
        if (cart.length === 0) {
            alert('Agrega productos al carrito antes de realizar tu pedido.');
            return;
        }

        let total = 0;
        let messageText = '✨ *PEDIDO NUEVO - VALEN MAKEUP* ✨\n';
        messageText += 'Hola, me gustaría realizar la compra de los siguientes productos:\n\n';

        cart.forEach((item, index) => {
            const subtotal = item.price * item.quantity;
            total += subtotal;
            messageText += `*${index + 1}.* ${item.name}\n`;
            messageText += `   *Cantidad:* ${item.quantity} x $${item.price.toLocaleString('es-CO')}\n`;
            messageText += `   *Subtotal:* $${subtotal.toLocaleString('es-CO')}\n\n`;
        });

        messageText += `--------------------------------------\n`;
        messageText += `🛍️ *TOTAL ESTIMADO:* $${total.toLocaleString('es-CO')}\n\n`;
        messageText += `📍 *Por favor indícame disponibilidad y costo del envío.*`;

        const encodedMessage = encodeURIComponent(messageText);
        const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`;
        
        window.open(whatsappUrl, '_blank');
    });

    // Admin panel logic
    const logoButton = document.getElementById('site-logo');
    const adminPasswordModal = document.getElementById('admin-password-modal');
    const adminPanel = document.getElementById('admin-panel');
    const adminLoginForm = document.getElementById('admin-login-form');
    const adminLoginMessage = document.getElementById('admin-login-message');
    const adminPinInputs = [
        document.getElementById('admin-pin-input-1'),
        document.getElementById('admin-pin-input-2'),
        document.getElementById('admin-pin-input-3'),
        document.getElementById('admin-pin-input-4'),
    ];

    // Form DOM Elements
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

    // Category DOM Elements
    const adminCategoryForm = document.getElementById('admin-category-form');
    const adminCategorySelect = document.getElementById('admin-product-category');
    const adminCategoryList = document.getElementById('admin-category-list');
    const adminCategoryMessage = document.getElementById('admin-category-message');

    // Products View DOM Elements
    const adminProductList = document.getElementById('admin-product-list');
    const adminProductMessage = document.getElementById('admin-product-message');
    const adminProductSearch = document.getElementById('admin-product-search');
    const adminSearchClear = document.getElementById('admin-search-clear');
    const adminCategoryPills = document.getElementById('admin-category-pills');
    const adminExpandAll = document.getElementById('admin-expand-all');
    const adminCollapseAll = document.getElementById('admin-collapse-all');

    // Stats & Header Badges
    const adminHeaderProductStat = document.getElementById('admin-header-product-stat');
    const adminHeaderCategoryStat = document.getElementById('admin-header-category-stat');
    const adminTotalProductsBadge = document.getElementById('admin-total-products-badge');

    // Password Form
    const adminChangePasswordForm = document.getElementById('admin-change-password-form');
    const adminPasswordMessage = document.getElementById('admin-password-message');
    const adminCloseButtons = document.querySelectorAll('.admin-close');

    // Admin State
    let adminPassword = '';
    let adminCategories = [];
    let adminProducts = [];
    let adminSelectedCategory = 'all';
    let adminSearchQuery = '';
    let adminCollapsedCategories = new Set();

    let logoTapCount = 0;
    let logoTapTimer = null;

    logoButton.addEventListener('click', () => {
        logoTapCount += 1;
        if (logoTapTimer) {
            clearTimeout(logoTapTimer);
        }
        logoTapTimer = setTimeout(() => {
            logoTapCount = 0;
        }, 1200);

        if (logoTapCount >= 3) {
            logoTapCount = 0;
            openAdminLogin();
        }
    });

    function openAdminLogin() {
        adminLoginMessage.textContent = '';
        adminPinInputs.forEach(input => {
            input.value = '';
        });
        adminPinInputs[0].focus();
        adminPasswordModal.classList.add('active');
    }

    function closeAdminModals() {
        adminPasswordModal.classList.remove('active');
        adminPanel.classList.remove('active');
    }

    adminCloseButtons.forEach(button => {
        button.addEventListener('click', closeAdminModals);
    });

    window.addEventListener('click', (event) => {
        if (event.target === adminPasswordModal || event.target === adminPanel) {
            closeAdminModals();
        }
    });

    function showAdminProductPanel(isEditing = false, productName = '') {
        adminProductPanel.classList.remove('hidden');
        if (isEditing) {
            adminProductToggle.innerHTML = '<i class="fas fa-edit"></i> Editando producto';
            adminFormHeading.innerHTML = `<i class="fas fa-edit"></i> Editar: ${productName || 'Producto'}`;
            adminProductSubmitBtn.innerHTML = '<i class="fas fa-save"></i> Actualizar producto';
        } else {
            adminProductToggle.innerHTML = '<i class="fas fa-minus"></i> Ocultar formulario';
            adminFormHeading.innerHTML = '<i class="fas fa-plus-circle"></i> Agregar producto';
            adminProductSubmitBtn.innerHTML = '<i class="fas fa-save"></i> Guardar producto';
        }
    }

    function hideAdminProductPanel() {
        adminProductPanel.classList.add('hidden');
        adminProductToggle.innerHTML = '<i class="fas fa-plus"></i> Abrir formulario';
        adminFormHeading.innerHTML = '<i class="fas fa-plus-circle"></i> Agregar producto';
        adminProductSubmitBtn.innerHTML = '<i class="fas fa-save"></i> Guardar producto';
        if (adminImagePreviewWrap) adminImagePreviewWrap.classList.add('hidden');
    }

    adminProductToggle.addEventListener('click', () => {
        if (adminProductPanel.classList.contains('hidden')) {
            showAdminProductPanel(Boolean(adminProductForm.dataset.editing));
        } else {
            hideAdminProductPanel();
        }
    });

    adminProductCancel.addEventListener('click', () => {
        adminProductForm.reset();
        delete adminProductForm.dataset.editing;
        if (adminProductImageInput) {
            adminProductImageInput.removeAttribute('data-current-image');
        }
        adminProductMessage.textContent = '';
        hideAdminProductPanel();
    });

    // Image preview when file selected
    if (adminProductImageInput) {
        adminProductImageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    adminImagePreviewImg.src = event.target.result;
                    adminImagePreviewText.textContent = 'Nueva imagen seleccionada';
                    adminImagePreviewWrap.classList.remove('hidden');
                };
                reader.readAsDataURL(file);
            }
        });
    }

    adminPinInputs.forEach((input, index) => {
        input.addEventListener('input', (event) => {
            const value = event.target.value.replace(/\D/g, '');
            event.target.value = value;
            if (value && index < adminPinInputs.length - 1) {
                adminPinInputs[index + 1].focus();
            }
        });

        input.addEventListener('keydown', (event) => {
            if (event.key === 'Backspace' && !event.target.value && index > 0) {
                adminPinInputs[index - 1].focus();
            }
        });
    });

    adminLoginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        adminLoginMessage.textContent = '';
        const password = adminPinInputs.map(input => input.value.trim()).join('');
        if (password.length !== 4) {
            adminLoginMessage.textContent = 'Ingresa el PIN de 4 dígitos.';
            return;
        }

        try {
            const response = await fetchJson(`${API_BASE_URL}/api/admin/authenticate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ password }),
            });

            if (!response.ok) {
                if (response.status === 401) {
                    adminLoginMessage.textContent = 'Contraseña incorrecta.';
                } else {
                    adminLoginMessage.textContent = 'No se pudo conectar con el backend administrativo.';
                }
                return;
            }

            adminPassword = password;
            adminPasswordModal.classList.remove('active');
            adminPanel.classList.add('active');
            await loadAdminData();
        } catch (error) {
            adminLoginMessage.textContent = 'Error de conexión: el backend no está disponible.';
            console.error('Admin login error:', error);
        }
    });

    async function loadAdminData() {
        await Promise.all([loadAdminCategories(), loadAdminProducts()]);
    }

    async function loadAdminCategories() {
        try {
            const response = await fetchJson(`${API_BASE_URL}/api/categories`);
            if (!response.ok) {
                adminCategoryMessage.textContent = 'Error cargando categorías.';
                return;
            }
            let cats = await response.json();
            if (!cats || cats.length === 0) {
                cats = CANONICAL_CATEGORY_ORDER.map((name, idx) => ({ id: idx + 1, name }));
            }
            const customCats = getCustomCategories();
            customCats.forEach(cc => {
                if (!cats.some(c => c.name.toLowerCase() === cc.name.toLowerCase())) {
                    cats.push(cc);
                }
            });
            adminCategories = sortCategoriesList(cats);
            populateCategorySelect();
            renderAdminCategoryList();
            renderAdminCategoryPills();
            updateAdminStats();
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    }

    async function loadAdminProducts() {
        try {
            const response = await fetchJson(`${API_BASE_URL}/api/products?active=false`);
            if (!response.ok) {
                adminProductMessage.textContent = 'Error cargando productos.';
                return;
            }
            let prods = await response.json();
            adminProducts = mergeProductsWithLocalData(prods);
            renderAdminCategoryList();
            renderAdminCategoryPills();
            renderAdminProducts();
            updateAdminStats();
        } catch (error) {
            console.error('Error loading products:', error);
        }
    }

    function updateAdminStats() {
        if (adminHeaderProductStat) {
            adminHeaderProductStat.innerHTML = `<i class="fas fa-boxes"></i> ${adminProducts.length} Productos`;
        }
        if (adminHeaderCategoryStat) {
            adminHeaderCategoryStat.innerHTML = `<i class="fas fa-tags"></i> ${adminCategories.length} Categorías`;
        }
        if (adminTotalProductsBadge) {
            adminTotalProductsBadge.textContent = `${adminProducts.length} productos`;
        }
    }

    function populateCategorySelect() {
        adminCategorySelect.innerHTML = '<option value="">Seleccionar categoría</option>';
        const sorted = sortCategoriesList(adminCategories);
        sorted.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            const icon = CATEGORY_ICONS[category.name.toLowerCase()] || '';
            option.textContent = icon ? `${icon} ${category.name}` : category.name;
            adminCategorySelect.appendChild(option);
        });
    }

    function renderAdminCategoryList() {
        if (!adminCategoryList) return;
        adminCategoryList.innerHTML = '';
        
        if (adminCategories.length === 0) {
            adminCategoryList.innerHTML = '<span style="font-size:0.82rem; color:#9ca3af;">No hay categorías creadas.</span>';
            return;
        }

        const sorted = sortCategoriesList(adminCategories);
        sorted.forEach(category => {
            const count = adminProducts.filter(p => p.category_id === category.id || (p.category && p.category.toLowerCase() === category.name.toLowerCase())).length;
            const chip = document.createElement('div');
            chip.className = 'admin-category-chip';
            const icon = CATEGORY_ICONS[category.name.toLowerCase()] || '🏷️';
            chip.innerHTML = `
                <span>${icon} ${category.name}</span>
                <span class="chip-count" title="${count} productos">${count}</span>
                <button type="button" class="chip-delete" data-action="delete-category" data-id="${category.id}" title="Eliminar categoría">
                    <i class="fas fa-times"></i>
                </button>
            `;
            adminCategoryList.appendChild(chip);
        });
    }

    function renderAdminCategoryPills() {
        if (!adminCategoryPills) return;
        adminCategoryPills.innerHTML = '';

        // Category counts
        const catCounts = {};
        let uncategorizedCount = 0;

        adminProducts.forEach(product => {
            const key = product.category || getCategoryForPage(product.page);
            if (!key || key === 'Sin categoría') {
                uncategorizedCount++;
            } else {
                catCounts[key] = (catCounts[key] || 0) + 1;
            }
        });

        // "Todas" pill
        const allPill = document.createElement('button');
        allPill.type = 'button';
        allPill.className = `admin-pill-btn ${adminSelectedCategory === 'all' ? 'active' : ''}`;
        allPill.innerHTML = `<span>✨ Todas</span><span class="pill-count">${adminProducts.length}</span>`;
        allPill.addEventListener('click', () => {
            adminSelectedCategory = 'all';
            renderAdminCategoryPills();
            renderAdminProducts();
        });
        adminCategoryPills.appendChild(allPill);

        // Category Pills in canonical catalog order
        const sortedCategories = sortCategoriesList(Object.keys(catCounts));
        
        sortedCategories.forEach(catName => {
            const pill = document.createElement('button');
            pill.type = 'button';
            pill.className = `admin-pill-btn ${adminSelectedCategory === catName ? 'active' : ''}`;
            const icon = CATEGORY_ICONS[catName.toLowerCase()] || '🏷️';
            pill.innerHTML = `<span>${icon} ${catName}</span><span class="pill-count">${catCounts[catName]}</span>`;
            pill.addEventListener('click', () => {
                adminSelectedCategory = catName;
                // Auto-expand this category
                adminCollapsedCategories.delete(catName);
                renderAdminCategoryPills();
                renderAdminProducts();
            });
            adminCategoryPills.appendChild(pill);
        });

        if (uncategorizedCount > 0) {
            const uncategorizedPill = document.createElement('button');
            uncategorizedPill.type = 'button';
            uncategorizedPill.className = `admin-pill-btn ${adminSelectedCategory === 'Sin categoría' ? 'active' : ''}`;
            uncategorizedPill.innerHTML = `<span>📦 Sin categoría</span><span class="pill-count">${uncategorizedCount}</span>`;
            uncategorizedPill.addEventListener('click', () => {
                adminSelectedCategory = 'Sin categoría';
                adminCollapsedCategories.delete('Sin categoría');
                renderAdminCategoryPills();
                renderAdminProducts();
            });
            adminCategoryPills.appendChild(uncategorizedPill);
        }
    }

    function renderAdminProducts() {
        if (!adminProductList) return;
        adminProductList.innerHTML = '';

        // Filter products based on search query and category filter
        let filtered = adminProducts.slice();

        if (adminSelectedCategory !== 'all') {
            if (adminSelectedCategory === 'Sin categoría') {
                filtered = filtered.filter(p => !p.category || p.category.trim() === '' || p.category === 'Sin categoría');
            } else {
                filtered = filtered.filter(p => (p.category || getCategoryForPage(p.page)).toLowerCase() === adminSelectedCategory.toLowerCase());
            }
        }

        if (adminSearchQuery) {
            const query = adminSearchQuery.toLowerCase().trim();
            filtered = filtered.filter(p => {
                const nameMatch = p.name && p.name.toLowerCase().includes(query);
                const currentCat = p.category || getCategoryForPage(p.page);
                const categoryMatch = currentCat && currentCat.toLowerCase().includes(query);
                const idMatch = String(p.id).includes(query);
                return nameMatch || categoryMatch || idMatch;
            });
        }

        if (filtered.length === 0) {
            adminProductList.innerHTML = `
                <div class="admin-empty-state">
                    <i class="fas fa-search"></i>
                    <h4>No se encontraron productos</h4>
                    <p>${adminSearchQuery ? `No hay productos que coincidan con "${adminSearchQuery}".` : 'No hay productos en esta categoría.'}</p>
                </div>
            `;
            return;
        }

        // Group by category
        const grouped = {};
        filtered.forEach(product => {
            const key = product.category || getCategoryForPage(product.page);
            if (!grouped[key]) {
                grouped[key] = [];
            }
            grouped[key].push(product);
        });

        // Sort categories in catalog canonical order (1: Cuidado Facial, 2: Maquillaje, 3: Cabello, etc.)
        const sortedCategoryNames = sortCategoriesList(Object.keys(grouped));

        sortedCategoryNames.forEach(categoryName => {
            const categoryProducts = grouped[categoryName];
            const isCollapsed = adminCollapsedCategories.has(categoryName) && !adminSearchQuery;
            const icon = CATEGORY_ICONS[categoryName.toLowerCase()] || '🏷️';

            const accordion = document.createElement('div');
            accordion.className = `admin-category-accordion ${isCollapsed ? 'collapsed' : ''}`;
            accordion.dataset.category = categoryName;

            accordion.innerHTML = `
                <div class="admin-accordion-header">
                    <div class="admin-accordion-title-wrap">
                        <div class="admin-accordion-icon">
                            ${icon}
                        </div>
                        <h4>${categoryName}</h4>
                        <span class="admin-accordion-count">${categoryProducts.length} ${categoryProducts.length === 1 ? 'producto' : 'productos'}</span>
                    </div>
                    <i class="fas fa-chevron-down admin-accordion-chevron"></i>
                </div>
                <div class="admin-accordion-body">
                    <div class="admin-prods-grid">
                        ${categoryProducts.map(product => `
                            <div class="admin-prod-card ${product.active ? '' : 'inactive-product'}" data-id="${product.id}">
                                <div class="admin-prod-card-main">
                                    <img src="${product.image || 'Logo.jpeg'}" alt="${product.name}" class="admin-prod-thumb" onerror="this.onerror=null;this.src='Logo.jpeg';">
                                    <div class="admin-prod-info">
                                        <div class="admin-prod-name" title="${product.name}">${product.name}</div>
                                        <div class="admin-prod-price">$${Number(product.price || 0).toLocaleString('es-CO')}</div>
                                        <div class="admin-prod-meta">
                                            <span class="admin-tag admin-tag-page">Pág. ${product.page || 1}</span>
                                            <span class="admin-tag ${product.active ? 'admin-tag-active' : 'admin-tag-inactive'}">
                                                ${product.active ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div class="admin-prod-actions">
                                    <button type="button" class="admin-action-btn admin-action-edit" data-action="edit-product" data-id="${product.id}">
                                        <i class="fas fa-pen"></i> Editar
                                    </button>
                                    <button type="button" class="admin-action-btn admin-action-toggle ${product.active ? 'to-inactive' : ''}" data-action="toggle-state" data-id="${product.id}" data-active="${product.active}">
                                        <i class="fas ${product.active ? 'fa-eye-slash' : 'fa-eye'}"></i> ${product.active ? 'Ocultar' : 'Activar'}
                                    </button>
                                    <button type="button" class="admin-action-btn admin-action-delete" data-action="delete-product" data-id="${product.id}" title="Eliminar producto">
                                        <i class="fas fa-trash-alt"></i>
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;

            // Toggle collapse/expand on header click
            const header = accordion.querySelector('.admin-accordion-header');
            header.addEventListener('click', () => {
                accordion.classList.toggle('collapsed');
                if (accordion.classList.contains('collapsed')) {
                    adminCollapsedCategories.add(categoryName);
                } else {
                    adminCollapsedCategories.delete(categoryName);
                }
            });

            adminProductList.appendChild(accordion);
        });
    }

    // Search and controls in Admin
    if (adminProductSearch) {
        adminProductSearch.addEventListener('input', (e) => {
            adminSearchQuery = e.target.value.trim();
            if (adminSearchClear) {
                if (adminSearchQuery) {
                    adminSearchClear.classList.remove('hidden');
                } else {
                    adminSearchClear.classList.add('hidden');
                }
            }
            renderAdminProducts();
        });
    }

    if (adminSearchClear) {
        adminSearchClear.addEventListener('click', () => {
            adminProductSearch.value = '';
            adminSearchQuery = '';
            adminSearchClear.classList.add('hidden');
            renderAdminProducts();
        });
    }

    if (adminExpandAll) {
        adminExpandAll.addEventListener('click', () => {
            adminCollapsedCategories.clear();
            document.querySelectorAll('.admin-category-accordion').forEach(acc => {
                acc.classList.remove('collapsed');
            });
        });
    }

    if (adminCollapseAll) {
        adminCollapseAll.addEventListener('click', () => {
            document.querySelectorAll('.admin-category-accordion').forEach(acc => {
                acc.classList.add('collapsed');
                if (acc.dataset.category) {
                    adminCollapsedCategories.add(acc.dataset.category);
                }
            });
        });
    }

    // Event delegation for category deletion
    if (adminCategoryList) {
        adminCategoryList.addEventListener('click', async (event) => {
            const button = event.target.closest('button[data-action="delete-category"]');
            if (!button) return;
            const id = parseInt(button.dataset.id, 10);
            if (!id) return;
            await deleteCategory(id);
        });
    }

    // Event delegation for product actions (edit, toggle state, delete)
    if (adminProductList) {
        adminProductList.addEventListener('click', async (event) => {
            const button = event.target.closest('button');
            if (!button) return;
            const action = button.dataset.action;
            const id = parseInt(button.dataset.id, 10);
            if (!id) return;

            if (action === 'delete-product') {
                await deleteProduct(id);
            } else if (action === 'edit-product') {
                await openProductForEdit(id);
            } else if (action === 'toggle-state') {
                const currentActive = button.dataset.active === 'true';
                await toggleProductState(id, currentActive);
            }
        });
    }

    adminCategoryForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        adminCategoryMessage.textContent = '';
        const categoryName = document.getElementById('admin-new-category').value.trim();
        if (!categoryName) {
            adminCategoryMessage.textContent = 'Ingresa el nombre de la categoría.';
            return;
        }

        const response = await fetchJson(`${API_BASE_URL}/api/categories`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Admin-Password': adminPassword,
            },
            body: JSON.stringify({ name: categoryName }),
        });

        if (!response.ok) {
            adminCategoryMessage.textContent = 'No se pudo crear la categoría.';
            return;
        }

        document.getElementById('admin-new-category').value = '';
        adminCategoryMessage.textContent = 'Categoría creada correctamente.';
        try {
            const catObj = await response.json();
            if (catObj && catObj.name) {
                saveCustomCategory(catObj);
            }
        } catch (e) {
            saveCustomCategory({ id: Date.now(), name: categoryName });
        }
        await loadAdminCategories();
    });

    function readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('No se pudo leer la imagen'));
            reader.readAsDataURL(file);
        });
    }

    adminProductForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        adminProductMessage.textContent = '';

        const name = document.getElementById('admin-product-name').value.trim();
        const price = document.getElementById('admin-product-price').value.trim();
        const imageInput = document.getElementById('admin-product-image');
        const page = document.getElementById('admin-product-page').value.trim();
        const categoryId = document.getElementById('admin-product-category').value;
        const categoryNew = document.getElementById('admin-product-category-new').value.trim();
        const active = document.getElementById('admin-product-active').checked;

        const imageFile = imageInput.files[0];
        let image = imageInput.dataset.currentImage || '';
        if (imageFile) {
            try {
                image = await readFileAsDataURL(imageFile);
            } catch (error) {
                adminProductMessage.textContent = 'No se pudo leer la imagen seleccionada.';
                return;
            }
        }

        if (!name || !price || (!image && !imageFile)) {
            adminProductMessage.textContent = 'Completa todos los campos obligatorios. Asegúrate de incluir una imagen.';
            return;
        }

        const payload = {
            name,
            price: parseInt(price, 10),
            image,
            page: parseInt(page, 10) || 1,
            active,
        };

        if (categoryNew) {
            const categoryResponse = await fetchJson(`${API_BASE_URL}/api/categories`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Admin-Password': adminPassword,
                },
                body: JSON.stringify({ name: categoryNew }),
            });

            if (!categoryResponse.ok) {
                let categoryError = 'No se pudo crear la categoría nueva.';
                try {
                    const errorBody = await categoryResponse.json();
                    if (errorBody && errorBody.description) {
                        categoryError += ` ${errorBody.description}`;
                    }
                } catch (error) {
                    const text = await categoryResponse.text();
                    if (text) {
                        categoryError += ` ${text}`;
                    }
                }
                adminProductMessage.textContent = categoryError;
                return;
            }

            const category = await categoryResponse.json();
            payload.category_id = category.id;
            payload.category = category.name;
            saveCustomCategory(category);
        } else if (categoryId) {
            payload.category_id = parseInt(categoryId, 10);
            const foundCat = adminCategories.find(c => c.id === payload.category_id);
            if (foundCat) payload.category = foundCat.name;
        } else if (adminProductForm.dataset.editing) {
            payload.category_id = null;
        }

        const isEditing = Boolean(adminProductForm.dataset.editing);
        const editingId = isEditing ? Number(adminProductForm.dataset.editing) : null;
        const url = isEditing ? `${API_BASE_URL}/api/products/${adminProductForm.dataset.editing}` : `${API_BASE_URL}/api/products`;
        const method = isEditing ? 'PATCH' : 'POST';

        const response = await fetchJson(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'X-Admin-Password': adminPassword,
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            let errorMessage = isEditing ? 'No se pudo actualizar el producto.' : 'No se pudo crear el producto.';
            try {
                const errorBody = await response.json();
                if (errorBody && errorBody.description) {
                    errorMessage += ` ${errorBody.description}`;
                } else if (errorBody && errorBody.message) {
                    errorMessage += ` ${errorBody.message}`;
                } else if (typeof errorBody === 'string' && errorBody.trim()) {
                    errorMessage += ` ${errorBody}`;
                }
            } catch (error) {
                const text = await response.text();
                if (text) {
                    errorMessage += ` ${text}`;
                }
            }
            console.error('Admin product request failed:', response.status, response.statusText, errorMessage);
            adminProductMessage.textContent = errorMessage;
            return;
        }

        try {
            const savedItem = await response.json();
            if (isEditing) {
                saveEditedProduct({ ...payload, id: editingId, ...savedItem });
            } else {
                saveCustomProduct(savedItem);
            }
        } catch (e) {
            if (isEditing) {
                saveEditedProduct({ ...payload, id: editingId });
            } else {
                saveCustomProduct({ ...payload, id: Date.now() });
            }
        }

        if (isEditing) {
            delete adminProductForm.dataset.editing;
            adminProductMessage.textContent = 'Producto actualizado correctamente.';
        } else {
            adminProductMessage.textContent = 'Producto creado con éxito.';
        }

        if (adminProductImageInput) {
            adminProductImageInput.removeAttribute('data-current-image');
        }
        adminProductForm.reset();
        hideAdminProductPanel();
        showNotification('Producto guardado correctamente');
        await loadAdminData();
        await loadProducts();
    });

    adminChangePasswordForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        adminPasswordMessage.textContent = '';
        const newPassword = document.getElementById('admin-new-password').value.trim();
        if (!newPassword) {
            adminPasswordMessage.textContent = 'Ingresa el nuevo PIN.';
            return;
        }

        const response = await fetchJson(`${API_BASE_URL}/api/admin/password`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'X-Admin-Password': adminPassword,
            },
            body: JSON.stringify({ password: newPassword }),
        });

        if (!response.ok) {
            adminPasswordMessage.textContent = 'No se pudo actualizar la contraseña.';
            return;
        }

        adminPassword = newPassword;
        document.getElementById('admin-new-password').value = '';
        adminPasswordMessage.textContent = 'PIN actualizado correctamente.';
        showNotification('PIN de acceso actualizado con éxito');
    });

    async function deleteCategory(categoryId) {
        const cat = adminCategories.find(c => c.id === categoryId);
        const catName = cat ? cat.name : 'esta categoría';
        if (!confirm(`¿Estás seguro de que deseas eliminar "${catName}"?`)) {
            return;
        }

        const response = await fetchJson(`${API_BASE_URL}/api/categories/${categoryId}`, {
            method: 'DELETE',
            headers: {
                'X-Admin-Password': adminPassword,
            },
        });

        if (!response.ok) {
            adminCategoryMessage.textContent = 'No se pudo eliminar la categoría.';
            return;
        }

        adminCategoryMessage.textContent = 'Categoría eliminada.';
        showNotification('Categoría eliminada');
        await loadAdminData();
    }

    async function deleteProduct(productId) {
        const prod = adminProducts.find(p => p.id === productId);
        const prodName = prod ? prod.name : 'este producto';
        if (!confirm(`¿Estás seguro de que deseas eliminar "${prodName}"?`)) {
            return;
        }

        saveDeletedProductId(productId);
        allProducts = allProducts.filter(p => p.id !== productId);
        adminProducts = adminProducts.filter(p => p.id !== productId);

        showNotification('Producto eliminado del catálogo');
        renderAdminCategoryList();
        renderAdminCategoryPills();
        renderAdminProducts();
        updateAdminStats();
        applyFilters();

        try {
            await fetchJson(`${API_BASE_URL}/api/products/${productId}`, {
                method: 'DELETE',
                headers: {
                    'X-Admin-Password': adminPassword,
                },
            });
        } catch (e) {
            console.warn('Delete sync error:', e);
        }
    }

    async function toggleProductState(productId, currentActive) {
        const newActive = !currentActive;
        const prod = adminProducts.find(p => p.id === productId);
        if (prod) {
            prod.active = newActive;
        }
        const storeProd = allProducts.find(p => p.id === productId);
        if (storeProd) {
            storeProd.active = newActive;
        }
        renderAdminProducts();
        applyFilters();
        showNotification(newActive ? 'Producto visible en tienda' : 'Producto ocultado');

        try {
            await fetchJson(`${API_BASE_URL}/api/products/${productId}/state`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Admin-Password': adminPassword,
                },
                body: JSON.stringify({ active: newActive }),
            });
        } catch (e) {
            console.warn('State toggle sync error:', e);
        }
    }

    async function openProductForEdit(productId) {
        const response = await fetchJson(`${API_BASE_URL}/api/products/${productId}`);
        if (!response.ok) {
            adminProductMessage.textContent = 'No se pudo cargar el producto.';
            return;
        }

        const product = await response.json();
        document.getElementById('admin-product-name').value = product.name;
        document.getElementById('admin-product-price').value = product.price;
        
        if (adminProductImageInput) {
            adminProductImageInput.value = '';
            adminProductImageInput.dataset.currentImage = product.image;
        }

        if (adminImagePreviewWrap && adminImagePreviewImg) {
            adminImagePreviewImg.src = product.image || 'Logo.jpeg';
            adminImagePreviewText.textContent = 'Imagen actual guardada';
            adminImagePreviewWrap.classList.remove('hidden');
        }

        document.getElementById('admin-product-page').value = product.page || 1;
        document.getElementById('admin-product-active').checked = product.active !== false;
        document.getElementById('admin-product-category').value = product.category_id || '';
        document.getElementById('admin-product-category-new').value = '';

        adminProductForm.dataset.editing = productId;
        adminProductMessage.textContent = 'Edita los datos y presiona Actualizar producto.';
        showAdminProductPanel(true, product.name);
        
        // Scroll smoothly to form
        const formCard = document.getElementById('admin-product-card-form');
        if (formCard) {
            formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        document.getElementById('admin-product-name').focus();
    }

    // Floating Notification Effect
    function showNotification(message) {
        // Remove existing notification if any
        const existingNotif = document.querySelector('.floating-notification');
        if (existingNotif) {
            existingNotif.remove();
        }

        const notification = document.createElement('div');
        notification.className = 'floating-notification';
        notification.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
        notification.style.cssText = `
            position: fixed;
            bottom: 25px;
            right: 25px;
            background: linear-gradient(135deg, var(--primary-pink), var(--primary-purple));
            color: var(--white);
            padding: 14px 24px;
            border-radius: 30px;
            font-family: var(--font-body);
            font-size: 0.9rem;
            font-weight: 500;
            box-shadow: 0 10px 25px rgba(216, 27, 96, 0.35);
            z-index: 3000;
            display: flex;
            align-items: center;
            gap: 10px;
            animation: slideUpIn 0.35s cubic-bezier(0.165, 0.84, 0.44, 1);
        `;
        document.body.appendChild(notification);

        // Animation rules added dynamically in document head if not exists
        if (!document.getElementById('notif-styles')) {
            const notifStyle = document.createElement('style');
            notifStyle.id = 'notif-styles';
            notifStyle.textContent = `
                @keyframes slideUpIn {
                    from { transform: translateY(30px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `;
            document.head.appendChild(notifStyle);
        }

        setTimeout(() => {
            notification.style.transition = 'opacity 0.3s, transform 0.3s';
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(10px)';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 2200);
    }

    // Local Storage Helpers
    function saveCartToLocalStorage() {
        localStorage.setItem('prodigiosa_cart', JSON.stringify(cart));
    }

    function loadCartFromLocalStorage() {
        const savedCart = localStorage.getItem('prodigiosa_cart');
        if (savedCart) {
            try {
                cart = JSON.parse(savedCart);
                updateCartCount();
            } catch (e) {
                cart = [];
            }
        }
    }

    // App Initialization
    loadCartFromLocalStorage();
    loadCategories();
    loadProducts();
});