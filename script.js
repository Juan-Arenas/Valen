
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