
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
    const loadingTrigger = document.getElementById('loading-trigger');
    const btnCheckout = document.getElementById('btn-checkout');

    // Global App State
    let allProducts = [];
    let filteredProducts = [];
    let displayedCount = 0;
    const ITEMS_PER_PAGE = 24;
    const API_BASE_URL = (window.API_BASE_URL || '').replace(/\/$/, '');
    const PRODUCTS_API_URL = API_BASE_URL ? `${API_BASE_URL}/api/products` : '/api/products';
    let cart = [];

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

    // Load Products from backend API or fallback to local JSON
    async function loadProducts() {
        let products = [];
        try {
            const response = await fetch(PRODUCTS_API_URL);
            if (!response.ok) {
                throw new Error('Error al cargar el catálogo desde la API');
            }
            products = await response.json();
        } catch (apiError) {
            console.warn('No se pudo cargar desde la API, intentando fallback a JSON local:', apiError);
            try {
                const response = await fetch('extracted_products.json');
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

        allProducts = products;
        filteredProducts = allProducts.filter(product => product.active !== false);
        displayedCount = 0;
        productsGrid.innerHTML = '';
        loadMoreProducts();
        setupInfiniteScroll();
    }

    // Render Product Chunk
    function loadMoreProducts() {
        const nextProducts = filteredProducts.slice(displayedCount, displayedCount + ITEMS_PER_PAGE);
        if (nextProducts.length === 0) {
            loadingTrigger.style.display = 'none';
            if (displayedCount === 0) {
                productsGrid.innerHTML = `
                    <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--dark-purple);">
                        <i class="far fa-frown" style="font-size: 2.5rem; margin-bottom: 15px;"></i>
                        <h3>No encontramos productos que coincidan con tu búsqueda.</h3>
                        <p>Intenta buscando con palabras clave diferentes.</p>
                    </div>
                `;
            }
            return;
        }

        nextProducts.forEach(product => {
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
            productsGrid.appendChild(card);
        });

        // Add event listeners to newly created buttons
        const newButtons = productsGrid.querySelectorAll(`.btn-add-cart`);
        newButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(btn.getAttribute('data-id'));
                const prodObj = allProducts.find(p => p.id === id);
                if (prodObj) {
                    addToCart(prodObj);
                }
            });
        });

        displayedCount += nextProducts.length;
        if (displayedCount >= filteredProducts.length) {
            loadingTrigger.style.display = 'none';
        } else {
            loadingTrigger.style.display = 'flex';
        }
    }

    // Infinite Scroll Setup (IntersectionObserver)
    function setupInfiniteScroll() {
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && displayedCount < filteredProducts.length) {
                loadMoreProducts();
            }
        }, {
            rootMargin: '100px'
        });
        observer.observe(loadingTrigger);
    }

    // Search Filtering
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        
        filteredProducts = allProducts
            .filter(product => product.active !== false)
            .filter(product => {
                const nameClean = product.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                return nameClean.includes(query);
            });

        displayedCount = 0;
        productsGrid.innerHTML = '';
        loadMoreProducts();
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
    const adminProductForm = document.getElementById('admin-product-form');
    const adminCategoryForm = document.getElementById('admin-category-form');
    const adminChangePasswordForm = document.getElementById('admin-change-password-form');
    const adminCategorySelect = document.getElementById('admin-product-category');
    const adminCategoryList = document.getElementById('admin-category-list');
    const adminProductList = document.getElementById('admin-product-list');
    const adminProductMessage = document.getElementById('admin-product-message');
    const adminCategoryMessage = document.getElementById('admin-category-message');
    const adminPasswordMessage = document.getElementById('admin-password-message');
    const adminCloseButtons = document.querySelectorAll('.admin-close');

    let adminPassword = '';
    let adminCategories = [];
    let adminProducts = [];

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

        const response = await fetch(`${API_BASE_URL}/api/admin/authenticate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ password }),
        });

        if (!response.ok) {
            adminLoginMessage.textContent = 'Contraseña incorrecta.';
            return;
        }

        adminPassword = password;
        adminPasswordModal.classList.remove('active');
        adminPanel.classList.add('active');
        await loadAdminData();
    });

    async function loadAdminData() {
        await Promise.all([loadAdminCategories(), loadAdminProducts()]);
    }

    async function loadAdminCategories() {
        const response = await fetch(`${API_BASE_URL}/api/categories`);
        if (!response.ok) {
            adminCategoryMessage.textContent = 'Error cargando categorías.';
            return;
        }
        adminCategories = await response.json();
        renderAdminCategories();
        populateCategorySelect();
    }

    async function loadAdminProducts() {
        const response = await fetch(`${API_BASE_URL}/api/products?active=false`);
        if (!response.ok) {
            adminProductMessage.textContent = 'Error cargando productos.';
            return;
        }
        adminProducts = await response.json();
        renderAdminProducts();
    }

    function populateCategorySelect() {
        adminCategorySelect.innerHTML = '<option value="">Seleccionar categoría</option>';
        adminCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            adminCategorySelect.appendChild(option);
        });
    }

    function renderAdminCategories() {
        adminCategoryList.innerHTML = '';
        adminCategories.forEach(category => {
            const categoryRow = document.createElement('div');
            categoryRow.className = 'admin-list-item';
            categoryRow.innerHTML = `
                <div>
                    <span>${category.name}</span>
                </div>
                <div class="admin-list-actions">
                    <button class="admin-btn-sm" data-action="delete-category" data-id="${category.id}">Eliminar</button>
                </div>
            `;
            adminCategoryList.appendChild(categoryRow);
        });
    }

    function renderAdminProducts() {
        adminProductList.innerHTML = '';
        adminProducts.forEach(product => {
            const categoryLabel = product.category || 'Sin categoría';
            const productRow = document.createElement('div');
            productRow.className = 'admin-product-row';
            productRow.innerHTML = `
                <div>
                    <strong>${product.name}</strong>
                    <span>${categoryLabel}</span>
                </div>
                <div>
                    <span>Precio: $${product.price.toLocaleString('es-CO')}</span>
                    <span>Orden: ${product.page}</span>
                </div>
                <div class="admin-product-actions">
                    <button class="admin-btn-sm" data-action="edit-product" data-id="${product.id}">Editar</button>
                    <button class="admin-btn-sm" data-action="delete-product" data-id="${product.id}">Eliminar</button>
                </div>
            `;
            adminProductList.appendChild(productRow);
        });
    }

    adminCategoryList.addEventListener('click', async (event) => {
        const button = event.target.closest('button');
        if (!button) return;
        const action = button.dataset.action;
        const id = parseInt(button.dataset.id, 10);
        if (action === 'delete-category') {
            await deleteCategory(id);
        }
    });

    adminProductList.addEventListener('click', async (event) => {
        const button = event.target.closest('button');
        if (!button) return;
        const action = button.dataset.action;
        const id = parseInt(button.dataset.id, 10);
        if (action === 'delete-product') {
            await deleteProduct(id);
        } else if (action === 'edit-product') {
            await openProductForEdit(id);
        }
    });

    adminCategoryForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        adminCategoryMessage.textContent = '';
        const categoryName = document.getElementById('admin-new-category').value.trim();
        if (!categoryName) {
            adminCategoryMessage.textContent = 'Ingresa el nombre de la categoría.';
            return;
        }

        const response = await fetch(`${API_BASE_URL}/api/categories`, {
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
        await loadAdminCategories();
    });

    adminProductForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        adminProductMessage.textContent = '';

        const name = document.getElementById('admin-product-name').value.trim();
        const price = document.getElementById('admin-product-price').value.trim();
        const image = document.getElementById('admin-product-image').value.trim();
        const page = document.getElementById('admin-product-page').value.trim();
        const categoryId = document.getElementById('admin-product-category').value;
        const categoryNew = document.getElementById('admin-product-category-new').value.trim();
        const active = document.getElementById('admin-product-active').checked;

        if (!name || !price || !image) {
            adminProductMessage.textContent = 'Completa todos los campos obligatorios.';
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
            const categoryResponse = await fetch(`${API_BASE_URL}/api/categories`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Admin-Password': adminPassword,
                },
                body: JSON.stringify({ name: categoryNew }),
            });
            if (categoryResponse.ok) {
                const category = await categoryResponse.json();
                payload.category_id = category.id;
            }
        } else if (categoryId) {
            payload.category_id = parseInt(categoryId, 10);
        } else if (adminProductForm.dataset.editing) {
            payload.category_id = null;
        }

        const isEditing = Boolean(adminProductForm.dataset.editing);
        const url = isEditing ? `${API_BASE_URL}/api/products/${adminProductForm.dataset.editing}` : `${API_BASE_URL}/api/products`;
        const method = isEditing ? 'PATCH' : 'POST';

        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'X-Admin-Password': adminPassword,
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            adminProductMessage.textContent = isEditing ? 'No se pudo actualizar el producto.' : 'No se pudo crear el producto.';
            return;
        }

        if (isEditing) {
            delete adminProductForm.dataset.editing;
            adminProductMessage.textContent = 'Producto actualizado correctamente.';
        } else {
            adminProductMessage.textContent = 'Producto creado con éxito.';
        }

        adminProductForm.reset();
        await loadAdminData();
    });

    adminChangePasswordForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        adminPasswordMessage.textContent = '';
        const newPassword = document.getElementById('admin-new-password').value.trim();
        if (!newPassword) {
            adminPasswordMessage.textContent = 'Ingresa la nueva contraseña.';
            return;
        }

        const response = await fetch(`${API_BASE_URL}/api/admin/password`, {
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
        adminPasswordMessage.textContent = 'Contraseña actualizada correctamente.';
    });

    async function deleteCategory(categoryId) {
        const response = await fetch(`${API_BASE_URL}/api/categories/${categoryId}`, {
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
        await loadAdminData();
    }

    async function deleteProduct(productId) {
        const response = await fetch(`${API_BASE_URL}/api/products/${productId}`, {
            method: 'DELETE',
            headers: {
                'X-Admin-Password': adminPassword,
            },
        });

        if (!response.ok) {
            adminProductMessage.textContent = 'No se pudo eliminar el producto.';
            return;
        }

        adminProductMessage.textContent = 'Producto eliminado.';
        await loadAdminProducts();
    }

    async function openProductForEdit(productId) {
        const response = await fetch(`${API_BASE_URL}/api/products/${productId}`);
        if (!response.ok) {
            adminProductMessage.textContent = 'No se pudo cargar el producto.';
            return;
        }

        const product = await response.json();
        document.getElementById('admin-product-name').value = product.name;
        document.getElementById('admin-product-price').value = product.price;
        document.getElementById('admin-product-image').value = product.image;
        document.getElementById('admin-product-page').value = product.page;
        document.getElementById('admin-product-active').checked = product.active;
        document.getElementById('admin-product-category').value = product.category_id || '';
        document.getElementById('admin-product-category-new').value = '';

        adminProductForm.dataset.editing = productId;
        adminProductMessage.textContent = 'Edita los datos y presiona Guardar producto.';
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
    loadProducts();
});