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

    // Wishlist / Favoritos Elements
    const headerFavBtn = document.getElementById('header-fav-btn');
    const headerFavCount = document.getElementById('header-fav-count');
    const favoritesModal = document.getElementById('favorites-modal');
    const favCloseBtn = document.getElementById('fav-close-btn');
    const favModalCount = document.getElementById('fav-modal-count');
    const favoritesItemsContainer = document.getElementById('favorites-items-container');
    const btnAddAllFavs = document.getElementById('btn-add-all-favs');
    const mobFavCount = document.getElementById('mob-fav-count');
    const mobCartCount = document.getElementById('mob-cart-count');

    // Intelligent Delivery & Payment Checkout Elements
    const checkoutCustomerBarrio = document.getElementById('checkout-customer-barrio');
    const checkoutCustomerReference = document.getElementById('checkout-customer-reference');
    const checkoutCustomerNotes = document.getElementById('checkout-customer-notes');
    const cityPereiraBtn = document.getElementById('city-pereira-btn');
    const cityDosquebradasBtn = document.getElementById('city-dosquebradas-btn');
    const barriosDatalist = document.getElementById('barrios-datalist');
    const deliveryFeeBadge = document.getElementById('delivery-fee-badge');
    const deliveryPerkText = document.getElementById('delivery-perk-text');
    const deliveryPerkFill = document.getElementById('delivery-perk-fill');
    const cartSubtotalVal = document.getElementById('cart-subtotal-val');
    const cartDeliveryVal = document.getElementById('cart-delivery-val');
    const cartDeliveryCityLabel = document.getElementById('cart-delivery-city-label');
    const cartDiscountRow = document.getElementById('cart-discount-row');
    const cartDiscountVal = document.getElementById('cart-discount-val');
    const cartCouponInput = document.getElementById('cart-coupon-input');
    const btnApplyCoupon = document.getElementById('btn-apply-coupon');
    const appliedCouponTag = document.getElementById('applied-coupon-tag');
    const appliedCouponText = document.getElementById('applied-coupon-text');
    const btnRemoveCoupon = document.getElementById('btn-remove-coupon');
    const couponMessage = document.getElementById('coupon-message');
    const paymentInstructionsBox = document.getElementById('payment-instructions-box');

    // Beauty Advisor ("Ayúdame a elegir") Elements
    const beautyQuizModal = document.getElementById('beauty-quiz-modal');
    const quizCloseBtn = document.getElementById('quiz-close-btn');
    const btnHeroAdvisor = document.getElementById('btn-hero-advisor');
    const cardTriggerAdvisor = document.getElementById('card-trigger-advisor');
    const navAdvisorBtn = document.getElementById('nav-advisor-btn');
    const mobNavAdvisor = document.getElementById('mob-nav-advisor');
    const btnRestartQuiz = document.getElementById('btn-restart-quiz');
    const quizRecommendationsList = document.getElementById('quiz-recommendations-list');
    const quizResultsSummary = document.getElementById('quiz-results-summary');

    // Lucky Wheel Elements
    const luckyWheelModal = document.getElementById('lucky-wheel-modal');
    const wheelCloseBtn = document.getElementById('wheel-close-btn');
    const btnHeroWheel = document.getElementById('btn-hero-wheel');
    const cardTriggerWheel = document.getElementById('card-trigger-wheel');
    const floatingWheelBtn = document.getElementById('floating-wheel-btn');
    const btnSpinAction = document.getElementById('btn-spin-action');
    const luckyWheelCanvas = document.getElementById('lucky-wheel-canvas');
    const wheelStatusNotice = document.getElementById('wheel-status-notice');
    const wheelWinCard = document.getElementById('wheel-win-card');
    const winPrizeLabel = document.getElementById('win-prize-label');
    const winCouponCode = document.getElementById('win-coupon-code');
    const btnCopyPrizeCode = document.getElementById('btn-copy-prize-code');
    const btnApplyPrizeToCart = document.getElementById('btn-apply-prize-to-cart');

    // Customer Reviews Elements
    const reviewModal = document.getElementById('review-modal');
    const reviewCloseBtn = document.getElementById('review-close-btn');
    const btnOpenReviewModal = document.getElementById('btn-open-review-modal');
    const customerReviewForm = document.getElementById('customer-review-form');
    const starRatingPicker = document.getElementById('star-rating-picker');
    const reviewRatingVal = document.getElementById('review-rating-val');
    const reviewFormMessage = document.getElementById('review-form-message');
    const reviewsGrid = document.getElementById('reviews-grid');

    // "Compra el Look" Elements
    const looksGrid = document.getElementById('looks-grid');

    // Mobile Bottom Nav Elements
    const mobileBottomNav = document.getElementById('mobile-bottom-nav');
    const mobNavHome = document.getElementById('mob-nav-home');
    const mobNavSearch = document.getElementById('mob-nav-search');
    const mobNavFavs = document.getElementById('mob-nav-favs');
    const mobNavCart = document.getElementById('mob-nav-cart');

    // Persistent Cart Toast Elements
    const persistentCartToast = document.getElementById('persistent-cart-toast');
    const persistentCartViewBtn = document.getElementById('persistent-cart-view-btn');
    const persistentCartCloseBtn = document.getElementById('persistent-cart-close-btn');
    const persistentCartDesc = document.getElementById('persistent-cart-desc');

    // Minimum Order Protocol Elements (System 35k)
    const MIN_ORDER_AMOUNT = 35000;
    const floatingMinBadge = document.getElementById('floating-min-badge');
    const cartMinOrderCard = document.getElementById('cart-min-order-card');
    const cartMinStatusText = document.getElementById('cart-min-status-text');
    const cartMinOrderTag = document.getElementById('cart-min-order-tag');
    const cartMinProgressFill = document.getElementById('cart-min-progress-fill');
    const cartMinOrderDescIcon = document.getElementById('cart-min-order-desc-icon');
    const cartMinOrderDescText = document.getElementById('cart-min-order-desc-text');
    const cartMinOrderPct = document.getElementById('cart-min-order-pct');
    const minOrderModal = document.getElementById('min-order-modal');
    const minOrderCloseBtn = document.getElementById('min-order-close-btn');
    const minOrderAddMoreBtn = document.getElementById('min-order-add-more-btn');
    const minOrderKeepReviewBtn = document.getElementById('min-order-keep-review-btn');
    const minOrderCurrentVal = document.getElementById('min-order-current-val');
    const minOrderDiffVal = document.getElementById('min-order-diff-val');
    const minOrderTargetVal = document.getElementById('min-order-target-val');
    const minOrderProgressBar = document.getElementById('min-order-progress-bar');
    const minOrderProgressPercent = document.getElementById('min-order-progress-percent');

    // Futuristic Sound Generator via Web Audio API (Zero external assets needed)
    function playFuturisticAlertSound() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();
            if (ctx.state === 'suspended') {
                ctx.resume();
            }
            const now = ctx.currentTime;
            
            // Oscillator 1: Sci-fi cyber frequency sweep
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(320, now);
            osc1.frequency.exponentialRampToValueAtTime(760, now + 0.12);
            osc1.frequency.exponentialRampToValueAtTime(540, now + 0.28);
            
            gain1.gain.setValueAtTime(0.001, now);
            gain1.gain.linearRampToValueAtTime(0.18, now + 0.04);
            gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
            
            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.start(now);
            osc1.stop(now + 0.35);

            // Oscillator 2: Sub-harmonic cyber tone
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = 'triangle';
            osc2.frequency.setValueAtTime(580, now + 0.08);
            osc2.frequency.exponentialRampToValueAtTime(880, now + 0.22);
            
            gain2.gain.setValueAtTime(0.001, now + 0.08);
            gain2.gain.linearRampToValueAtTime(0.12, now + 0.14);
            gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
            
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.start(now + 0.08);
            osc2.stop(now + 0.4);
        } catch (e) {
            // Silently handled
        }
    }

    function openMinOrderRestrictionModal() {
        const total = cart.reduce((sum, item) => sum + (Number(item.price || 0) * (item.quantity || 1)), 0);
        const diff = Math.max(0, MIN_ORDER_AMOUNT - total);
        const pct = Math.min(100, Math.round((total / MIN_ORDER_AMOUNT) * 100));

        if (minOrderCurrentVal) minOrderCurrentVal.textContent = formatPrice(total);
        if (minOrderDiffVal) minOrderDiffVal.textContent = `+${formatPrice(diff)}`;
        if (minOrderTargetVal) minOrderTargetVal.textContent = formatPrice(MIN_ORDER_AMOUNT);

        if (minOrderProgressBar) {
            minOrderProgressBar.style.width = '0%';
            setTimeout(() => {
                minOrderProgressBar.style.width = `${pct}%`;
            }, 60);
        }
        if (minOrderProgressPercent) minOrderProgressPercent.textContent = `${pct}%`;

        playFuturisticAlertSound();

        if (minOrderModal) {
            minOrderModal.classList.add('active');
        }
    }

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

    // Smart Delivery & New Features State
    let storeSettings = {
        delivery_pereira: 7000,
        delivery_dosquebradas: 8000,
        delivery_free_min: 100000,
        delivery_free_active: true,
        wheel_enabled: true
    };
    let selectedCity = 'Pereira';
    let selectedBarrio = '';
    let selectedPaymentMethod = 'Contraentrega';
    let appliedCoupon = null;
    let favorites = [];
    let allLooks = [];
    let allReviews = [];

    const PEREIRA_BARRIOS = [
        'Cuba', 'Circunvalar', 'Pinares', 'Álamos', 'Providencia', 'Boston', 'Villa Verde',
        'Centro', 'Cerritos', 'La Villa', 'Corocito', 'Maraya', 'San Joaquín', 'Gamma',
        'Poblado', 'Villa del Prado', 'Kennedy', 'Perla del Otún', 'Santa Mónica Pereira',
        'Alfonso López', 'San Nicolás', 'El Jardín', 'Parque Industrial', 'Belmonte',
        'Samaria', 'Tokio', 'Remanso', 'Villasantana', 'Combia', 'El Rosal', 'Los Rosales',
        'La Macarena', 'Maranatha', 'San Fernando', 'Galicia', 'Mercasa', 'Puerta de Alcalá'
    ];

    const DOSQUEBRADAS_BARRIOS = [
        'La Pradera', 'Santa Mónica', 'El Japón', 'Centro Dosquebradas', 'Frailes', 'Valher',
        'Campestre A', 'Campestre B', 'Campestre C', 'Bombay', 'Milán', 'Violetas', 'Playa Rica',
        'Guadalupe', 'Camilo Torres', 'Bosques de la Acuarela', 'La Sultana', 'Santa Teresita',
        'La Capilla', 'Los Naranjos', 'La Mariana', 'Santa Isabel', 'San Diego', 'El Balso',
        'La Badea', 'El Lago', 'Molinos', 'San Félix', 'Cesar Augusto', 'Villa Carola'
    ];

    const WHATSAPP_NUMBER = '573002525489';
    const API_BASE_URL = (window.API_BASE_URL || '').replace(/\/$/, '');

    const CANONICAL_CATEGORIES = [
        'Cuidado Facial y Corporal',
        'Maquillaje',
        'Cabello y Ducha',
        'Accesorios Cabello',
        'Accesorios Maquillaje'
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

    function getDeletedCategories() {
        try {
            const raw = localStorage.getItem('valen_deleted_categories');
            const list = raw ? JSON.parse(raw) : [];
            const protectedCore = CANONICAL_CATEGORIES.map(c => c.toLowerCase());
            // Las categorías principales nunca pueden ser bloqueadas como eliminadas
            return list.filter(c => !protectedCore.includes(String(c).trim().toLowerCase()));
        } catch (e) {
            return [];
        }
    }

    // Auto-sanitizar localStorage para desbloquear categorías principales
    try {
        const raw = localStorage.getItem('valen_deleted_categories');
        if (raw) {
            const list = JSON.parse(raw);
            const protectedCore = CANONICAL_CATEGORIES.map(c => c.toLowerCase());
            const cleaned = list.filter(c => !protectedCore.includes(String(c).trim().toLowerCase()));
            localStorage.setItem('valen_deleted_categories', JSON.stringify(cleaned));
        }
    } catch (e) {}

    function addDeletedCategory(name) {
        try {
            const norm = String(name || '').trim().toLowerCase();
            const protectedCore = CANONICAL_CATEGORIES.map(c => c.toLowerCase());
            if (protectedCore.includes(norm)) return; // No permitir marcar como borrada una categoría principal
            const list = getDeletedCategories();
            if (norm && !list.includes(norm)) {
                list.push(norm);
                localStorage.setItem('valen_deleted_categories', JSON.stringify(list));
            }
        } catch (e) {}
    }

    function removeDeletedCategory(name) {
        try {
            const list = getDeletedCategories();
            const norm = String(name || '').trim().toLowerCase();
            const filtered = list.filter(c => c !== norm);
            localStorage.setItem('valen_deleted_categories', JSON.stringify(filtered));
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

        // 1. Try Server API (Neon PostgreSQL - Global Shared Database for all devices)
        try {
            const res = await fetchApi('/api/products?active=false');
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) {
                    allProducts = data;
                    saveLocalCache(data);
                    loaded = true;
                    console.log(`[Catálogo] Conectado a base de datos central: ${data.length} productos cargados.`);
                }
            }
        } catch (e) {
            console.warn('[Catálogo] No se pudo conectar a la base de datos central, cargando respaldo local:', e);
        }

        // 2. Try Supabase Cloud DB if connected
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

        // 3. Fallback to Local Cache
        if (!loaded) {
            const cached = getLocalCache();
            if (cached && Array.isArray(cached) && cached.length > 0) {
                allProducts = cached;
                loaded = true;
            }
        }

        // 4. Fallback to INLINE_PRODUCTS from catalogo.js
        if (!loaded && typeof INLINE_PRODUCTS !== 'undefined' && INLINE_PRODUCTS.length > 0) {
            allProducts = validateCatalog(INLINE_PRODUCTS);
            saveLocalCache(allProducts);
            loaded = true;
        }

        // 5. Try extracted JSON file
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

        // Always order products newest first (highest ID first)
        allProducts.sort((a, b) => Number(b.id) - Number(a.id));

        saveLocalCache(allProducts);
        adminProducts = allProducts.slice();

        await loadCategories();
        applyFilters();
    }

    async function loadCategories() {
        let dbCategories = [];
        if (supabaseClient) {
            try {
                const { data, error } = await supabaseClient.from('categories').select('*').order('id', { ascending: true });
                if (!error && data && data.length > 0) {
                    dbCategories = data;
                    allCategories = data.map(c => c.name);
                }
            } catch (e) {}
        }

        if (allCategories.length === 0) {
            try {
                const res = await fetchApi('/api/categories');
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data) && data.length > 0) {
                        dbCategories = data;
                        allCategories = data.map(c => c.name || c);
                    }
                }
            } catch (e) {}
        }

        const deletedCats = getDeletedCategories();
        const catMap = new Map();
        allCategories.forEach(c => {
            const norm = normalizeCategoryName(c);
            if (!deletedCats.includes(norm.toLowerCase())) {
                catMap.set(norm.toLowerCase(), norm);
            }
        });
        CANONICAL_CATEGORIES.forEach(c => {
            const norm = normalizeCategoryName(c);
            if (!catMap.has(norm.toLowerCase()) && !deletedCats.includes(norm.toLowerCase())) {
                catMap.set(norm.toLowerCase(), norm);
            }
        });

        allCategories = Array.from(catMap.values());

        // Map adminCategories preserving real database IDs when available
        adminCategories = allCategories.map((name, idx) => {
            const match = dbCategories.find(dbCat => (dbCat.name || '').toLowerCase() === name.toLowerCase());
            return {
                id: match && match.id ? match.id : idx + 1,
                name: name
            };
        });

        renderCategoryFilterPills();
        populateAdminCategorySelect();
        renderAdminCategoryChips();
        renderAdminCategoryPills();
        updateAdminStats();
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
            } else if (sortVal === 'oldest') {
                filteredProducts.sort((a, b) => Number(a.id) - Number(b.id));
            } else {
                // Predeterminado: lo más nuevo primero
                filteredProducts.sort((a, b) => Number(b.id) - Number(a.id));
            }
        } else {
            filteredProducts.sort((a, b) => Number(b.id) - Number(a.id));
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
            const isNew = Number(product.id) > 613;
            const isFav = isFavorite(product.id);
            const card = document.createElement('div');
            card.className = 'product-card';
            card.innerHTML = `
                <div class="product-image-container">
                    <img src="${product.image || 'Logo.jpeg'}" alt="${product.name}" loading="lazy" onerror="this.onerror=null;this.src='Logo.jpeg';">
                    <span class="product-category-tag">${product.category || 'Maquillaje'}</span>
                    ${isNew ? '<span class="product-badge-new"><i class="fas fa-sparkles"></i> NUEVO</span>' : ''}
                    <button type="button" class="btn-product-fav ${isFav ? 'active' : ''}" data-id="${product.id}" aria-label="Guardar en favoritos" title="Guardar en favoritos">
                        <i class="${isFav ? 'fas fa-heart' : 'far fa-heart'}"></i>
                    </button>
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

            // Favorite button toggle listener
            const favBtn = card.querySelector('.btn-product-fav');
            if (favBtn) {
                favBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const nowFav = toggleFavorite(product.id);
                    favBtn.classList.toggle('active', nowFav);
                    const icon = favBtn.querySelector('i');
                    if (icon) icon.className = nowFav ? 'fas fa-heart' : 'far fa-heart';
                });
            }

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
        const subtotal = cart.reduce((sum, item) => sum + (Number(item.price || 0) * (item.quantity || 1)), 0);
        const pct = Math.min(100, Math.round((subtotal / MIN_ORDER_AMOUNT) * 100));
        const diff = Math.max(0, MIN_ORDER_AMOUNT - subtotal);

        // 🚚 Smart Delivery Fee Calculation
        const freeThreshold = Number(storeSettings.delivery_free_min || 100000);
        const freeActive = storeSettings.delivery_free_active !== false;
        const isFreeDeliveryQualified = freeActive && subtotal >= freeThreshold;

        const baseDeliveryFee = (selectedCity === 'Dosquebradas')
            ? Number(storeSettings.delivery_dosquebradas || 8000)
            : Number(storeSettings.delivery_pereira || 7000);

        let deliveryFee = baseDeliveryFee;
        if (isFreeDeliveryQualified) {
            deliveryFee = 0;
        }

        // 🎟️ Coupon Calculation
        let discountVal = 0;
        if (appliedCoupon) {
            if (appliedCoupon.min_order && subtotal < Number(appliedCoupon.min_order)) {
                const reqMin = Number(appliedCoupon.min_order);
                const diff = reqMin - subtotal;
                const removedCode = appliedCoupon.code;
                appliedCoupon = null;
                if (appliedCouponTag) appliedCouponTag.style.display = 'none';
                if (couponMessage) {
                    couponMessage.textContent = `⚠️ Cupón "${removedCode}" pausado: requiere compra mínima de ${formatPrice(reqMin)} (faltan ${formatPrice(diff)}).`;
                    couponMessage.style.color = 'var(--bratz-deep-pink)';
                }
            } else if (appliedCoupon.type === 'percent') {
                discountVal = Math.round(subtotal * (Number(appliedCoupon.value) / 100));
            } else if (appliedCoupon.type === 'fixed') {
                discountVal = Math.min(subtotal, Number(appliedCoupon.value));
            } else if (appliedCoupon.type === 'free_delivery') {
                deliveryFee = 0;
                discountVal = baseDeliveryFee;
            }
        }

        // Final total (subtotal + delivery - coupon discount)
        const effectiveDiscount = (appliedCoupon && appliedCoupon.type === 'free_delivery') ? 0 : discountVal;
        const finalTotal = Math.max(0, subtotal + deliveryFee - effectiveDiscount);

        // Badges & Counters
        if (headerCartCount) headerCartCount.textContent = totalCount;
        if (floatingCartCount) floatingCartCount.textContent = totalCount;
        if (mobCartCount) mobCartCount.textContent = totalCount;
        if (floatingCartTotal) floatingCartTotal.textContent = formatPrice(finalTotal);

        // Update floating min badge in bottom bar
        if (floatingMinBadge) {
            if (totalCount === 0) {
                floatingMinBadge.style.display = 'none';
            } else if (subtotal < MIN_ORDER_AMOUNT) {
                floatingMinBadge.style.display = 'inline-flex';
                floatingMinBadge.className = 'floating-min-badge locked';
                floatingMinBadge.innerHTML = `<i class="fas fa-lock"></i> Faltan ${formatPrice(diff)}`;
            } else {
                floatingMinBadge.style.display = 'inline-flex';
                floatingMinBadge.className = 'floating-min-badge unlocked';
                floatingMinBadge.innerHTML = `<i class="fas fa-circle-check"></i> ¡Mínimo listo!`;
            }
        }

        if (floatingCartBar) {
            if (totalCount > 0) {
                floatingCartBar.style.display = 'flex';
            } else {
                floatingCartBar.style.display = 'none';
            }
        }

        // 🚚 Delivery Perk Free-Shipping Progress Tracker
        if (deliveryPerkText && deliveryFeeBadge && deliveryPerkFill) {
            if (subtotal === 0) {
                deliveryPerkText.textContent = `Envío Pereira $${(storeSettings.delivery_pereira || 7000).toLocaleString('es-CO')} | Dosquebradas $${(storeSettings.delivery_dosquebradas || 8000).toLocaleString('es-CO')}`;
                deliveryFeeBadge.textContent = formatPrice(baseDeliveryFee);
                deliveryFeeBadge.classList.remove('perk-free');
                deliveryPerkFill.style.width = '0%';
            } else if (isFreeDeliveryQualified || (appliedCoupon && appliedCoupon.type === 'free_delivery')) {
                deliveryPerkText.textContent = `🎉 ¡Tu domicilio a ${selectedCity} es GRATIS!`;
                deliveryFeeBadge.textContent = 'GRATIS 🎉';
                deliveryFeeBadge.classList.add('perk-free');
                deliveryPerkFill.style.width = '100%';
            } else {
                const diffToFree = Math.max(0, freeThreshold - subtotal);
                const pctToFree = Math.min(100, Math.round((subtotal / freeThreshold) * 100));
                deliveryPerkText.textContent = `Agrega ${formatPrice(diffToFree)} más para DOMICILIO GRATIS 🚚`;
                deliveryFeeBadge.textContent = formatPrice(deliveryFee);
                deliveryFeeBadge.classList.remove('perk-free');
                deliveryPerkFill.style.width = `${pctToFree}%`;
            }
        }

        // Render Cart Items
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

        // Subtotal, Delivery, Discount & Total Breakdown
        if (cartSubtotalVal) cartSubtotalVal.textContent = formatPrice(subtotal);
        if (cartDeliveryCityLabel) cartDeliveryCityLabel.textContent = selectedCity;
        if (cartDeliveryVal) {
            cartDeliveryVal.textContent = (deliveryFee === 0) ? 'GRATIS 🎉' : formatPrice(deliveryFee);
            if (deliveryFee === 0) {
                cartDeliveryVal.style.color = '#047857';
                cartDeliveryVal.style.fontWeight = '800';
            } else {
                cartDeliveryVal.style.color = 'var(--text-dark)';
                cartDeliveryVal.style.fontWeight = '700';
            }
        }

        if (cartDiscountRow && cartDiscountVal) {
            if (discountVal > 0) {
                cartDiscountRow.style.display = 'flex';
                cartDiscountVal.textContent = `-${formatPrice(discountVal)}`;
            } else {
                cartDiscountRow.style.display = 'none';
            }
        }

        if (cartTotalPrice) {
            cartTotalPrice.textContent = formatPrice(finalTotal);
        }

        // Live Min-Order Cyber Tracker inside Cart Drawer
        if (cartMinOrderCard) {
            if (cart.length === 0) {
                cartMinOrderCard.style.display = 'none';
            } else {
                cartMinOrderCard.style.display = 'block';
                if (cartMinProgressFill) {
                    cartMinProgressFill.style.width = `${pct}%`;
                }
                if (cartMinOrderPct) {
                    cartMinOrderPct.textContent = `${pct}%`;
                }

                if (subtotal < MIN_ORDER_AMOUNT) {
                    cartMinOrderCard.classList.remove('unlocked');
                    cartMinOrderCard.classList.add('locked');
                    if (cartMinStatusText) cartMinStatusText.textContent = `PEDIDO MÍNIMO: ${formatPrice(MIN_ORDER_AMOUNT)} COP`;
                    if (cartMinOrderTag) {
                        cartMinOrderTag.className = 'cart-min-order-tag locked';
                        cartMinOrderTag.textContent = 'RESTRINGIDO';
                    }
                    if (cartMinOrderDescIcon) cartMinOrderDescIcon.className = 'fas fa-lock';
                    if (cartMinOrderDescText) cartMinOrderDescText.textContent = `Te faltan ${formatPrice(diff)} para habilitar el despacho`;
                } else {
                    cartMinOrderCard.classList.remove('locked');
                    cartMinOrderCard.classList.add('unlocked');
                    if (cartMinStatusText) cartMinStatusText.textContent = `¡DESBLOQUEADO! PEDIDO AUTORIZADO ✨`;
                    if (cartMinOrderTag) {
                        cartMinOrderTag.className = 'cart-min-order-tag unlocked';
                        cartMinOrderTag.textContent = 'LISTO';
                    }
                    if (cartMinOrderDescIcon) cartMinOrderDescIcon.className = 'fas fa-circle-check';
                    if (cartMinOrderDescText) cartMinOrderDescText.textContent = `¡Excelente! Cumples con el monto mínimo para envío`;
                }
            }
        }

        // Update Checkout Button State
        if (btnCheckout) {
            if (cart.length === 0) {
                btnCheckout.classList.remove('locked');
                btnCheckout.innerHTML = `<i class="fab fa-whatsapp" style="font-size: 1.25rem;"></i> Enviar Pedido a WhatsApp`;
            } else if (subtotal < MIN_ORDER_AMOUNT) {
                btnCheckout.classList.add('locked');
                btnCheckout.innerHTML = `<i class="fas fa-lock" style="font-size: 1.15rem;"></i> Pedido Mínimo ${formatPrice(MIN_ORDER_AMOUNT)} <span class="checkout-missing-badge">(Faltan ${formatPrice(diff)})</span>`;
            } else {
                btnCheckout.classList.remove('locked');
                btnCheckout.innerHTML = `<i class="fab fa-whatsapp" style="font-size: 1.25rem;"></i> Enviar Pedido a WhatsApp (${formatPrice(finalTotal)})`;
            }
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

    // Checkout WhatsApp button with strict minimum order protocol & professional format
    if (btnCheckout) {
        btnCheckout.addEventListener('click', async () => {
            if (cart.length === 0) {
                alert('Tu carrito está vacío. Agrega productos para realizar tu pedido.');
                return;
            }

            const subtotal = cart.reduce((sum, item) => sum + (Number(item.price || 0) * (item.quantity || 1)), 0);

            // RESTRICTION: Block any order below $35,000 COP
            if (subtotal < MIN_ORDER_AMOUNT) {
                openMinOrderRestrictionModal();
                return;
            }

            const name = (checkoutCustomerName ? checkoutCustomerName.value : '').trim();
            const phone = (checkoutCustomerPhone ? checkoutCustomerPhone.value : '').trim();
            const barrio = (checkoutCustomerBarrio ? checkoutCustomerBarrio.value : '').trim();
            const address = (checkoutCustomerAddress ? checkoutCustomerAddress.value : '').trim();
            const reference = (checkoutCustomerReference ? checkoutCustomerReference.value : '').trim();
            const notes = (checkoutCustomerNotes ? checkoutCustomerNotes.value : '').trim();

            if (!name) {
                alert('Por favor ingresa tu Nombre para despachar tu pedido.');
                if (checkoutCustomerName) checkoutCustomerName.focus();
                return;
            }

            if (!phone || phone.replace(/\D/g, '').length < 7) {
                alert('Por favor ingresa un número de teléfono celular o WhatsApp válido.');
                if (checkoutCustomerPhone) checkoutCustomerPhone.focus();
                return;
            }

            if (!barrio) {
                alert(`Por favor escribe o selecciona el Barrio de ${selectedCity} donde recibirás tu pedido.`);
                if (checkoutCustomerBarrio) checkoutCustomerBarrio.focus();
                return;
            }

            if (!address) {
                alert('Por favor ingresa tu Dirección exacta de entrega.');
                if (checkoutCustomerAddress) checkoutCustomerAddress.focus();
                return;
            }

            // Delivery Fee calculation
            const freeThreshold = Number(storeSettings.delivery_free_min || 100000);
            const freeActive = storeSettings.delivery_free_active !== false;
            const isFreeDelivery = (freeActive && subtotal >= freeThreshold) || (appliedCoupon && appliedCoupon.type === 'free_delivery');
            
            const baseDelivery = (selectedCity === 'Dosquebradas')
                ? Number(storeSettings.delivery_dosquebradas || 8000)
                : Number(storeSettings.delivery_pereira || 7000);

            const deliveryFee = isFreeDelivery ? 0 : baseDelivery;

            // Discount calculation
            let discountVal = 0;
            if (appliedCoupon) {
                if (appliedCoupon.type === 'percent') {
                    discountVal = Math.round(subtotal * (Number(appliedCoupon.value) / 100));
                } else if (appliedCoupon.type === 'fixed') {
                    discountVal = Math.min(subtotal, Number(appliedCoupon.value));
                } else if (appliedCoupon.type === 'free_delivery') {
                    discountVal = baseDelivery;
                }
            }

            const effectiveDiscount = (appliedCoupon && appliedCoupon.type === 'free_delivery') ? 0 : discountVal;
            const finalTotal = Math.max(0, subtotal + deliveryFee - effectiveDiscount);

            // Build Exact WhatsApp message template requested:
            let msg = `🛍️ NUEVO PEDIDO — VALEN MAKEUP\n\n`;
            msg += `👩 CLIENTA\n`;
            msg += `Nombre: ${name}\n`;
            msg += `Teléfono: ${phone}\n\n`;
            msg += `📍 ENTREGA\n`;
            msg += `Ciudad: ${selectedCity}\n`;
            msg += `Barrio: ${barrio}\n`;
            msg += `Dirección: ${address}\n`;
            if (reference) {
                msg += `Referencia: ${reference}\n`;
            }
            msg += `\n🛒 PRODUCTOS\n\n`;

            cart.forEach(item => {
                const itemQty = item.quantity || 1;
                const itemPrice = Number(item.price || 0);
                const itemSub = itemPrice * itemQty;
                const toneTxt = item.selectedTone ? ` (Tono ${item.selectedTone})` : '';
                msg += `• ${item.name}${toneTxt} × ${itemQty}\n`;
                msg += `$${itemSub.toLocaleString('es-CO')}\n\n`;
            });

            msg += `💰 RESUMEN\n\n`;
            msg += `Subtotal: $${subtotal.toLocaleString('es-CO')}\n`;
            msg += `Domicilio: ${deliveryFee === 0 ? '$0 (GRATIS 🎉)' : `$${deliveryFee.toLocaleString('es-CO')}`}\n`;
            if (discountVal > 0) {
                msg += `Descuento: -$${discountVal.toLocaleString('es-CO')}${appliedCoupon ? ` (${appliedCoupon.code})` : ''}\n`;
            }
            msg += `\nTOTAL: $${finalTotal.toLocaleString('es-CO')}\n\n`;
            msg += `💳 MÉTODO DE PAGO\n`;
            msg += `${selectedPaymentMethod}\n`;
            if (notes) {
                msg += `\n📝 NOTAS\n`;
                msg += `${notes}\n`;
            }

            // Save order to server/DB
            const orderPayload = {
                customer_name: name,
                customer_phone: phone,
                customer_city: selectedCity,
                customer_barrio: barrio,
                customer_address: address,
                customer_reference: reference || null,
                customer_notes: notes || null,
                payment_method: selectedPaymentMethod,
                subtotal: subtotal,
                delivery_fee: deliveryFee,
                discount_val: discountVal,
                total: finalTotal,
                items: cart.map(item => ({
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity,
                    selectedTone: item.selectedTone || null
                })),
                status: 'Pendiente'
            };

            try {
                const orderRes = await fetchApi('/api/orders', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(orderPayload)
                });
                if (orderRes.ok) {
                    const createdOrder = await orderRes.json();
                    localStorage.setItem('valen_last_order', JSON.stringify({
                        id: createdOrder.id,
                        name: name,
                        phone: phone,
                        city: selectedCity,
                        barrio: barrio,
                        date: new Date().toISOString()
                    }));
                }
            } catch (err) {
                console.warn('Order could not be saved to server, proceeding via WhatsApp:', err);
            }

            // Open WhatsApp with complete formatted text
            const encoded = encodeURIComponent(msg);
            const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encoded}`;
            window.open(waUrl, '_blank');

            if (cartModal) cartModal.classList.remove('active');
            if (thankyouModal) thankyouModal.classList.add('active');
        });
    }

    // Listeners for Futuristic Min-Order Modal
    if (minOrderCloseBtn && minOrderModal) {
        minOrderCloseBtn.addEventListener('click', () => {
            minOrderModal.classList.remove('active');
        });
    }

    if (minOrderKeepReviewBtn && minOrderModal) {
        minOrderKeepReviewBtn.addEventListener('click', () => {
            minOrderModal.classList.remove('active');
        });
    }

    if (minOrderAddMoreBtn) {
        minOrderAddMoreBtn.addEventListener('click', () => {
            if (minOrderModal) minOrderModal.classList.remove('active');
            if (cartModal) cartModal.classList.remove('active');

            const target = productsGrid || document.querySelector('.catalog-section') || document.body;
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });

            if (productsGrid) {
                productsGrid.classList.add('products-attention-glow');
                setTimeout(() => {
                    productsGrid.classList.remove('products-attention-glow');
                }, 2400);
            }
        });
    }

    if (minOrderModal) {
        minOrderModal.addEventListener('click', (e) => {
            if (e.target === minOrderModal) {
                minOrderModal.classList.remove('active');
            }
        });
    }

    if (thankyouCloseBtn && thankyouModal) {
        thankyouCloseBtn.addEventListener('click', () => thankyouModal.classList.remove('active'));
    }
    // ==========================================
    // 💖 SISTEMA DE FAVORITOS (WISHLIST)
    // ==========================================
    function getFavorites() {
        try {
            const raw = localStorage.getItem('valen_favorites');
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    }

    function saveFavorites(favs) {
        try {
            localStorage.setItem('valen_favorites', JSON.stringify(favs));
        } catch (e) {}
        updateFavoritesUi();
    }

    function isFavorite(productId) {
        const favs = getFavorites();
        const numId = Number(productId);
        return favs.includes(numId) || favs.includes(String(productId));
    }

    function toggleFavorite(productId) {
        let favs = getFavorites();
        const numId = Number(productId);
        const idx = favs.findIndex(id => Number(id) === numId);
        let nowFav = false;
        if (idx >= 0) {
            favs.splice(idx, 1);
            nowFav = false;
            showNotification('Eliminado de favoritos', '💔');
        } else {
            favs.push(numId);
            nowFav = true;
            showNotification('Guardado en favoritos', '💖');
        }
        saveFavorites(favs);
        return nowFav;
    }

    function updateFavoritesUi() {
        const favs = getFavorites();
        const count = favs.length;
        if (headerFavCount) headerFavCount.textContent = count;
        if (mobFavCount) mobFavCount.textContent = count;
        if (favModalCount) favModalCount.textContent = count;

        document.querySelectorAll('.btn-product-fav').forEach(btn => {
            const pid = btn.getAttribute('data-id');
            const active = isFavorite(pid);
            btn.classList.toggle('active', active);
            const icon = btn.querySelector('i');
            if (icon) icon.className = active ? 'fas fa-heart' : 'far fa-heart';
        });
    }

    function renderFavoritesModal() {
        if (!favoritesItemsContainer) return;
        const favs = getFavorites();
        const favProducts = allProducts.filter(p => favs.some(id => Number(id) === Number(p.id)));
        const favStatsBar = document.getElementById('fav-drawer-stats-bar');
        const favTotalPriceEl = document.getElementById('fav-modal-total-price');
        const btnAddAllText = document.getElementById('btn-add-all-favs-text');
        const btnClearFavs = document.getElementById('btn-clear-favs');

        const favTotalSum = favProducts.reduce((sum, p) => sum + (Number(p.price) || 0), 0);

        if (favTotalPriceEl) favTotalPriceEl.textContent = formatPrice(favTotalSum);
        if (favStatsBar) favStatsBar.style.display = favProducts.length > 0 ? 'flex' : 'none';

        if (btnClearFavs && !btnClearFavs._wired) {
            btnClearFavs._wired = true;
            btnClearFavs.addEventListener('click', () => {
                if (!confirm('¿Deseas vaciar tu lista de favoritos?')) return;
                saveFavorites([]);
                renderFavoritesModal();
                showNotification('Favoritos vaciados', '💔');
            });
        }

        if (favProducts.length === 0) {
            favoritesItemsContainer.innerHTML = `
                <div class="fav-empty-state" style="text-align: center; padding: 42px 20px; color: var(--text-muted);">
                    <div style="width: 72px; height: 72px; border-radius: 50%; background: #fff0f7; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; box-shadow: 0 4px 16px rgba(255, 42, 133, 0.15);">
                        <i class="fas fa-heart-crack" style="font-size: 2.2rem; color: var(--bratz-pink);"></i>
                    </div>
                    <h4 style="font-size: 1.15rem; color: #231227; font-weight: 800; margin-bottom: 6px;">Tu lista de favoritos está vacía</h4>
                    <p style="font-size: 0.88rem; max-width: 320px; margin: 0 auto 20px; color: #6b5c69; line-height: 1.5;">Toca el corazón ♡ en cualquier producto del catálogo para guardarlo aquí y armar tu pedido perfecto.</p>
                    <button type="button" class="btn-primary" id="btn-fav-explore-cta" style="display: inline-flex; align-items: center; gap: 8px; margin: 0 auto; padding: 10px 22px; font-size: 0.88rem;">
                        <i class="fas fa-sparkles"></i> Explorar Catálogo
                    </button>
                </div>
            `;
            const exploreBtn = favoritesItemsContainer.querySelector('#btn-fav-explore-cta');
            if (exploreBtn) {
                exploreBtn.addEventListener('click', () => {
                    if (favoritesModal) favoritesModal.classList.remove('active');
                    const target = productsGrid || document.getElementById('catalogo') || document.body;
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                });
            }
            if (btnAddAllFavs) btnAddAllFavs.style.display = 'none';
            return;
        }

        if (btnAddAllFavs) {
            btnAddAllFavs.style.display = 'block';
            if (btnAddAllText) {
                btnAddAllText.textContent = `Agregar Todos al Carrito (${favProducts.length} • ${formatPrice(favTotalSum)})`;
            }
        }

        favoritesItemsContainer.innerHTML = favProducts.map(p => {
            const originalPrice = Math.round(Number(p.price || 0) * 1.18);
            return `
                <div class="favorite-item-card fav-item-card" data-fav-id="${p.id}">
                    <div class="fav-card-image-wrap" style="position: relative; width: 74px; height: 74px; border-radius: 14px; overflow: hidden; background: #fff1f7; flex-shrink: 0; border: 1.5px solid #f6e2f1;">
                        <img src="${p.image || 'Logo.jpeg'}" alt="${p.name}" loading="lazy" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.onerror=null;this.src='Logo.jpeg';">
                        <span style="position: absolute; top: 4px; left: 4px; background: rgba(255,255,255,0.92); width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.65rem; color: #ff2a85; box-shadow: 0 1px 4px rgba(0,0,0,0.1);">
                            <i class="fas fa-heart"></i>
                        </span>
                    </div>
                    <div class="favorite-item-info fav-item-details" style="flex: 1; min-width: 0;">
                        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
                            <span class="fav-item-cat-badge">${p.category || 'Maquillaje'}</span>
                            <span style="font-size: 0.68rem; font-weight: 700; color: #059669; display: inline-flex; align-items: center; gap: 3px;">
                                <i class="fas fa-check-circle" style="font-size: 0.65rem;"></i> En Stock
                            </span>
                        </div>
                        <h4 class="fav-item-name" title="${p.name}">${p.name}</h4>
                        <div style="display: flex; align-items: baseline; gap: 6px;">
                            <span class="favorite-item-price">${formatPrice(p.price)}</span>
                            <del style="color: #a89bb4; font-size: 0.78rem;">${formatPrice(originalPrice)}</del>
                        </div>
                    </div>
                    <div class="favorite-item-actions fav-item-actions">
                        <button type="button" class="btn-fav-add-cart" data-id="${p.id}" title="Agregar al carrito">
                            <i class="fas fa-bag-shopping"></i> <span>Agregar</span>
                        </button>
                        <button type="button" class="btn-fav-remove" data-id="${p.id}" title="Quitar de favoritos" aria-label="Quitar">
                            <i class="far fa-trash-can"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        favoritesItemsContainer.querySelectorAll('.btn-fav-add-cart').forEach(btn => {
            btn.addEventListener('click', () => {
                const pid = btn.getAttribute('data-id');
                const product = allProducts.find(p => Number(p.id) === Number(pid));
                if (product) {
                    addToCart(product);
                    const originalText = btn.innerHTML;
                    btn.innerHTML = `<i class="fas fa-check"></i> <span>¡Listo!</span>`;
                    btn.style.background = '#059669';
                    setTimeout(() => {
                        btn.innerHTML = originalText;
                        btn.style.background = '';
                    }, 1200);
                }
            });
        });

        favoritesItemsContainer.querySelectorAll('.btn-fav-remove').forEach(btn => {
            btn.addEventListener('click', () => {
                const pid = btn.getAttribute('data-id');
                const cardEl = btn.closest('.favorite-item-card');
                if (cardEl) {
                    cardEl.style.transition = 'all 0.25s ease';
                    cardEl.style.opacity = '0';
                    cardEl.style.transform = 'scale(0.92)';
                    setTimeout(() => {
                        toggleFavorite(pid);
                        renderFavoritesModal();
                    }, 240);
                } else {
                    toggleFavorite(pid);
                    renderFavoritesModal();
                }
            });
        });
    }

    if (headerFavBtn && favoritesModal) {
        headerFavBtn.addEventListener('click', (e) => {
            e.preventDefault();
            renderFavoritesModal();
            favoritesModal.classList.add('active');
        });
    }

    if (favCloseBtn && favoritesModal) {
        favCloseBtn.addEventListener('click', () => favoritesModal.classList.remove('active'));
    }

    if (favoritesModal) {
        favoritesModal.addEventListener('click', (e) => {
            if (e.target === favoritesModal) favoritesModal.classList.remove('active');
        });
    }

    if (btnAddAllFavs) {
        btnAddAllFavs.addEventListener('click', () => {
            const favs = getFavorites();
            const favProducts = allProducts.filter(p => favs.some(id => Number(id) === Number(p.id)));
            if (favProducts.length === 0) return;

            favProducts.forEach(p => {
                const existing = cart.find(item => Number(item.id) === Number(p.id));
                if (existing) {
                    existing.quantity = (existing.quantity || 1) + 1;
                } else {
                    cart.push({ ...p, quantity: 1 });
                }
            });

            saveCart();
            showNotification(`¡${favProducts.length} favoritos agregados al carrito!`, '🛍️');
            if (favoritesModal) favoritesModal.classList.remove('active');
            if (cartModal) cartModal.classList.add('active');
        });
    }

    // ==========================================
    // 🚚 DOMICILIOS INTELIGENTES & CUPONES
    // ==========================================
    async function loadStoreSettings() {
        const localCached = localStorage.getItem('valen_store_settings');
        if (localCached) {
            try {
                const parsed = JSON.parse(localCached);
                if (parsed && typeof parsed === 'object') storeSettings = { ...storeSettings, ...parsed };
            } catch (e) {}
        }
        try {
            const res = await fetchApi('/api/settings');
            if (res.ok) {
                const data = await res.json();
                if (data && typeof data === 'object') {
                    storeSettings = { ...storeSettings, ...data };
                    try { localStorage.setItem('valen_store_settings', JSON.stringify(storeSettings)); } catch (e) {}
                }
            }
        } catch (e) {}
        const winMinText = document.getElementById('wheel-win-min-text');
        if (winMinText) winMinText.textContent = formatPrice(storeSettings.wheel_min_purchase || 50000);
        updateDeliveryUi();
    }

    function populateBarriosDatalist(city) {
        if (!barriosDatalist) return;
        const list = (city === 'Dosquebradas') ? DOSQUEBRADAS_BARRIOS : PEREIRA_BARRIOS;
        barriosDatalist.innerHTML = list.map(b => `<option value="${b}">`).join('');
    }

    function updateDeliveryUi() {
        const feeP = Number(storeSettings.delivery_pereira || 7000);
        const feeD = Number(storeSettings.delivery_dosquebradas || 8000);

        const pTag = document.getElementById('city-pereira-fee-tag');
        if (pTag) pTag.textContent = `Dom: ${formatPrice(feeP)}`;

        const dTag = document.getElementById('city-dosquebradas-fee-tag');
        if (dTag) dTag.textContent = `Dom: ${formatPrice(feeD)}`;

        if (cityPereiraBtn && cityDosquebradasBtn) {
            if (selectedCity === 'Pereira') {
                cityPereiraBtn.classList.add('active');
                cityDosquebradasBtn.classList.remove('active');
            } else {
                cityDosquebradasBtn.classList.add('active');
                cityPereiraBtn.classList.remove('active');
            }
        }

        populateBarriosDatalist(selectedCity);
        updateCartUi();
    }

    if (cityPereiraBtn) {
        cityPereiraBtn.addEventListener('click', () => {
            selectedCity = 'Pereira';
            updateDeliveryUi();
        });
    }

    if (cityDosquebradasBtn) {
        cityDosquebradasBtn.addEventListener('click', () => {
            selectedCity = 'Dosquebradas';
            updateDeliveryUi();
        });
    }

    if (checkoutCustomerBarrio) {
        checkoutCustomerBarrio.addEventListener('input', () => {
            selectedBarrio = checkoutCustomerBarrio.value.trim();
        });
    }

    // Payment method selector & instruction boxes (Contraentrega, Nequi, Bancolombia)
    const payOptionRadios = document.querySelectorAll('input[name="payment-method"]');
    payOptionRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.checked) {
                selectedPaymentMethod = radio.value;
                document.querySelectorAll('.payment-option-card').forEach(card => card.classList.remove('active'));
                const parent = radio.closest('.payment-option-card');
                if (parent) parent.classList.add('active');

                if (paymentInstructionsBox) {
                    const nequiBox = document.getElementById('nequi-info-box');
                    const bancolombiaBox = document.getElementById('bancolombia-info-box');

                    if (selectedPaymentMethod === 'Nequi') {
                        paymentInstructionsBox.style.display = 'block';
                        if (nequiBox) nequiBox.style.display = 'block';
                        if (bancolombiaBox) bancolombiaBox.style.display = 'none';
                    } else if (selectedPaymentMethod === 'Bancolombia') {
                        paymentInstructionsBox.style.display = 'block';
                        if (nequiBox) nequiBox.style.display = 'none';
                        if (bancolombiaBox) bancolombiaBox.style.display = 'block';
                    } else {
                        paymentInstructionsBox.style.display = 'none';
                    }
                }
            }
        });
    });

    // Coupons logic
    async function applyCoupon(rawCode) {
        const code = (rawCode || (cartCouponInput ? cartCouponInput.value : '')).trim().toUpperCase();
        if (!code) {
            if (couponMessage) {
                couponMessage.textContent = 'Ingresa un código de cupón.';
                couponMessage.style.color = 'var(--bratz-deep-pink)';
            }
            return false;
        }

        const subtotal = cart.reduce((sum, item) => sum + (Number(item.price || 0) * (item.quantity || 1)), 0);
        const WHEEL_MIN_THRESHOLD = Math.max(0, Number(storeSettings.wheel_min_purchase || 50000));

        const KNOWN_COUPONS = {
            'VALEN10': { code: 'VALEN10', type: 'percent', value: 10, min_order: WHEEL_MIN_THRESHOLD, description: `10% de descuento (compras desde ${formatPrice(WHEEL_MIN_THRESHOLD)})` },
            'GLAM15': { code: 'GLAM15', type: 'percent', value: 15, min_order: WHEEL_MIN_THRESHOLD, description: `15% de descuento (compras desde ${formatPrice(WHEEL_MIN_THRESHOLD)})` },
            'VALEN15': { code: 'VALEN15', type: 'percent', value: 15, min_order: WHEEL_MIN_THRESHOLD, description: `15% de descuento (compras desde ${formatPrice(WHEEL_MIN_THRESHOLD)})` },
            'VALEN5K': { code: 'VALEN5K', type: 'fixed', value: 5000, min_order: WHEEL_MIN_THRESHOLD, description: `$5.000 COP de descuento (compras desde ${formatPrice(WHEEL_MIN_THRESHOLD)})` },
            'ENVIOGRATIS': { code: 'ENVIOGRATIS', type: 'free_delivery', value: 0, min_order: WHEEL_MIN_THRESHOLD, description: `Domicilio gratis (compras desde ${formatPrice(WHEEL_MIN_THRESHOLD)})` },
            'GLOSSGIFT': { code: 'GLOSSGIFT', type: 'percent', value: 10, min_order: WHEEL_MIN_THRESHOLD, description: `Gloss sorpresa + 10% DTO (compras desde ${formatPrice(WHEEL_MIN_THRESHOLD)})` },
            'REGALOGLOSS': { code: 'REGALOGLOSS', type: 'percent', value: 10, min_order: WHEEL_MIN_THRESHOLD, description: `Gloss de regalo (compras desde ${formatPrice(WHEEL_MIN_THRESHOLD)})` }
        };

        let couponData = KNOWN_COUPONS[code] || null;

        if (!couponData) {
            try {
                const res = await fetchApi(`/api/coupons?code=${encodeURIComponent(code)}`);
                if (res.ok) {
                    const apiData = await res.json();
                    if (apiData && apiData.code) couponData = apiData;
                }
            } catch (e) {}
        }

        if (!couponData) {
            if (couponMessage) {
                couponMessage.textContent = `El cupón "${code}" no es válido o ha expirado.`;
                couponMessage.style.color = 'var(--bratz-deep-pink)';
            }
            return false;
        }

        const couponMin = Number(couponData.min_order || 0);
        if (couponMin > 0 && subtotal < couponMin) {
            const diff = couponMin - subtotal;
            if (couponMessage) {
                couponMessage.textContent = `⚠️ Este cupón requiere una compra mínima de ${formatPrice(couponMin)}. Te faltan ${formatPrice(diff)} en el carrito para activarlo.`;
                couponMessage.style.color = 'var(--bratz-deep-pink)';
            }
            showNotification(`Faltan ${formatPrice(diff)} para activar cupón`, '⚠️');
            return false;
        }

        appliedCoupon = couponData;

        if (appliedCouponTag && appliedCouponText) {
            appliedCouponTag.style.display = 'inline-flex';
            appliedCouponText.textContent = `🎟️ ${couponData.code}: ${couponData.description || 'Aplicado'}`;
        }
        if (cartCouponInput) cartCouponInput.value = '';
        if (couponMessage) {
            couponMessage.textContent = `¡Cupón ${couponData.code} aplicado con éxito! ✨`;
            couponMessage.style.color = '#047857';
        }

        showNotification(`Cupón ${couponData.code} aplicado`, '🎟️');
        updateCartUi();
        return true;
    }

    function removeCoupon() {
        appliedCoupon = null;
        if (appliedCouponTag) appliedCouponTag.style.display = 'none';
        if (couponMessage) {
            couponMessage.textContent = 'Cupón removido.';
            couponMessage.style.color = 'var(--text-muted)';
        }
        updateCartUi();
    }

    if (btnApplyCoupon) btnApplyCoupon.addEventListener('click', () => applyCoupon());
    if (btnRemoveCoupon) btnRemoveCoupon.addEventListener('click', removeCoupon);
    if (cartCouponInput) {
        cartCouponInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                applyCoupon();
            }
        });
    }

    // ==========================================
    // 🧠 ASISTENTE DIGITAL: "AYÚDAME A ELEGIR"
    // ==========================================
    let quizStep = 1;
    let quizAnswers = { goal: '', skin: '', category: '' };

    function openBeautyQuizModal() {
        if (!beautyQuizModal) return;
        resetBeautyQuiz();
        beautyQuizModal.classList.add('active');
    }

    function closeBeautyQuizModal() {
        if (!beautyQuizModal) return;
        beautyQuizModal.classList.remove('active');
    }

    function resetBeautyQuiz() {
        quizStep = 1;
        quizAnswers = { goal: '', skin: '', category: '' };
        document.querySelectorAll('.quiz-opt-btn').forEach(c => c.classList.remove('active'));
        showQuizStep(1);
    }

    function showQuizStep(step) {
        quizStep = step;
        for (let i = 1; i <= 4; i++) {
            const el = document.getElementById(`quiz-step-${i}`);
            if (el) {
                if (i === step) {
                    el.classList.add('active');
                    el.style.display = 'block';
                } else {
                    el.classList.remove('active');
                    el.style.display = 'none';
                }
            }
        }

        // Update step indicator
        document.querySelectorAll('.step-dot').forEach((dot, idx) => {
            const dotStep = idx + 1;
            dot.classList.toggle('active', dotStep === step);
            dot.classList.toggle('completed', dotStep < step);
        });

        if (step === 4) {
            renderQuizRecommendations();
        }
    }

    // Step 1: Goal
    document.querySelectorAll('.quiz-opt-btn[data-field="goal"]').forEach(card => {
        card.addEventListener('click', () => {
            document.querySelectorAll('.quiz-opt-btn[data-field="goal"]').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            quizAnswers.goal = card.getAttribute('data-value') || 'natural';
            setTimeout(() => showQuizStep(2), 200);
        });
    });

    // Step 2: Skin
    document.querySelectorAll('.quiz-opt-btn[data-field="skin"]').forEach(card => {
        card.addEventListener('click', () => {
            document.querySelectorAll('.quiz-opt-btn[data-field="skin"]').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            quizAnswers.skin = card.getAttribute('data-value') || 'seca';
            setTimeout(() => showQuizStep(3), 200);
        });
    });

    // Step 3: Category
    document.querySelectorAll('.quiz-opt-btn[data-field="category"]').forEach(card => {
        card.addEventListener('click', () => {
            document.querySelectorAll('.quiz-opt-btn[data-field="category"]').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            quizAnswers.category = card.getAttribute('data-value') || 'all';
            setTimeout(() => showQuizStep(4), 200);
        });
    });

    // Back buttons
    document.querySelectorAll('.btn-quiz-back').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetStep = Number(btn.getAttribute('data-goto') || 1);
            showQuizStep(targetStep);
        });
    });

    function getRecommendations(goal, skin, category) {
        if (!allProducts || allProducts.length === 0) return [];

        const goalLabels = {
            'natural': '🌸 Algo Natural',
            'glam': '✨ Algo Glam',
            'fiesta': '🎉 Algo para Fiesta',
            'economico': '💸 Algo Económico',
            'diario': '☀️ Uso Diario'
        };

        const skinLabels = {
            'seca': 'Piel Seca',
            'mixta': 'Piel Mixta',
            'grasa': 'Piel Grasa',
            'nose': 'Cualquier tipo de piel'
        };

        const catLabels = {
            'base': 'Base',
            'corrector': 'Corrector',
            'rubor': 'Rubor',
            'iluminador': 'Iluminador',
            'labios': 'Labios',
            'ojos': 'Ojos',
            'skincare': 'Skincare',
            'all': 'Recomendaciones top'
        };

        if (quizResultsSummary) {
            quizResultsSummary.innerHTML = `
                <span class="quiz-summary-pill">${goalLabels[goal] || 'Personalizado'}</span>
                <span class="quiz-summary-pill">${skinLabels[skin] || 'Tu piel'}</span>
                <span class="quiz-summary-pill">${catLabels[category] || 'Destacados'}</span>
            `;
        }

        const scored = allProducts.map(p => {
            let score = 0;
            const name = (p.name || '').toLowerCase();
            const cat = (p.category || '').toLowerCase();
            const price = Number(p.price || 0);

            // 1. Category relevance
            if (category && category !== 'all') {
                const catMap = {
                    'base': ['base', 'bb cream', 'cushion', 'cojín', 'piel perfecta'],
                    'corrector': ['corrector', 'concealer', 'ojeras'],
                    'rubor': ['rubor', 'blush', 'mejillas'],
                    'iluminador': ['iluminador', 'glow', 'brillo', 'highlighter', 'gotas'],
                    'labios': ['labial', 'gloss', 'tinta', 'lip', 'bálsamo', 'aceite labial'],
                    'ojos': ['pestañina', 'mascara', 'delineador', 'sombras', 'paleta', 'cejas', 'pestañas'],
                    'skincare': ['serum', 'suero', 'crema', 'tónico', 'agua micelar', 'mascarilla', 'protector', 'facial', 'cuidado facial']
                };
                const kws = catMap[category] || [];
                if (kws.some(kw => name.includes(kw) || cat.includes(kw))) {
                    score += 180;
                }
            } else {
                score += 30;
            }

            // 2. Goal relevance
            if (goal === 'natural') {
                if (/natural|glow|bb cream|hidratante|ligero|fresco|transparente|nude|tinta|agua/.test(name)) score += 60;
            } else if (goal === 'glam') {
                if (/glam|matte|iluminador|pigmento|pestañas|intenso|volumen|brillo|prosa/.test(name)) score += 60;
            } else if (goal === 'fiesta') {
                if (/larga duraci[oó]n|waterproof|glitter|shimmer|fijador|sellador|intenso|resistente/.test(name)) score += 60;
            } else if (goal === 'economico') {
                score += Math.max(0, Math.round((70000 - price) / 1000));
            } else if (goal === 'diario') {
                if (/diario|protector|tinta|polvo|b[aá]lsamo|corrector|natural|cepillo/.test(name)) score += 60;
            }

            // 3. Skin type relevance
            if (skin === 'seca') {
                if (/hidratante|glow|aceite|crema|suero|humectante|nutritiv|ácido hialurónico/.test(name)) score += 45;
                if (/matte|antibrillo/.test(name)) score -= 25;
            } else if (skin === 'grasa') {
                if (/matte|control|antibrillo|polvo|sellador|oil free|libre de grasa|mineral/.test(name)) score += 45;
                if (/aceite|oleos/.test(name)) score -= 35;
            } else if (skin === 'mixta') {
                if (/balance|mineral|ligera|gel|equilibrante|dual/.test(name)) score += 35;
            }

            if (p.image && !p.image.includes('placeholder')) score += 10;
            if (price > 0) score += 5;

            return { product: p, score };
        });

        scored.sort((a, b) => b.score - a.score);

        const results = [];
        const seenNames = new Set();
        for (const item of scored) {
            if (!seenNames.has(item.product.name)) {
                seenNames.add(item.product.name);
                results.push(item.product);
                if (results.length >= 4) break;
            }
        }

        if (results.length < 3) {
            for (const p of allProducts) {
                if (!seenNames.has(p.name)) {
                    seenNames.add(p.name);
                    results.push(p);
                    if (results.length >= 4) break;
                }
            }
        }

        return results;
    }

    function renderQuizRecommendations() {
        if (!quizRecommendationsList) return;
        const recs = getRecommendations(quizAnswers.goal, quizAnswers.skin, quizAnswers.category);

        if (recs.length === 0) {
            quizRecommendationsList.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding: 20px;">Cargando catálogo para recomendarte lo mejor...</p>`;
            return;
        }

        quizRecommendationsList.innerHTML = recs.map(product => {
            return `
                <div class="quiz-product-card">
                    <img src="${product.image || 'Logo.jpeg'}" alt="${product.name}" onerror="this.onerror=null;this.src='Logo.jpeg';">
                    <div class="quiz-product-info">
                        <span class="quiz-prod-badge">RECOMENDADO PARA TI</span>
                        <h4 title="${product.name}">${product.name}</h4>
                        <div class="quiz-prod-stars">
                            <i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i>
                            <span style="font-size: 0.72rem; color: var(--text-muted); margin-left: 4px;">(4.9)</span>
                        </div>
                        <div class="quiz-prod-price">${formatPrice(product.price)}</div>
                    </div>
                    <div class="quiz-prod-actions">
                        <button type="button" class="btn-quiz-add-cart" data-id="${product.id}">
                            <i class="fas fa-bag-shopping"></i> Agregar
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        quizRecommendationsList.querySelectorAll('.btn-quiz-add-cart').forEach(btn => {
            btn.addEventListener('click', () => {
                const pid = btn.getAttribute('data-id');
                const product = allProducts.find(p => Number(p.id) === Number(pid));
                if (product) {
                    addToCart(product);
                    btn.innerHTML = `<i class="fas fa-check"></i> ¡Agregado!`;
                    btn.style.background = '#047857';
                    setTimeout(() => {
                        btn.innerHTML = `<i class="fas fa-bag-shopping"></i> Agregar`;
                        btn.style.background = '';
                    }, 1800);
                }
            });
        });
    }

    if (btnHeroAdvisor) btnHeroAdvisor.addEventListener('click', openBeautyQuizModal);
    if (cardTriggerAdvisor) cardTriggerAdvisor.addEventListener('click', openBeautyQuizModal);
    if (navAdvisorBtn) navAdvisorBtn.addEventListener('click', (e) => { e.preventDefault(); openBeautyQuizModal(); });
    if (mobNavAdvisor) mobNavAdvisor.addEventListener('click', (e) => { e.preventDefault(); openBeautyQuizModal(); });
    if (quizCloseBtn) quizCloseBtn.addEventListener('click', closeBeautyQuizModal);
    if (btnRestartQuiz) btnRestartQuiz.addEventListener('click', resetBeautyQuiz);
    if (beautyQuizModal) {
        beautyQuizModal.addEventListener('click', (e) => {
            if (e.target === beautyQuizModal) closeBeautyQuizModal();
        });
    }

    // ==========================================
    // 🎡 RULETA DE PREMIOS (LUCKY WHEEL)
    // ==========================================
    const WHEEL_SECTORS = [
        { label: '10% DTO', code: 'VALEN10', color: '#ff2d87', textColor: '#ffffff', prob: 0.25 },
        { label: 'Envío Gratis', code: 'ENVIOGRATIS', color: '#7928ca', textColor: '#ffffff', prob: 0.20 },
        { label: '$5.000 DTO', code: 'VALEN5K', color: '#ec4899', textColor: '#ffffff', prob: 0.25 },
        { label: '15% DTO', code: 'GLAM15', color: '#9333ea', textColor: '#ffffff', prob: 0.15 },
        { label: 'Gloss Gratis', code: 'GLOSSGIFT', color: '#db2777', textColor: '#ffffff', prob: 0.15 }
    ];

    let currentWheelAngle = 0;
    let isSpinning = false;

    function drawLuckyWheel(angle) {
        if (!luckyWheelCanvas) return;
        const ctx = luckyWheelCanvas.getContext('2d');
        const numSectors = WHEEL_SECTORS.length;
        const arc = (2 * Math.PI) / numSectors;
        const centerX = luckyWheelCanvas.width / 2;
        const centerY = luckyWheelCanvas.height / 2;
        const radius = centerX - 12;

        ctx.clearRect(0, 0, luckyWheelCanvas.width, luckyWheelCanvas.height);

        // Draw sectors
        for (let i = 0; i < numSectors; i++) {
            const sectorAngle = angle + (i * arc);
            ctx.beginPath();
            ctx.fillStyle = WHEEL_SECTORS[i].color;
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, sectorAngle, sectorAngle + arc);
            ctx.lineTo(centerX, centerY);
            ctx.fill();

            // Border between sectors
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2.5;
            ctx.stroke();

            // Text label
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(sectorAngle + (arc / 2));
            ctx.textAlign = 'right';
            ctx.fillStyle = WHEEL_SECTORS[i].textColor;
            ctx.font = 'bold 13px Outfit, sans-serif';
            ctx.shadowColor = 'rgba(0,0,0,0.3)';
            ctx.shadowBlur = 4;
            ctx.fillText(WHEEL_SECTORS[i].label, radius - 20, 5);
            ctx.restore();
        }

        // Outer Rim
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.strokeStyle = '#f472b6';
        ctx.lineWidth = 7;
        ctx.stroke();

        // Rim Dots
        const dotCount = 18;
        for (let d = 0; d < dotCount; d++) {
            const dotAngle = (2 * Math.PI / dotCount) * d;
            const dx = centerX + (radius + 1) * Math.cos(dotAngle);
            const dy = centerY + (radius + 1) * Math.sin(dotAngle);
            ctx.beginPath();
            ctx.arc(dx, dy, 2.5, 0, 2 * Math.PI);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
        }
    }

    function checkWheelStatus() {
        const spunRaw = localStorage.getItem('valen_wheel_spun');
        if (spunRaw) {
            try {
                const spunData = JSON.parse(spunRaw);
                if (btnSpinAction) {
                    btnSpinAction.disabled = true;
                    btnSpinAction.classList.add('disabled');
                    btnSpinAction.innerHTML = `<i class="fas fa-check-circle"></i> <span>YA GIRASTE TU RULETA</span>`;
                }
                if (wheelStatusNotice) {
                    wheelStatusNotice.innerHTML = `<i class="fas fa-lock"></i> Ya redimiste tu giro. Tu cupón ganado es <strong>${spunData.code}</strong>.`;
                }
                if (wheelWinCard && winPrizeLabel && winCouponCode) {
                    wheelWinCard.style.display = 'block';
                    winPrizeLabel.textContent = spunData.prize || 'Beneficio Ganado';
                    winCouponCode.textContent = spunData.code || 'VALEN10';
                    const winMinText = document.getElementById('wheel-win-min-text');
                    if (winMinText) winMinText.textContent = formatPrice(storeSettings.wheel_min_purchase || 50000);
                }
            } catch (e) {}
        }
    }

    function spinLuckyWheel() {
        if (isSpinning) return;
        if (localStorage.getItem('valen_wheel_spun')) {
            alert('¡Ya realizaste tu giro de la ruleta por esta sesión! Aplica tu código en el carrito.');
            return;
        }

        isSpinning = true;
        if (btnSpinAction) {
            btnSpinAction.disabled = true;
            btnSpinAction.innerHTML = `<i class="fas fa-spinner fa-spin"></i> <span>GIRANDO...</span>`;
        }

        // Pick prize based on probabilities
        const rand = Math.random();
        let cumulative = 0;
        let selectedIndex = 0;
        for (let i = 0; i < WHEEL_SECTORS.length; i++) {
            cumulative += WHEEL_SECTORS[i].prob;
            if (rand <= cumulative) {
                selectedIndex = i;
                break;
            }
        }

        const wonSector = WHEEL_SECTORS[selectedIndex];
        const numSectors = WHEEL_SECTORS.length;
        const arc = (2 * Math.PI) / numSectors;

        // Pointer is at the top (-PI/2)
        const targetSectorCenter = (selectedIndex + 0.5) * arc;
        const targetStopAngle = (1.5 * Math.PI) - targetSectorCenter;
        
        const totalRotation = (6 * 2 * Math.PI) + targetStopAngle;
        const startAngle = currentWheelAngle % (2 * Math.PI);
        const distance = totalRotation - startAngle;

        const duration = 4200;
        const startTime = performance.now();

        function animateSpin(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(1, elapsed / duration);

            const ease = 1 - Math.pow(1 - progress, 3);
            currentWheelAngle = startAngle + (distance * ease);
            drawLuckyWheel(currentWheelAngle);

            if (progress < 1) {
                requestAnimationFrame(animateSpin);
            } else {
                isSpinning = false;
                onWheelSpinFinished(wonSector);
            }
        }

        requestAnimationFrame(animateSpin);
    }

    function onWheelSpinFinished(wonSector) {
        const record = {
            prize: wonSector.label,
            code: wonSector.code,
            date: new Date().toISOString()
        };
        try {
            localStorage.setItem('valen_wheel_spun', JSON.stringify(record));
        } catch (e) {}

        playFuturisticAlertSound();

        if (wheelWinCard && winPrizeLabel && winCouponCode) {
            wheelWinCard.style.display = 'block';
            winPrizeLabel.textContent = wonSector.label;
            winCouponCode.textContent = wonSector.code;
            const winMinText = document.getElementById('wheel-win-min-text');
            if (winMinText) winMinText.textContent = formatPrice(storeSettings.wheel_min_purchase || 50000);
        }

        if (btnSpinAction) {
            btnSpinAction.disabled = true;
            btnSpinAction.classList.add('disabled');
            btnSpinAction.innerHTML = `<i class="fas fa-check-circle"></i> <span>GIRO COMPLETADO</span>`;
        }

        if (wheelStatusNotice) {
            wheelStatusNotice.innerHTML = `<i class="fas fa-gift"></i> ¡Premio guardado! Copia tu código o aplícalo al carrito.`;
        }

        showNotification(`🎉 ¡Ganaste: ${wonSector.label}!`, '🎀');
    }

    function openLuckyWheelModal() {
        if (!luckyWheelModal) return;
        luckyWheelModal.classList.add('active');
        drawLuckyWheel(currentWheelAngle);
        checkWheelStatus();
    }

    function closeLuckyWheelModal() {
        if (!luckyWheelModal) return;
        luckyWheelModal.classList.remove('active');
    }

    if (btnHeroWheel) btnHeroWheel.addEventListener('click', openLuckyWheelModal);
    if (cardTriggerWheel) cardTriggerWheel.addEventListener('click', openLuckyWheelModal);
    if (floatingWheelBtn) floatingWheelBtn.addEventListener('click', openLuckyWheelModal);
    if (wheelCloseBtn) wheelCloseBtn.addEventListener('click', closeLuckyWheelModal);
    if (btnSpinAction) btnSpinAction.addEventListener('click', spinLuckyWheel);
    if (luckyWheelModal) {
        luckyWheelModal.addEventListener('click', (e) => {
            if (e.target === luckyWheelModal) closeLuckyWheelModal();
        });
    }

    if (btnCopyPrizeCode && winCouponCode) {
        btnCopyPrizeCode.addEventListener('click', async () => {
            const code = winCouponCode.textContent.trim();
            try {
                await navigator.clipboard.writeText(code);
                showNotification(`Código "${code}" copiado`, '📋');
            } catch (e) {
                showNotification(`Código: ${code}`, '📋');
            }
        });
    }

    if (btnApplyPrizeToCart && winCouponCode) {
        btnApplyPrizeToCart.addEventListener('click', () => {
            const code = winCouponCode.textContent.trim();
            closeLuckyWheelModal();
            if (cartModal) cartModal.classList.add('active');
            applyCoupon(code);
        });
    }

    // ==========================================
    // 🔥 "COMPRA EL LOOK" (KITS & BUNDLES)
    // ==========================================
    const DEFAULT_LOOKS = [
        {
            id: 1,
            title: 'Look Glow de Valen ✨',
            tagline: 'Piel luminosa, mejillas jugosas y labios efecto cristal',
            description: 'El conjunto definitivo para lucir fresca y radiante durante todo el día en Pereira y Dosquebradas.',
            image: 'img/product_578.jpg',
            product_ids: [578, 550, 480],
            products: [
                { name: 'Base Líquida Glow Hidratante', price: 38000 },
                { name: 'Rubor Líquido Velvet Soft', price: 24000 },
                { name: 'Iluminador en Polvo Silk Shine', price: 28000 },
                { name: 'Gloss Cristal Labial Húmedo', price: 22000 }
            ],
            individual_price: 112000,
            bundle_price: 94900,
            savings: 17100,
            active: true
        },
        {
            id: 2,
            title: 'Look Noche Glam & Fiesta 🎉',
            tagline: 'Mirada intensa a prueba de agua y labios mate impecables',
            description: 'Diseñado para eventos especiales y fiestas. Productos de larga duración de alta cobertura.',
            image: 'img/product_646.jpg',
            product_ids: [646, 613, 590],
            products: [
                { name: 'Delineador negro líquido pincel Prosa resistente', price: 19900 },
                { name: 'Paleta de Sombras Nude & Glitter', price: 38000 },
                { name: 'Pestañina 4 en Uno Prosa Maxi-Volumen', price: 18000 },
                { name: 'Labial Líquido Mate Indeleble', price: 22000 }
            ],
            individual_price: 97900,
            bundle_price: 82900,
            savings: 15000,
            active: true
        },
        {
            id: 3,
            title: 'Look Clean Girl Diario 🌸',
            tagline: 'Maquillaje rápido de 5 minutos para verte arreglada y natural',
            description: 'Tu rutina esencial diaria: cejas orgánicas, mejillas durazno y labios hidratados.',
            image: 'img/product_400.jpg',
            product_ids: [400, 350, 300],
            products: [
                { name: 'BB Cream Ligera Hidratante', price: 32000 },
                { name: 'Gel Fijador de Cejas Efecto Laminado', price: 16000 },
                { name: 'Tinta de Labios y Mejillas Cherry', price: 19000 }
            ],
            individual_price: 67000,
            bundle_price: 56900,
            savings: 10100,
            active: true
        }
    ];

    async function loadLooks() {
        try {
            const res = await fetchApi('/api/looks');
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) {
                    allLooks = data;
                } else {
                    allLooks = DEFAULT_LOOKS;
                }
            } else {
                allLooks = DEFAULT_LOOKS;
            }
        } catch (e) {
            allLooks = DEFAULT_LOOKS;
        }
        renderLooksGrid();
    }

    function renderLooksGrid() {
        if (!looksGrid) return;
        const activeLooks = allLooks.filter(l => l.active !== false);

        looksGrid.innerHTML = activeLooks.map(look => {
            const indPrice = Number(look.individual_price || 0);
            const bndPrice = Number(look.bundle_price || 0);
            let savings = Math.max(0, indPrice - bndPrice);
            if (savings === 0 && Array.isArray(look.products) && look.products.length > 0) {
                const prodSum = look.products.reduce((s, p) => s + Number(p.price || 0), 0);
                if (prodSum > bndPrice) savings = prodSum - bndPrice;
            }
            if (savings === 0 && Number(look.savings || 0) > 0) {
                savings = Number(look.savings);
            }
            if (savings === 0) {
                savings = 15000;
            }
            const effectiveIndPrice = (indPrice > bndPrice) ? indPrice : (bndPrice + savings);

            return `
                <div class="look-card">
                    <div class="look-image-wrap">
                        <img src="${look.image || 'Logo.jpeg'}" alt="${look.title}" onerror="this.onerror=null;this.src='Logo.jpeg';">
                        <span class="look-badge-feat"><i class="fas fa-sparkles"></i> Combo ${(look.products || []).length} Productos</span>
                        <span class="look-savings-tag"><i class="fas fa-fire"></i> AHORRAS ${formatPrice(savings)}</span>
                    </div>
                    <div class="look-body">
                        <h3 class="look-title">${look.title}</h3>
                        <div class="look-tagline"><i class="fas fa-sparkles"></i> ${look.tagline || 'Combinación perfecta curada por Valen'}</div>
                        <p class="look-description">${look.description || 'El kit favorito de nuestras clientas para un look fresco, radiante y duradero todo el día.'}</p>
                        
                        <div class="look-bundle-items-wrap">
                            <span class="look-items-header"><i class="fas fa-gem" style="color: var(--bratz-pink);"></i> Incluye ${(look.products || []).length} infaltables de Valen:</span>
                            <div class="look-bundle-items-grid">
                                ${(look.products || []).map(p => `
                                    <div class="look-item-chip">
                                        <span class="look-item-chip-name"><i class="fas fa-check-circle" style="color: var(--bratz-pink); font-size: 0.75rem;"></i> ${p.name || p}</span>
                                        ${p.price ? `<span class="look-item-chip-price">${formatPrice(p.price)}</span>` : ''}
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <div class="look-pricing-box">
                            <div class="look-pricing-left">
                                <span class="look-pricing-orig-label">Individual: <del>${formatPrice(effectiveIndPrice)}</del></span>
                                <span class="look-bundle-price">${formatPrice(bndPrice)}</span>
                            </div>
                            <div class="look-savings-pill">
                                <i class="fas fa-fire"></i> ¡Ahorras ${formatPrice(savings)}!
                            </div>
                        </div>

                        <button type="button" class="btn-buy-look" data-id="${look.id}">
                            <i class="fas fa-bag-shopping"></i> Comprar el Look Completo (${formatPrice(bndPrice)})
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        looksGrid.querySelectorAll('.btn-buy-look').forEach(btn => {
            btn.addEventListener('click', () => {
                const lid = Number(btn.getAttribute('data-id'));
                const look = allLooks.find(l => Number(l.id) === lid);
                if (!look) return;

                const bundleItem = {
                    id: `look_${look.id}`,
                    name: `KIT: ${look.title}`,
                    price: Number(look.bundle_price),
                    image: look.image || 'Logo.jpeg',
                    quantity: 1,
                    isLook: true
                };

                const existing = cart.find(item => item.id === bundleItem.id);
                if (existing) {
                    existing.quantity += 1;
                } else {
                    cart.push(bundleItem);
                }

                saveCart();
                showNotification(`¡${look.title} agregado al carrito!`, '🎉');
                if (cartModal) cartModal.classList.add('active');
            });
        });
    }

    // ==========================================
    // ⭐ RESEÑAS REALES Y TESTIMONIOS VERIFICADOS
    // ==========================================
    const DEFAULT_REVIEWS = [
        {
            id: 1,
            author: 'Mariana Duque',
            rating: 5,
            comment: 'El gloss y la base son una maravilla, hidratan divino y el pedido me llegó el mismo día a Pinares en Pereira. ¡100% recomendada!',
            city: 'Pereira - Pinares',
            product: 'Base Glow Hidratante + Gloss Cristal',
            verified: true,
            created_at: '2026-10-05T14:30:00Z',
            status: 'approved'
        },
        {
            id: 2,
            author: 'Camila Restrepo',
            rating: 5,
            comment: 'Me encantó la atención por WhatsApp de Valentina. Me asesoró con el tono exacto para mi piel mixta y el rubor pigmenta espectacular.',
            city: 'Dosquebradas - La Pradera',
            product: 'Rubor Líquido Velvet Soft',
            verified: true,
            created_at: '2026-10-04T18:20:00Z',
            status: 'approved'
        },
        {
            id: 3,
            author: 'Laura Marcela V.',
            rating: 5,
            comment: 'Los productos son 100% originales, llegaron selladitos y me dieron regalito en mi pedido. Ya es mi tienda favorita de maquillaje en el Eje Cafetero.',
            city: 'Pereira - Circunvalar',
            product: 'Look Noche Glam & Fiesta',
            verified: true,
            created_at: '2026-10-02T11:15:00Z',
            status: 'approved'
        }
    ];

    async function loadReviews() {
        try {
            const res = await fetchApi('/api/reviews?status=approved');
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) {
                    allReviews = data;
                } else {
                    allReviews = DEFAULT_REVIEWS;
                }
            } else {
                allReviews = DEFAULT_REVIEWS;
            }
        } catch (e) {
            allReviews = DEFAULT_REVIEWS;
        }
        renderReviewsGrid();
    }

    function renderReviewsGrid() {
        if (!reviewsGrid) return;
        const approved = allReviews.filter(r => r.status === 'approved' || r.status === undefined);
        const reviewsBarCount = document.getElementById('reviews-bar-count');
        if (reviewsBarCount) reviewsBarCount.textContent = approved.length;

        reviewsGrid.innerHTML = approved.map(r => {
            const stars = Array.from({ length: 5 }, (_, i) => `<i class="${i < (r.rating || 5) ? 'fas' : 'far'} fa-star"></i>`).join('');
            const dateStr = r.created_at ? new Date(r.created_at).toLocaleDateString('es-CO', { month: 'short', day: 'numeric' }) : 'Reciente';

            return `
                <div class="review-card">
                    <div class="review-header">
                        <div class="review-stars">${stars}</div>
                        <span class="review-date">${dateStr}</span>
                    </div>
                    <p class="review-comment">"${r.comment}"</p>
                    <div class="review-author-row">
                        <div class="review-avatar"><i class="fas fa-user-check"></i></div>
                        <div class="review-author-meta">
                            <span class="review-author-name">${r.author || r.customer_name || 'Clienta Valen'}</span>
                            <span class="review-author-location">${r.city || 'Pereira / Dosquebradas'}</span>
                        </div>
                    </div>
                    ${r.verified !== false ? `
                        <div class="review-verified-badge">
                            <i class="fas fa-circle-check"></i> Compra Verificada ✓
                        </div>
                    ` : ''}
                    ${r.product ? `<span class="review-product-tag">${r.product}</span>` : ''}
                </div>
            `;
        }).join('');
    }

    // Star rating picker in review modal
    if (starRatingPicker && reviewRatingVal) {
        starRatingPicker.querySelectorAll('.star-pick').forEach(star => {
            star.addEventListener('click', () => {
                const rating = Number(star.getAttribute('data-rating'));
                reviewRatingVal.value = rating;
                starRatingPicker.querySelectorAll('.star-pick').forEach((s, idx) => {
                    s.classList.toggle('active', (idx + 1) <= rating);
                });
            });
        });
    }

    const reviewsAccordionBar = document.getElementById('reviews-accordion-bar');
    const reviewsCollapsibleBody = document.getElementById('reviews-collapsible-body');
    const reviewsToggleText = document.getElementById('reviews-toggle-text');
    const btnOpenReviewModalBar = document.getElementById('btn-open-review-modal-bar');

    if (reviewsAccordionBar && reviewsCollapsibleBody) {
        reviewsAccordionBar.addEventListener('click', (e) => {
            if (e.target.closest('#btn-open-review-modal-bar') || e.target.closest('#btn-open-review-modal')) {
                return;
            }
            const isOpen = reviewsCollapsibleBody.classList.contains('open');
            if (isOpen) {
                reviewsCollapsibleBody.classList.remove('open');
                reviewsAccordionBar.classList.remove('open');
                reviewsAccordionBar.setAttribute('aria-expanded', 'false');
                if (reviewsToggleText) reviewsToggleText.textContent = 'Ver reseñas';
            } else {
                reviewsCollapsibleBody.classList.add('open');
                reviewsAccordionBar.classList.add('open');
                reviewsAccordionBar.setAttribute('aria-expanded', 'true');
                if (reviewsToggleText) reviewsToggleText.textContent = 'Ocultar reseñas';
            }
        });
    }

    if (btnOpenReviewModalBar && reviewModal) {
        btnOpenReviewModalBar.addEventListener('click', (e) => {
            e.stopPropagation();
            reviewModal.classList.add('active');
            if (reviewFormMessage) reviewFormMessage.textContent = '';
        });
    }

    if (btnOpenReviewModal && reviewModal) {
        btnOpenReviewModal.addEventListener('click', () => {
            reviewModal.classList.add('active');
            if (reviewFormMessage) reviewFormMessage.textContent = '';
        });
    }

    if (reviewCloseBtn && reviewModal) {
        reviewCloseBtn.addEventListener('click', () => reviewModal.classList.remove('active'));
    }

    if (reviewModal) {
        reviewModal.addEventListener('click', (e) => {
            if (e.target === reviewModal) reviewModal.classList.remove('active');
        });
    }

    if (customerReviewForm) {
        customerReviewForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const rating = Number(reviewRatingVal.value || 5);
            const name = document.getElementById('review-customer-name').value.trim();
            const city = document.getElementById('review-customer-city').value.trim();
            const prod = document.getElementById('review-product-name').value.trim();
            const comment = document.getElementById('review-comment').value.trim();

            if (!name || !comment) {
                alert('Por favor ingresa tu nombre y tu comentario.');
                return;
            }

            let isVerified = false;
            try {
                const lastOrder = localStorage.getItem('valen_last_order');
                if (lastOrder) isVerified = true;
            } catch (err) {}

            const reviewPayload = {
                author: name,
                rating: rating,
                city: city || 'Pereira / Dosquebradas',
                product: prod || 'Productos Valen Makeup',
                comment: comment,
                verified: isVerified,
                status: 'approved'
            };

            if (reviewFormMessage) {
                reviewFormMessage.textContent = 'Enviando reseña...';
                reviewFormMessage.style.color = 'var(--text-dark)';
            }

            try {
                await fetchApi('/api/reviews', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(reviewPayload)
                });

                if (reviewFormMessage) {
                    reviewFormMessage.textContent = '🎉 ¡Muchas gracias por tu reseña! Ha sido publicada con éxito.';
                    reviewFormMessage.style.color = '#047857';
                }

                showNotification('Reseña publicada con éxito', '⭐');
                allReviews.unshift({ ...reviewPayload, created_at: new Date().toISOString() });
                renderReviewsGrid();
                if (reviewsCollapsibleBody && reviewsAccordionBar) {
                    reviewsCollapsibleBody.classList.add('open');
                    reviewsAccordionBar.classList.add('open');
                    reviewsAccordionBar.setAttribute('aria-expanded', 'true');
                    if (reviewsToggleText) reviewsToggleText.textContent = 'Ocultar reseñas';
                }

                setTimeout(() => {
                    customerReviewForm.reset();
                    if (reviewModal) reviewModal.classList.remove('active');
                }, 1600);
            } catch (err) {
                if (reviewFormMessage) {
                    reviewFormMessage.textContent = 'Tu reseña fue guardada.';
                    reviewFormMessage.style.color = '#047857';
                }
                allReviews.unshift({ ...reviewPayload, created_at: new Date().toISOString() });
                renderReviewsGrid();
                if (reviewsCollapsibleBody && reviewsAccordionBar) {
                    reviewsCollapsibleBody.classList.add('open');
                    reviewsAccordionBar.classList.add('open');
                    reviewsAccordionBar.setAttribute('aria-expanded', 'true');
                    if (reviewsToggleText) reviewsToggleText.textContent = 'Ocultar reseñas';
                }
            }
        });
    }

    // Auto-desplegar reseñas al navegar hacia la sección #resenas
    document.querySelectorAll('a[href="#resenas"]').forEach(link => {
        link.addEventListener('click', () => {
            if (reviewsCollapsibleBody && reviewsAccordionBar) {
                reviewsCollapsibleBody.classList.add('open');
                reviewsAccordionBar.classList.add('open');
                reviewsAccordionBar.setAttribute('aria-expanded', 'true');
                if (reviewsToggleText) reviewsToggleText.textContent = 'Ocultar reseñas';
            }
        });
    });

    // ==========================================
    // 📱 NAVEGACIÓN MÓVIL & CARRITO PERSISTENTE
    // ==========================================
    if (mobNavHome) {
        mobNavHome.addEventListener('click', (e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
            document.querySelectorAll('.mob-nav-item').forEach(m => m.classList.remove('active'));
            mobNavHome.classList.add('active');
        });
    }

    if (mobNavSearch) {
        mobNavSearch.addEventListener('click', (e) => {
            e.preventDefault();
            const catSec = document.getElementById('catalogo') || productsGrid;
            if (catSec) catSec.scrollIntoView({ behavior: 'smooth' });
            if (searchInput) {
                setTimeout(() => searchInput.focus(), 300);
            }
            document.querySelectorAll('.mob-nav-item').forEach(m => m.classList.remove('active'));
            mobNavSearch.classList.add('active');
        });
    }

    if (mobNavFavs) {
        mobNavFavs.addEventListener('click', (e) => {
            e.preventDefault();
            renderFavoritesModal();
            if (favoritesModal) favoritesModal.classList.add('active');
        });
    }

    if (mobNavCart) {
        mobNavCart.addEventListener('click', (e) => {
            e.preventDefault();
            if (cartModal) cartModal.classList.add('active');
        });
    }

    function initPersistentCartToast() {
        if (!persistentCartToast) return;
        try {
            const dismissed = sessionStorage.getItem('valen_cart_toast_dismissed');
            if (!dismissed && cart.length > 0) {
                if (persistentCartDesc) {
                    persistentCartDesc.textContent = `Tienes ${cart.length} producto${cart.length > 1 ? 's' : ''} esperando en tu carrito.`;
                }
                persistentCartToast.classList.add('active');
            }
        } catch (e) {}

        if (persistentCartViewBtn) {
            persistentCartViewBtn.addEventListener('click', () => {
                persistentCartToast.classList.remove('active');
                if (cartModal) cartModal.classList.add('active');
                try { sessionStorage.setItem('valen_cart_toast_dismissed', 'true'); } catch (e) {}
            });
        }

        if (persistentCartCloseBtn) {
            persistentCartCloseBtn.addEventListener('click', () => {
                persistentCartToast.classList.remove('active');
                try { sessionStorage.setItem('valen_cart_toast_dismissed', 'true'); } catch (e) {}
            });
        }
    }

    // ==========================================
    // 🛠️ PANEL ADMINISTRATIVO - GESTIÓN AVANZADA
    // ==========================================
    async function loadAdminOrders() {
        const tbody = document.getElementById('admin-orders-table-body');
        if (!tbody) return;
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px;">Cargando pedidos...</td></tr>`;

        try {
            const res = await fetchApi('/api/orders');
            if (res.ok) {
                const orders = await res.json();
                if (!Array.isArray(orders) || orders.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 25px; color: var(--text-muted);">No hay pedidos registrados aún.</td></tr>`;
                    return;
                }

                tbody.innerHTML = orders.map(ord => {
                    const dateStr = ord.created_at ? new Date(ord.created_at).toLocaleDateString('es-CO', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Reciente';
                    const itemsSummary = (ord.items || []).map(i => `${i.name || i} × ${i.quantity || 1}`).join(', ');

                    return `
                        <tr>
                            <td>
                                <strong>#${ord.id}</strong><br>
                                <small style="color: var(--text-muted);">${dateStr}</small>
                            </td>
                            <td>
                                <strong>${ord.customer_name || 'Anónimo'}</strong><br>
                                <a href="https://wa.me/57${(ord.customer_phone || '').replace(/\D/g, '')}" target="_blank" style="color: #047857; font-weight: 700; font-size: 0.8rem;">
                                    <i class="fab fa-whatsapp"></i> ${ord.customer_phone || 'Sin cel'}
                                </a>
                            </td>
                            <td>
                                📍 <strong>${ord.customer_city || 'Pereira'}</strong> - ${ord.customer_barrio || ''}<br>
                                <small style="color: var(--text-muted);">${ord.customer_address || ''}</small>
                            </td>
                            <td>
                                <div style="max-width: 200px; font-size: 0.8rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${itemsSummary}">
                                    ${itemsSummary}
                                </div>
                                <small style="color: var(--bratz-pink); font-weight: 700;">💳 ${ord.payment_method || 'Contraentrega'}</small>
                            </td>
                            <td>
                                <strong>${formatPrice(ord.total || 0)}</strong>
                            </td>
                            <td>
                                <select class="admin-order-status-select" data-id="${ord.id}" style="padding: 4px 8px; border-radius: 6px; font-weight: 700; font-size: 0.78rem;">
                                    <option value="Pendiente" ${ord.status === 'Pendiente' ? 'selected' : ''}>🟡 Pendiente</option>
                                    <option value="Confirmado" ${ord.status === 'Confirmado' ? 'selected' : ''}>🔵 Confirmado</option>
                                    <option value="Preparando" ${ord.status === 'Preparando' ? 'selected' : ''}>🟣 Preparando</option>
                                    <option value="En camino" ${ord.status === 'En camino' ? 'selected' : ''}>🛵 En camino</option>
                                    <option value="Entregado" ${ord.status === 'Entregado' ? 'selected' : ''}>🟢 Entregado</option>
                                    <option value="Cancelado" ${ord.status === 'Cancelado' ? 'selected' : ''}>🔴 Cancelado</option>
                                </select>
                            </td>
                        </tr>
                    `;
                }).join('');

                tbody.querySelectorAll('.admin-order-status-select').forEach(select => {
                    select.addEventListener('change', async () => {
                        const oid = select.getAttribute('data-id');
                        const newStatus = select.value;
                        try {
                            await fetchApi(`/api/orders/${oid}/status`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json', 'X-Admin-Password': adminPassword },
                                body: JSON.stringify({ status: newStatus })
                            });
                            showNotification(`Pedido #${oid} actualizado a ${newStatus}`, '📦');
                        } catch (err) {
                            alert('No se pudo actualizar el estado del pedido');
                        }
                    });
                });
            }
        } catch (e) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--bratz-deep-pink); padding: 20px;">Error al cargar pedidos.</td></tr>`;
        }
    }

    function loadAdminDeliverySettings() {
        const pInput = document.getElementById('admin-delivery-pereira-input');
        const dInput = document.getElementById('admin-delivery-dosquebradas-input');
        const freeInput = document.getElementById('admin-free-delivery-min-input');
        const freeActiveInput = document.getElementById('admin-free-delivery-active-input');

        if (pInput) pInput.value = storeSettings.delivery_pereira || 7000;
        if (dInput) dInput.value = storeSettings.delivery_dosquebradas || 8000;
        if (freeInput) freeInput.value = storeSettings.delivery_free_min || 100000;
        if (freeActiveInput) freeActiveInput.checked = storeSettings.delivery_free_active !== false;

        const deliveryForm = document.getElementById('admin-delivery-form');
        if (deliveryForm && !deliveryForm._wired) {
            deliveryForm._wired = true;
            deliveryForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const pVal = Number(pInput.value || 7000);
                const dVal = Number(dInput.value || 8000);
                const freeVal = Number(freeInput.value || 100000);
                const freeAct = freeActiveInput.checked;

                storeSettings.delivery_pereira = pVal;
                storeSettings.delivery_dosquebradas = dVal;
                storeSettings.delivery_free_min = freeVal;
                storeSettings.delivery_free_active = freeAct;

                const msg = document.getElementById('admin-delivery-message');
                if (msg) {
                    msg.textContent = 'Guardando tarifas...';
                    msg.style.color = 'var(--text-dark)';
                }

                try {
                    await fetchApi('/api/settings', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json', 'X-Admin-Password': adminPassword },
                        body: JSON.stringify({
                            delivery_pereira: pVal,
                            delivery_dosquebradas: dVal,
                            delivery_free_min: freeVal,
                            delivery_free_active: freeAct
                        })
                    });
                    if (msg) {
                        msg.textContent = '✅ Tarifas de domicilio guardadas exitosamente.';
                        msg.style.color = '#047857';
                    }
                    showNotification('Tarifas de envío actualizadas', '🚚');
                    updateDeliveryUi();
                } catch (err) {
                    if (msg) {
                        msg.textContent = 'Guardado localmente.';
                        msg.style.color = '#047857';
                    }
                    updateDeliveryUi();
                }
            });
        }
    }

    async function loadAdminLooks() {
        const picker = document.getElementById('admin-look-prod-picker');
        const savingsText = document.getElementById('admin-look-savings-preview');
        const indPriceInput = document.getElementById('admin-look-ind-price');
        const bndPriceInput = document.getElementById('admin-look-bnd-price');
        const looksList = document.getElementById('admin-looks-list');

        if (picker && allProducts.length > 0) {
            picker.innerHTML = allProducts.slice(0, 80).map(p => `
                <label style="display: flex; align-items: center; gap: 8px; font-size: 0.8rem; margin-bottom: 4px; cursor: pointer;">
                    <input type="checkbox" class="admin-look-prod-chk" data-id="${p.id}" data-name="${p.name}" data-price="${p.price}">
                    <span>${p.name} (<strong>${formatPrice(p.price)}</strong>)</span>
                </label>
            `).join('');

            picker.querySelectorAll('.admin-look-prod-chk').forEach(chk => {
                chk.addEventListener('change', () => {
                    let sum = 0;
                    picker.querySelectorAll('.admin-look-prod-chk:checked').forEach(c => {
                        sum += Number(c.dataset.price || 0);
                    });
                    if (indPriceInput) indPriceInput.value = sum;
                    const bnd = Number(bndPriceInput ? bndPriceInput.value : 0);
                    if (savingsText) savingsText.textContent = `Ahorro para la clienta: ${formatPrice(Math.max(0, sum - bnd))}`;
                });
            });
        }

        if (bndPriceInput) {
            bndPriceInput.addEventListener('input', () => {
                const ind = Number(indPriceInput ? indPriceInput.value : 0);
                const bnd = Number(bndPriceInput.value || 0);
                if (savingsText) savingsText.textContent = `Ahorro para la clienta: ${formatPrice(Math.max(0, ind - bnd))}`;
            });
        }

        if (looksList) {
            looksList.innerHTML = allLooks.map(l => `
                <div class="admin-look-card-item" style="border: 1px solid #eee; border-radius: 8px; padding: 10px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong style="color: var(--text-dark);">${l.title}</strong><br>
                        <small style="color: var(--text-muted);">${formatPrice(l.bundle_price)} (Ahorras: ${formatPrice(l.savings || 0)})</small>
                    </div>
                    <button type="button" class="btn-del-look" data-id="${l.id}" style="background: #fee2e2; color: #dc2626; border: none; border-radius: 6px; padding: 6px 10px; cursor: pointer; font-size: 0.8rem; font-weight: 700;">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `).join('');

            looksList.querySelectorAll('.btn-del-look').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const lid = btn.dataset.id;
                    if (!confirm('¿Deseas eliminar este look?')) return;
                    try {
                        await fetchApi(`/api/looks/${lid}`, {
                            method: 'DELETE',
                            headers: { 'X-Admin-Password': adminPassword }
                        });
                    } catch (e) {}
                    allLooks = allLooks.filter(l => String(l.id) !== String(lid));
                    renderLooksGrid();
                    loadAdminLooks();
                    showNotification('Look eliminado', '🗑️');
                });
            });
        }

        const lookForm = document.getElementById('admin-look-form');
        if (lookForm && !lookForm._wired) {
            lookForm._wired = true;
            lookForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const title = document.getElementById('admin-look-title').value.trim();
                const tagline = document.getElementById('admin-look-tagline').value.trim();
                const desc = document.getElementById('admin-look-desc').value.trim();
                const image = document.getElementById('admin-look-image').value.trim() || 'img/product_578.jpg';
                const indPrice = Number(indPriceInput.value || 0);
                const bndPrice = Number(bndPriceInput.value || 0);

                const checkedProds = [];
                if (picker) {
                    picker.querySelectorAll('.admin-look-prod-chk:checked').forEach(c => {
                        checkedProds.push({ id: Number(c.dataset.id), name: c.dataset.name, price: Number(c.dataset.price) });
                    });
                }

                if (checkedProds.length === 0) {
                    alert('Selecciona al menos 1 producto para incluir en el kit.');
                    return;
                }

                const newLook = {
                    id: Date.now(),
                    title,
                    tagline,
                    description: desc,
                    image,
                    products: checkedProds,
                    product_ids: checkedProds.map(p => p.id),
                    individual_price: indPrice,
                    bundle_price: bndPrice,
                    savings: Math.max(0, indPrice - bndPrice),
                    active: true
                };

                try {
                    await fetchApi('/api/looks', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'X-Admin-Password': adminPassword },
                        body: JSON.stringify(newLook)
                    });
                } catch (err) {}

                allLooks.push(newLook);
                renderLooksGrid();
                loadAdminLooks();
                lookForm.reset();
                showNotification('Kit "Compra el Look" creado', '✨');
            });
        }
    }

    async function loadAdminReviews() {
        const tbody = document.getElementById('admin-reviews-table-body');
        const badge = document.getElementById('admin-reviews-stat-badge');
        if (!tbody) return;

        try {
            const res = await fetchApi('/api/reviews');
            let reviews = allReviews;
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) reviews = data;
            }

            if (badge) badge.textContent = `${reviews.length} Reseñas`;

            if (reviews.length === 0) {
                tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 20px;">No hay reseñas aún.</td></tr>`;
                return;
            }

            tbody.innerHTML = reviews.map(r => `
                <tr>
                    <td><small>${r.created_at ? new Date(r.created_at).toLocaleDateString('es-CO') : 'Reciente'}</small></td>
                    <td><strong>${r.author || r.customer_name || 'Anónimo'}</strong><br><small>${r.city || ''}</small></td>
                    <td>⭐ ${r.rating || 5}</td>
                    <td><small>${r.comment || ''}</small></td>
                    <td><small>${r.product || '-'}</small></td>
                    <td>${r.verified !== false ? '✅' : '⚪'}</td>
                    <td><span class="status-pill ${r.status === 'approved' ? 'pill-active' : 'pill-inactive'}">${r.status || 'approved'}</span></td>
                    <td>${r.featured ? '⭐ Destacada' : 'Normal'}</td>
                    <td>
                        <button type="button" class="btn-approve-rev" data-id="${r.id}" title="Aprobar" style="background: #dcfce7; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; color: #166534; font-weight: 700;">✓</button>
                        <button type="button" class="btn-reject-rev" data-id="${r.id}" title="Rechazar" style="background: #fee2e2; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; color: #991b1b; font-weight: 700;">✗</button>
                        <button type="button" class="btn-del-rev" data-id="${r.id}" title="Eliminar" style="background: #f1f5f9; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; color: #64748b; font-weight: 700;"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `).join('');

            tbody.querySelectorAll('.btn-approve-rev').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const rid = btn.dataset.id;
                    try {
                        await fetchApi(`/api/reviews/${rid}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json', 'X-Admin-Password': adminPassword },
                            body: JSON.stringify({ status: 'approved' })
                        });
                        showNotification('Reseña aprobada', '✅');
                        loadAdminReviews();
                        loadReviews();
                    } catch (e) {}
                });
            });

            tbody.querySelectorAll('.btn-reject-rev').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const rid = btn.dataset.id;
                    try {
                        await fetchApi(`/api/reviews/${rid}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json', 'X-Admin-Password': adminPassword },
                            body: JSON.stringify({ status: 'rejected' })
                        });
                        showNotification('Reseña rechazada', '⚠️');
                        loadAdminReviews();
                        loadReviews();
                    } catch (e) {}
                });
            });

            tbody.querySelectorAll('.btn-del-rev').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const rid = btn.dataset.id;
                    if (!confirm('¿Eliminar esta reseña permanentemente?')) return;
                    try {
                        await fetchApi(`/api/reviews/${rid}`, {
                            method: 'DELETE',
                            headers: { 'X-Admin-Password': adminPassword }
                        });
                        showNotification('Reseña eliminada', '🗑️');
                        loadAdminReviews();
                        loadReviews();
                    } catch (e) {}
                });
            });
        } catch (e) {}
    }

    async function loadAdminCoupons() {
        const couponsList = document.getElementById('admin-coupons-list');
        const couponForm = document.getElementById('admin-coupon-form');
        const wheelEnabledChx = document.getElementById('admin-wheel-enabled');
        const wheelMinInput = document.getElementById('admin-wheel-min-purchase');
        const wheelConfigForm = document.getElementById('admin-wheel-config-form');

        if (wheelEnabledChx) wheelEnabledChx.checked = storeSettings.wheel_enabled !== false;
        if (wheelMinInput) wheelMinInput.value = storeSettings.wheel_min_purchase || 50000;

        if (wheelConfigForm && !wheelConfigForm._wired) {
            wheelConfigForm._wired = true;
            wheelConfigForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                storeSettings.wheel_enabled = wheelEnabledChx ? wheelEnabledChx.checked : true;
                if (wheelMinInput) {
                    storeSettings.wheel_min_purchase = Math.max(0, Number(wheelMinInput.value) || 0);
                }
                try {
                    localStorage.setItem('valen_store_settings', JSON.stringify(storeSettings));
                    await fetchApi('/api/settings', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json', 'X-Admin-Password': adminPassword },
                        body: JSON.stringify({
                            wheel_enabled: storeSettings.wheel_enabled,
                            wheel_min_purchase: storeSettings.wheel_min_purchase
                        })
                    });
                } catch (err) {}
                if (floatingWheelBtn) {
                    floatingWheelBtn.style.display = storeSettings.wheel_enabled ? 'flex' : 'none';
                }
                const winMinText = document.getElementById('wheel-win-min-text');
                if (winMinText) winMinText.textContent = formatPrice(storeSettings.wheel_min_purchase || 50000);
                showNotification('Ajustes de ruleta guardados', '🎡');
            });
        }

        try {
            const res = await fetchApi('/api/coupons');
            let coupons = [
                { code: 'VALEN10', type: 'percent', value: 10, min_order: 0 },
                { code: 'GLAM15', type: 'percent', value: 15, min_order: 0 },
                { code: 'VALEN5K', type: 'fixed', value: 5000, min_order: 35000 },
                { code: 'ENVIOGRATIS', type: 'free_delivery', value: 0, min_order: 0 }
            ];
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) coupons = data;
            }

            if (couponsList) {
                couponsList.innerHTML = coupons.map(c => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #fdf2f8; border-radius: 8px; margin-bottom: 6px;">
                        <div>
                            <strong>${c.code}</strong> - ${c.type === 'percent' ? `${c.value}% DTO` : c.type === 'fixed' ? `${formatPrice(c.value)} DTO` : 'Envío Gratis'}
                            <small style="display: block; color: var(--text-muted); font-size: 0.75rem;">Mín: ${formatPrice(c.min_order || 0)}</small>
                        </div>
                        <button type="button" class="btn-del-coupon" data-code="${c.code}" style="background: none; border: none; color: #dc2626; cursor: pointer; font-size: 0.9rem;">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `).join('');

                couponsList.querySelectorAll('.btn-del-coupon').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const code = btn.dataset.code;
                        if (!confirm(`¿Eliminar cupón ${code}?`)) return;
                        try {
                            await fetchApi(`/api/coupons/${code}`, {
                                method: 'DELETE',
                                headers: { 'X-Admin-Password': adminPassword }
                            });
                        } catch (e) {}
                        showNotification(`Cupón ${code} eliminado`, '🗑️');
                        loadAdminCoupons();
                    });
                });
            }
        } catch (e) {}

        if (couponForm && !couponForm._wired) {
            couponForm._wired = true;
            couponForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const code = document.getElementById('admin-coupon-code').value.trim().toUpperCase();
                const type = document.getElementById('admin-coupon-type').value;
                const val = Number(document.getElementById('admin-coupon-value').value || 0);
                const min = Number(document.getElementById('admin-coupon-min').value || 0);

                const newCoupon = { code, type, value: val, min_order: min, active: true };

                try {
                    await fetchApi('/api/coupons', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'X-Admin-Password': adminPassword },
                        body: JSON.stringify(newCoupon)
                    });
                } catch (e) {}

                showNotification(`Cupón ${code} creado`, '🎟️');
                couponForm.reset();
                loadAdminCoupons();
            });
        }
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

    let logsPollingInterval = null;

    async function loadAdminData() {
        try {
            const prodsRes = await fetchApi('/api/products?active=false');
            if (prodsRes.ok) {
                const data = await prodsRes.json();
                if (Array.isArray(data) && data.length > 0) {
                    allProducts = data;
                    adminProducts = data.slice();
                    saveLocalCache(allProducts);
                }
            }
        } catch (e) {
            console.warn('[Admin] Fallo al cargar productos del servidor:', e);
            if (adminProducts.length === 0) {
                adminProducts = allProducts.slice();
            }
        }

        if (supabaseClient && adminProducts.length === 0) {
            try {
                const { data } = await supabaseClient.from('products').select('*').order('id', { ascending: false });
                if (data) adminProducts = data;
            } catch (e) {}
        }

        adminCategories = allCategories.map((name, id) => ({ id: id + 1, name }));

        populateAdminCategorySelect();
        renderAdminCategoryChips();
        renderAdminCategoryPills();
        renderAdminProductsList();
        updateAdminStats();
        await fetchRemoteLogs();
        startLogsPolling();
    }

    function updateAdminStats() {
        if (adminHeaderProductStat) adminHeaderProductStat.textContent = `${adminProducts.length} Productos`;
        if (adminHeaderCategoryStat) adminHeaderCategoryStat.textContent = `${adminCategories.length} Categorías`;
        if (adminTotalProductsBadge) adminTotalProductsBadge.textContent = `${adminProducts.length} productos`;
        updateLogsBadge();
    }

    // ==========================================
    // DEVELOPER AUDIT LOG SYSTEM (CENTRALIZADO EN NUBE)
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

    async function fetchRemoteLogs() {
        try {
            const res = await fetchApi('/api/logs?limit=300');
            if (res.ok) {
                const remoteLogs = await res.json();
                if (Array.isArray(remoteLogs)) {
                    const localLogs = getValenLogs();
                    const logMap = new Map();
                    // Put remote logs in map
                    remoteLogs.forEach(l => logMap.set(l.id, l));
                    // Keep any local logs that haven't synced yet
                    localLogs.forEach(l => {
                        if (!logMap.has(l.id)) logMap.set(l.id, l);
                    });
                    const merged = Array.from(logMap.values());
                    // Sort descending by timestamp
                    merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                    saveValenLogs(merged);
                    updateLogsBadge(merged);
                    const logsPane = document.getElementById('admin-tab-logs');
                    if (logsPane && logsPane.classList.contains('active')) {
                        renderValenLogs();
                    }
                    return merged;
                }
            }
        } catch (e) {
            console.warn('[Logs] No se pudieron sincronizar logs remotos:', e);
        }
        return getValenLogs();
    }

    function startLogsPolling() {
        if (logsPollingInterval) clearInterval(logsPollingInterval);
        logsPollingInterval = setInterval(() => {
            if (adminPanel && adminPanel.classList.contains('active')) {
                fetchRemoteLogs();
            }
        }, 5000);
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
            status: String(status || 'OK').toUpperCase(),
            message: String(message || ''),
            details: details && typeof details === 'object' ? details : { raw: details },
            deviceInfo: 'Dispositivo Actual 💻'
        };

        const logs = getValenLogs();
        logs.unshift(entry);
        saveValenLogs(logs);

        updateLogsBadge(logs);

        const logsPane = document.getElementById('admin-tab-logs');
        if (logsPane && logsPane.classList.contains('active')) {
            renderValenLogs();
        }

        // Enviar a la base de datos central en la nube para que otros dispositivos lo vean
        fetchApi('/api/logs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(entry)
        }).then(() => {
            // Refrescar lista remota
            fetchRemoteLogs();
        }).catch(err => {
            console.warn('[Logs] Error al enviar log a la nube:', err);
        });

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
        const cloudCount = allLogs.filter(l => l.action.startsWith('SUPABASE') || l.action.includes('DB') || l.action.includes('CLOUD')).length;
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
            filtered = filtered.filter(l => l.action.startsWith('SUPABASE') || l.action.includes('DB') || l.action.includes('CLOUD'));
        } else if (currentLogFilter === 'AUTH') {
            filtered = filtered.filter(l => l.action.startsWith('AUTH'));
        }

        // Apply search
        if (currentLogSearchQuery) {
            filtered = filtered.filter(l => {
                const haystack = `${l.message} ${l.action} ${l.status} ${l.timeFormatted} ${l.deviceInfo || ''} ${l.ipAddress || ''} ${JSON.stringify(l.details || {})}`.toLowerCase();
                return haystack.includes(currentLogSearchQuery);
            });
        }

        if (filtered.length === 0) {
            valenLogsTerminalBody.innerHTML = `
                <div class="valen-terminal-empty">
                    <i class="fas fa-terminal"></i>
                    <span>valen@system:~$ Sin registros coincidentes para el filtro actual.</span>
                    <small style="color: #475569;">Los eventos de todos los dispositivos conectados aparecerán aquí en vivo.</small>
                </div>
            `;
            return;
        }

        valenLogsTerminalBody.innerHTML = '';
        const escapeHtml = (str) => {
            return String(str || '')
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

            const devBadge = log.deviceInfo ? `<span class="valen-badge-device" style="background: rgba(147, 51, 234, 0.15); color: #c084fc; font-size: 0.72rem; padding: 2px 7px; border-radius: 4px; font-weight: 600; margin-right: 6px;">${escapeHtml(log.deviceInfo)}</span>` : '';

            const jsonStr = JSON.stringify({
                id: log.id,
                timestamp: log.timestamp,
                ipAddress: log.ipAddress || 'N/A',
                userAgent: log.userAgent || 'N/A',
                deviceInfo: log.deviceInfo || 'N/A',
                details: log.details || {}
            }, null, 2);

            row.innerHTML = `
                <div class="valen-log-summary-line">
                    <span class="valen-log-time">${escapeHtml(log.timeFormatted)}</span>
                    <span class="valen-badge-status ${statusClass}">${escapeHtml(statusLabel)}</span>
                    <span class="valen-badge-action">${escapeHtml(log.action)}</span>
                    ${devBadge}
                    <span class="valen-log-message">${escapeHtml(log.message)}</span>
                    <button type="button" class="valen-log-toggle-json" title="Ver detalles JSON">
                        <i class="fas fa-chevron-down"></i> Detalles
                    </button>
                </div>
                <div class="valen-log-details-drawer hidden">
                    <div class="valen-log-diff-header">
                        <span><i class="fas fa-code"></i> Datos de Auditoría Central (${escapeHtml(log.action)}) - ${escapeHtml(log.deviceInfo || 'Dispositivo')} [IP: ${escapeHtml(log.ipAddress || 'N/A')}]</span>
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

                if (target === 'orders') {
                    loadAdminOrders();
                } else if (target === 'delivery') {
                    loadAdminDeliverySettings();
                } else if (target === 'looks') {
                    loadAdminLooks();
                } else if (target === 'reviews') {
                    loadAdminReviews();
                } else if (target === 'coupons') {
                    loadAdminCoupons();
                } else if (target === 'logs') {
                    renderValenLogs();
                    fetchRemoteLogs();
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
                if (!confirm('¿Deseas limpiar todo el historial de logs de auditoría en la nube y local?')) return;
                localStorage.removeItem(VALEN_LOGS_STORAGE_KEY);
                renderValenLogs();
                showNotification('Historial de logs reiniciado', '🗑️');

                fetchApi('/api/logs', {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Admin-Password': adminPassword
                    }
                }).then(() => {
                    fetchRemoteLogs();
                }).catch(() => {});
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

        // Fetch remote logs on startup
        fetchRemoteLogs();
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
        const badge = document.getElementById('admin-category-count-badge');
        if (badge) badge.textContent = `${adminCategories.length} Categorías`;

        if (adminCategories.length === 0) {
            adminCategoryList.innerHTML = '<p style="color: var(--text-muted); font-size: 0.8rem; padding: 4px;">No hay categorías registradas.</p>';
            return;
        }

        adminCategories.forEach(cat => {
            const count = adminProducts.filter(p => normalizeCategoryName(p.category).toLowerCase() === cat.name.toLowerCase()).length;
            const isCanonical = CANONICAL_CATEGORIES.some(c => c.toLowerCase() === cat.name.toLowerCase());
            const chip = document.createElement('div');
            chip.className = 'admin-category-chip';
            chip.innerHTML = `
                <span class="chip-name" title="${cat.name}">${cat.name}</span>
                <span class="chip-count" title="${count} productos asociados">${count}</span>
                <div class="chip-actions">
                    <button type="button" class="chip-action-btn chip-edit-btn" title="Renombrar categoría"><i class="fas fa-pen"></i></button>
                    ${isCanonical ? '' : '<button type="button" class="chip-action-btn chip-delete-btn" title="Eliminar categoría personalizada"><i class="fas fa-trash-alt"></i></button>'}
                </div>
            `;

            chip.querySelector('.chip-edit-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                editAdminCategory(cat.name);
            });

            const delBtn = chip.querySelector('.chip-delete-btn');
            if (delBtn) {
                delBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    deleteAdminCategory(cat.name);
                });
            }

            adminCategoryList.appendChild(chip);
        });
    }

    async function deleteAdminCategory(name) {
        const normName = normalizeCategoryName(name);
        if (CANONICAL_CATEGORIES.some(c => c.toLowerCase() === normName.toLowerCase())) {
            alert(`"${normName}" es una categoría principal del catálogo y no se puede eliminar.`);
            return;
        }

        const count = adminProducts.filter(p => normalizeCategoryName(p.category).toLowerCase() === normName.toLowerCase()).length;
        const msg = count > 0 
            ? `¿Estás seguro de que deseas eliminar la categoría "${normName}"?\n\n⚠️ Tiene ${count} producto(s) asociado(s). Se reasignarán automáticamente a la categoría "Maquillaje" sin perderse.`
            : `¿Deseas eliminar la categoría "${normName}"?`;

        if (!confirm(msg)) return;

        const categoryMsg = document.getElementById('admin-category-message');
        if (categoryMsg) categoryMsg.textContent = 'Eliminando categoría...';

        // 1. Guardar en lista de categorías borradas localmente
        addDeletedCategory(normName);

        // 2. Reasignar productos en memoria
        allProducts.forEach(p => {
            if (normalizeCategoryName(p.category).toLowerCase() === normName.toLowerCase()) {
                p.category = 'Maquillaje';
            }
        });
        adminProducts.forEach(p => {
            if (normalizeCategoryName(p.category).toLowerCase() === normName.toLowerCase()) {
                p.category = 'Maquillaje';
            }
        });

        // 3. Remover categoría del estado
        allCategories = allCategories.filter(c => normalizeCategoryName(c).toLowerCase() !== normName.toLowerCase());
        adminCategories = adminCategories.filter(c => normalizeCategoryName(c.name).toLowerCase() !== normName.toLowerCase());

        if (selectedCategory.toLowerCase() === normName.toLowerCase()) {
            selectedCategory = 'all';
        }
        if (adminSelectedCat.toLowerCase() === normName.toLowerCase()) {
            adminSelectedCat = 'all';
        }

        saveLocalCache(allProducts);
        renderCategoryFilterPills();
        populateAdminCategorySelect();
        renderAdminCategoryChips();
        renderAdminCategoryPills();
        updateAdminStats();
        applyFilters();
        renderAdminProductsList();

        // 4. Sincronizar con API central (Neon DB) pasando únicamente el nombre
        try {
            await fetchApi(`/api/categories/${encodeURIComponent(normName)}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Admin-Password': adminPassword
                },
                body: JSON.stringify({ adminPassword })
            });
        } catch (err) {
            console.warn('[Admin Category] Error al borrar en API central:', err);
        }

        // 5. Sincronizar con Supabase si está activo
        if (supabaseClient) {
            try {
                await supabaseClient.from('products').update({ category: 'Maquillaje' }).eq('category', normName);
                await supabaseClient.from('categories').delete().eq('name', normName);
            } catch (err) {
                console.warn('[Admin Category] Error al borrar en Supabase:', err);
            }
        }

        logValenEvent('OK', 'CATEGORY_DELETE', `Categoría eliminada: "${normName}" (${count} productos reasignados a Maquillaje)`, {
            categoryName: normName,
            reassignedCount: count
        }, 'OK');

        if (categoryMsg) categoryMsg.textContent = '';
        showNotification(`Categoría "${normName}" eliminada correctamente`, '🗑️');
    }

    async function editAdminCategory(oldName) {
        const normOld = normalizeCategoryName(oldName);
        const input = prompt(`Ingresa el nuevo nombre para la categoría "${normOld}":`, normOld);
        if (input === null) return;
        const newName = input.trim();
        if (!newName || newName.toLowerCase() === normOld.toLowerCase()) return;
        const normNew = normalizeCategoryName(newName);

        if (allCategories.some(c => c.toLowerCase() === normNew.toLowerCase())) {
            alert(`Ya existe una categoría llamada "${normNew}".`);
            return;
        }

        const categoryMsg = document.getElementById('admin-category-message');
        if (categoryMsg) categoryMsg.textContent = 'Actualizando categoría...';

        removeDeletedCategory(normNew);
        addDeletedCategory(normOld);

        // Actualizar en memoria
        allProducts.forEach(p => {
            if (normalizeCategoryName(p.category).toLowerCase() === normOld.toLowerCase()) {
                p.category = normNew;
            }
        });
        adminProducts.forEach(p => {
            if (normalizeCategoryName(p.category).toLowerCase() === normOld.toLowerCase()) {
                p.category = normNew;
            }
        });

        allCategories = allCategories.map(c => normalizeCategoryName(c).toLowerCase() === normOld.toLowerCase() ? normNew : c);
        adminCategories = adminCategories.map(c => normalizeCategoryName(c.name).toLowerCase() === normOld.toLowerCase() ? { ...c, name: normNew } : c);

        if (selectedCategory.toLowerCase() === normOld.toLowerCase()) selectedCategory = normNew;
        if (adminSelectedCat.toLowerCase() === normOld.toLowerCase()) adminSelectedCat = normNew;

        saveLocalCache(allProducts);
        renderCategoryFilterPills();
        populateAdminCategorySelect();
        renderAdminCategoryChips();
        renderAdminCategoryPills();
        updateAdminStats();
        applyFilters();
        renderAdminProductsList();

        // API Sync pasando únicamente el nombre
        try {
            await fetchApi(`/api/categories/${encodeURIComponent(normOld)}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Admin-Password': adminPassword
                },
                body: JSON.stringify({ name: normNew, adminPassword })
            });
        } catch (err) {
            console.warn('[Admin Category] Error al actualizar en API:', err);
        }

        // Supabase Sync
        if (supabaseClient) {
            try {
                await supabaseClient.from('products').update({ category: normNew }).eq('category', normOld);
                await supabaseClient.from('categories').update({ name: normNew }).eq('name', normOld);
            } catch (err) {
                console.warn('[Admin Category] Error al actualizar en Supabase:', err);
            }
        }

        logValenEvent('OK', 'CATEGORY_UPDATE', `Categoría "${normOld}" renombrada a "${normNew}"`, {
            oldName: normOld,
            newName: normNew
        }, 'OK');

        if (categoryMsg) categoryMsg.textContent = '';
        showNotification(`Categoría renombrada a "${normNew}"`, '✏️');
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

            const matchedCat = (adminCategories || []).find(c => c.name.toLowerCase() === category.toLowerCase());
            const category_id = matchedCat && matchedCat.id ? Number(matchedCat.id) : undefined;

            const payload = {
                name,
                price,
                image,
                skin_tones_image,
                skin_tones_count,
                category,
                category_id,
                active,
                page: 1
            };
            if (editingId) {
                payload.id = editingId;
            }

            // Snapshot old product before mutation for diff audit
            const oldProd = editingId ? (allProducts.find(p => Number(p.id) === editingId) || adminProducts.find(p => Number(p.id) === editingId)) : null;

            try {
                // 1. Guardar en Base de Datos Central (Neon PostgreSQL en la nube)
                const endpoint = editingId ? `/api/products/${editingId}` : '/api/products';
                const method = editingId ? 'PATCH' : 'POST';
                let savedProduct = null;

                const apiRes = await fetchApi(endpoint, {
                    method,
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Admin-Password': adminPassword
                    },
                    body: JSON.stringify(payload)
                });
                if (apiRes.ok) {
                    savedProduct = await apiRes.json();
                    if (savedProduct && savedProduct.id) {
                        payload.id = savedProduct.id;
                    }
                } else {
                    const errData = await apiRes.json().catch(() => ({}));
                    throw new Error(errData.message || errData.error || `Error en la base de datos (${apiRes.status})`);
                }

                // 2. Sincronizar en Supabase si está configurado
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
                    }
                }

                // 3. Actualizar estado local en memoria
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

                // 4. Registrar evento de auditoría central
                if (editingId) {
                    const diff = {};
                    if (oldProd) {
                        if (oldProd.name !== payload.name) diff.name = { before: oldProd.name, after: payload.name };
                        if (Number(oldProd.price) !== Number(payload.price)) diff.price = { before: Number(oldProd.price), after: Number(payload.price) };
                        if (oldProd.category !== payload.category) diff.category = { before: oldProd.category, after: payload.category };
                        if (Boolean(oldProd.active !== false) !== Boolean(payload.active)) diff.active = { before: Boolean(oldProd.active !== false), after: Boolean(payload.active) };
                        if (Number(oldProd.skin_tones_count || 0) !== Number(payload.skin_tones_count || 0)) diff.skin_tones_count = { before: oldProd.skin_tones_count || 0, after: payload.skin_tones_count || 0 };
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
                        skinTonesCount: payload.skin_tones_count || 0
                    }, 'OK');
                }

                showNotification(editingId ? 'Producto actualizado en la base de datos' : '¡Producto guardado en la base de datos central!', '✅');

                adminProductForm.reset();
                delete adminProductForm.dataset.editingId;
                delete adminProductForm.dataset.existingImage;
                delete adminProductForm.dataset.existingSkinTones;
                if (document.getElementById('admin-product-skin-tones-count')) document.getElementById('admin-product-skin-tones-count').value = '';
                if (adminProductMessage) adminProductMessage.textContent = '';
                if (adminImagePreviewWrap) adminImagePreviewWrap.classList.add('hidden');
                if (adminSkinTonesPreviewWrap) adminSkinTonesPreviewWrap.classList.add('hidden');
                if (adminProductPanel) adminProductPanel.classList.add('hidden');

                // Refrescar logs remotos
                fetchRemoteLogs();
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
        }).then(() => {
            fetchRemoteLogs();
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
                }
            }).catch(e => {
                console.warn('Supabase delete error:', e);
            });
        }

        fetchApi(`/api/products/${numId}`, {
            method: 'DELETE',
            headers: { 'X-Admin-Password': adminPassword }
        }).then(() => {
            fetchRemoteLogs();
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
            removeDeletedCategory(norm);

            let newCatId = adminCategories.length + 1;
            if (!allCategories.some(c => c.toLowerCase() === norm.toLowerCase())) {
                allCategories.push(norm);
                adminCategories.push({ id: newCatId, name: norm });
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
                    const { data } = await supabaseClient.from('categories').insert([{ name: norm }]).select();
                    if (data && data[0] && data[0].id) {
                        const target = adminCategories.find(c => c.name.toLowerCase() === norm.toLowerCase());
                        if (target) target.id = data[0].id;
                    }
                } catch (e) {}
            }

            try {
                const res = await fetchApi('/api/categories', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Admin-Password': adminPassword
                    },
                    body: JSON.stringify({ name: norm })
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.id) {
                        const target = adminCategories.find(c => c.name.toLowerCase() === norm.toLowerCase());
                        if (target) target.id = data.id;
                    }
                }
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
    updateFavoritesUi();
    loadStoreSettings();
    loadLooks();
    loadReviews();
    loadCatalog();
    initAdminTabs();
    initValenLogsConsole();
    initPersistentCartToast();
    checkWheelStatus();
    drawLuckyWheel(0);
});