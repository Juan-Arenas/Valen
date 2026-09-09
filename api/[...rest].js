const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const https = require('https');

const SYNC_FILE = path.join(os.tmpdir(), 'valen_sync_state.json');
const SOURCE_FILE = path.join(process.cwd(), 'extracted_products.json');
const DEFAULT_PASSWORD = process.env.ADMIN_PASSWORD || '2006';
const SYNC_OBJECT_ID = 'ff808181a067127101a084ef75f353bd';

function hashPassword(password) {
  return crypto.createHash('sha256').update(String(password)).digest('hex');
}

const DEFAULT_CATEGORIES = [
  { id: 1, name: 'Cuidado Facial y Corporal' },
  { id: 2, name: 'Maquillaje' },
  { id: 3, name: 'Cabello y Ducha' },
  { id: 4, name: 'Accesorios' },
  { id: 5, name: 'Bloomshell' },
];

function stripEmojis(str) {
  return String(str || '')
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1FA00}-\u{1FAFF}\u{200D}\u{FE0F}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeCategoryName(name) {
  const clean = stripEmojis(name);
  const lower = clean.toLowerCase();
  if (lower === 'cuidado facial' || lower === 'corporal' || lower === 'cuidado corporal' || lower === 'cuidado facial y corporal') {
    return 'Cuidado Facial y Corporal';
  }
  if (lower === 'maquillaje') {
    return 'Maquillaje';
  }
  if (lower === 'cabello' || lower === 'ducha' || lower === 'cabello y ducha') {
    return 'Cabello y Ducha';
  }
  if (lower === 'accesorios' || lower === 'herramientas') {
    return 'Accesorios';
  }
  if (lower === 'bloomshell') {
    return 'Bloomshell';
  }
  return clean;
}

function getCategoryForPage(page) {
  const p = Number(page) || 1;
  if ((p >= 2 && p <= 15) || (p >= 48 && p <= 50)) return 'Cuidado Facial y Corporal';
  if (p >= 16 && p <= 30) return 'Maquillaje';
  if (p >= 31 && p <= 35) return 'Cabello y Ducha';
  if (p >= 36 && p <= 47) return 'Accesorios';
  if (p >= 51) return 'Bloomshell';
  return 'Cuidado Facial y Corporal';
}

function fetchRemoteSync() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.restful-api.dev',
      path: '/objects/' + SYNC_OBJECT_ID,
      method: 'GET',
      headers: {
        'User-Agent': 'ValenMakeupBackend/1.0',
        'Content-Type': 'application/json',
      },
      timeout: 3000,
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json && json.data ? json.data : null);
        } catch (e) {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
    req.end();
  });
}

function updateRemoteSync(syncData) {
  return new Promise((resolve) => {
    const payload = JSON.stringify({
      name: 'valen_makeup_sync',
      data: syncData,
    });
    const options = {
      hostname: 'api.restful-api.dev',
      path: '/objects/' + SYNC_OBJECT_ID,
      method: 'PUT',
      headers: {
        'User-Agent': 'ValenMakeupBackend/1.0',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
      timeout: 3000,
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        resolve(res.statusCode >= 200 && res.statusCode < 300);
      });
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    req.write(payload);
    req.end();
  });
}

async function loadSyncState() {
  let state = await fetchRemoteSync();
  if (state && typeof state === 'object') {
    try {
      fs.writeFileSync(SYNC_FILE, JSON.stringify(state), 'utf8');
    } catch (e) {}
    return state;
  }
  if (fs.existsSync(SYNC_FILE)) {
    try {
      state = JSON.parse(fs.readFileSync(SYNC_FILE, 'utf8'));
      return state;
    } catch (e) {}
  }
  return {
    deleted_ids: [],
    edited_products: {},
    custom_products: [],
    custom_categories: [],
    adminPasswordHash: hashPassword(DEFAULT_PASSWORD),
  };
}

async function saveSyncState(state) {
  try {
    fs.writeFileSync(SYNC_FILE, JSON.stringify(state), 'utf8');
  } catch (e) {}
  updateRemoteSync(state).catch(() => {});
}

async function loadFullData() {
  const syncState = await loadSyncState();
  const deletedIds = new Set((syncState.deleted_ids || []).map(Number));
  const editedMap = syncState.edited_products || {};
  const customProducts = syncState.custom_products || [];
  const customCategories = syncState.custom_categories || [];

  let productsRaw = [];
  if (fs.existsSync(SOURCE_FILE)) {
    try {
      productsRaw = JSON.parse(fs.readFileSync(SOURCE_FILE, 'utf8'));
    } catch (e) {
      productsRaw = [];
    }
  }

  const categories = DEFAULT_CATEGORIES.map((c) => ({ ...c }));
  const catMap = new Map();
  categories.forEach((c) => catMap.set(c.name.toLowerCase(), c.id));
  let nextCategoryId = 6;

  customCategories.forEach((c) => {
    const clean = normalizeCategoryName(c.name || c);
    if (clean && clean.toLowerCase() !== 'todas' && clean.toLowerCase() !== 'todos' && !catMap.has(clean.toLowerCase())) {
      const id = c.id || nextCategoryId++;
      categories.push({ id, name: clean });
      catMap.set(clean.toLowerCase(), id);
      nextCategoryId = Math.max(nextCategoryId, id + 1);
    }
  });

  const products = [];
  let maxId = 0;

  for (const item of productsRaw) {
    const id = Number(item.id);
    if (!id || deletedIds.has(id)) continue;
    maxId = Math.max(maxId, id);

    let product = {
      id,
      name: String(item.name || '').trim(),
      price: Number(item.price || 0),
      image: String(item.image || '').trim(),
      page: Number(item.page || 1) || 1,
      active: item.active !== false,
      category: normalizeCategoryName(item.category || getCategoryForPage(item.page)),
    };

    if (editedMap[id]) {
      product = { ...product, ...editedMap[id] };
    }

    const catName = normalizeCategoryName(product.category);
    if (catName && !catMap.has(catName.toLowerCase())) {
      const newId = nextCategoryId++;
      categories.push({ id: newId, name: catName });
      catMap.set(catName.toLowerCase(), newId);
    }
    product.category_id = catMap.get((catName || '').toLowerCase()) || null;
    product.category = catName;
    products.push(product);
  }

  for (const item of customProducts) {
    const id = Number(item.id);
    if (!id || deletedIds.has(id)) continue;
    maxId = Math.max(maxId, id);

    const catName = normalizeCategoryName(item.category || getCategoryForPage(item.page));
    if (catName && !catMap.has(catName.toLowerCase())) {
      const newId = nextCategoryId++;
      categories.push({ id: newId, name: catName });
      catMap.set(catName.toLowerCase(), newId);
    }

    products.push({
      id,
      name: String(item.name || '').trim(),
      price: Number(item.price || 0),
      image: String(item.image || '').trim(),
      page: Number(item.page || 1) || 1,
      active: item.active !== false,
      category_id: catMap.get((catName || '').toLowerCase()) || null,
      category: catName,
    });
  }

  return {
    products,
    categories,
    syncState,
    admin: {
      passwordHash: syncState.adminPasswordHash || hashPassword(DEFAULT_PASSWORD),
    },
    nextProductId: maxId + 1,
    nextCategoryId,
  };
}

function parseSegments(url) {
  const pathname = url.split('?')[0];
  const route = pathname.replace(/^\/api\/?/, '');
  if (!route) return [];
  return route.split('/').filter(Boolean);
}

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.end(JSON.stringify(payload));
}

function notFound(res) {
  sendJson(res, 404, { error: 'not_found', message: 'Ruta no encontrada' });
}

function parseBody(req, callback) {
  let body = '';
  req.on('data', (chunk) => {
    body += chunk.toString();
  });
  req.on('end', () => {
    if (!body) {
      callback(null);
      return;
    }
    try {
      callback(JSON.parse(body));
    } catch (error) {
      callback(null);
    }
  });
}

function requireAdmin(req, data, payload, res) {
  const adminHeader = req.headers['x-admin-password'] || (payload && payload.adminPassword);
  if (!adminHeader || hashPassword(adminHeader) !== data.admin.passwordHash) {
    sendJson(res, 401, { error: 'invalid_credentials', message: 'Credenciales de administrador inválidas' });
    return false;
  }
  return true;
}

function findCategoryById(data, categoryId) {
  return data.categories.find((category) => category.id === categoryId) || null;
}

function ensureCategory(data, name) {
  const normalized = normalizeCategoryName(name);
  if (!normalized) return null;
  const existing = data.categories.find((c) => c.name.toLowerCase() === normalized.toLowerCase());
  if (existing) return existing.id;
  const newCategory = { id: data.nextCategoryId++, name: normalized };
  data.categories.push(newCategory);
  if (!data.syncState.custom_categories) data.syncState.custom_categories = [];
  data.syncState.custom_categories.push(newCategory);
  return newCategory.id;
}

function updateProductCategoryField(product, data) {
  const category = findCategoryById(data, product.category_id);
  product.category = category ? category.name : null;
}

async function handleProducts(data, req, res, segments, payload) {
  const method = req.method;

  if (segments.length === 0) {
    if (method === 'GET') {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const activeParam = (url.searchParams.get('active') || 'true').trim().toLowerCase();
      const activeOnly = !['0', 'false', 'no'].includes(activeParam);
      const categoryIdParam = url.searchParams.get('category_id');
      let categoryId = null;
      if (categoryIdParam !== null && categoryIdParam !== '') {
        categoryId = Number(categoryIdParam);
        if (Number.isNaN(categoryId)) {
          sendJson(res, 400, { error: 'invalid_category_id', message: 'category_id debe ser un número' });
          return;
        }
      }
      let products = data.products;
      if (activeOnly) {
        products = products.filter((product) => product.active === true);
      }
      if (categoryId !== null) {
        products = products.filter((product) => product.category_id === categoryId);
      }
      sendJson(res, 200, products);
      return;
    }

    if (method === 'POST') {
      if (!requireAdmin(req, data, payload, res)) return;
      if (!payload || !payload.name || payload.price == null || !payload.image) {
        sendJson(res, 400, { error: 'missing_fields', message: 'name, price and image are required' });
        return;
      }
      const categoryId = payload.category_id != null && payload.category_id !== '' ? Number(payload.category_id) : null;
      const categoryNew = normalizeCategoryName(payload.category_new || payload.category || '');
      const finalCategoryId = categoryNew ? ensureCategory(data, categoryNew) : categoryId;
      const product = {
        id: data.nextProductId++,
        name: String(payload.name).trim(),
        price: Number(payload.price),
        image: String(payload.image).trim(),
        page: Number(payload.page || 1) || 1,
        active: payload.active !== false,
        category_id: finalCategoryId,
        category: null,
      };
      updateProductCategoryField(product, data);
      data.products.push(product);
      if (!data.syncState.custom_products) data.syncState.custom_products = [];
      data.syncState.custom_products.push(product);
      await saveSyncState(data.syncState);
      sendJson(res, 201, product);
      return;
    }
  }

  if (segments.length === 1) {
    const productId = Number(segments[0]);
    if (Number.isNaN(productId)) {
      notFound(res);
      return;
    }
    const product = data.products.find((item) => item.id === productId);
    if (!product) {
      sendJson(res, 404, { error: 'not_found', message: 'Producto no encontrado' });
      return;
    }

    if (method === 'GET') {
      sendJson(res, 200, product);
      return;
    }
    if (['PUT', 'PATCH'].includes(method)) {
      if (!requireAdmin(req, data, payload, res)) return;
      if (!payload) {
        sendJson(res, 400, { error: 'missing_body', message: 'JSON body is required' });
        return;
      }
      if (payload.name != null) product.name = String(payload.name).trim();
      if (payload.price != null) product.price = Number(payload.price);
      if (payload.image != null) product.image = String(payload.image).trim();
      if (payload.page != null) product.page = Number(payload.page) || product.page;
      if (payload.active != null) product.active = payload.active === true;
      if (payload.category_id != null) {
        product.category_id = payload.category_id === '' ? null : Number(payload.category_id);
      }
      if (payload.category_new) {
        product.category_id = ensureCategory(data, payload.category_new);
      }
      updateProductCategoryField(product, data);

      if (!data.syncState.edited_products) data.syncState.edited_products = {};
      const customIdx = (data.syncState.custom_products || []).findIndex((p) => p.id === productId);
      if (customIdx >= 0) {
        data.syncState.custom_products[customIdx] = { ...product };
      } else {
        data.syncState.edited_products[productId] = { ...product };
      }
      await saveSyncState(data.syncState);
      sendJson(res, 200, product);
      return;
    }
    if (method === 'DELETE') {
      if (!requireAdmin(req, data, payload, res)) return;
      if (!data.syncState.deleted_ids) data.syncState.deleted_ids = [];
      if (!data.syncState.deleted_ids.includes(productId)) {
        data.syncState.deleted_ids.push(productId);
      }
      if (data.syncState.custom_products) {
        data.syncState.custom_products = data.syncState.custom_products.filter((p) => p.id !== productId);
      }
      if (data.syncState.edited_products) {
        delete data.syncState.edited_products[productId];
      }
      data.products = data.products.filter((item) => item.id !== productId);
      await saveSyncState(data.syncState);
      sendJson(res, 200, { deleted: true });
      return;
    }
  }

  if (segments.length === 2 && segments[1] === 'state' && method === 'PATCH') {
    if (!requireAdmin(req, data, payload, res)) return;
    const productId = Number(segments[0]);
    if (Number.isNaN(productId)) {
      notFound(res);
      return;
    }
    const product = data.products.find((item) => item.id === productId);
    if (!product) {
      sendJson(res, 404, { error: 'not_found', message: 'Producto no encontrado' });
      return;
    }
    if (!payload || payload.active == null) {
      sendJson(res, 400, { error: 'missing_fields', message: 'active field is required' });
      return;
    }
    product.active = payload.active === true;
    if (!data.syncState.edited_products) data.syncState.edited_products = {};
    const customIdx = (data.syncState.custom_products || []).findIndex((p) => p.id === productId);
    if (customIdx >= 0) {
      data.syncState.custom_products[customIdx].active = product.active;
    } else {
      data.syncState.edited_products[productId] = { ...product };
    }
    await saveSyncState(data.syncState);
    sendJson(res, 200, product);
    return;
  }

  notFound(res);
}

async function handleCategories(data, req, res, segments, payload) {
  const method = req.method;
  if (segments.length === 0) {
    if (method === 'GET') {
      sendJson(res, 200, data.categories);
      return;
    }
    if (method === 'POST') {
      if (!requireAdmin(req, data, payload, res)) return;
      if (!payload || !payload.name) {
        sendJson(res, 400, { error: 'missing_fields', message: 'El campo name es obligatorio' });
        return;
      }
      const id = ensureCategory(data, payload.name);
      await saveSyncState(data.syncState);
      const category = findCategoryById(data, id);
      sendJson(res, 201, category);
      return;
    }
  }
  if (segments.length === 1) {
    const categoryId = Number(segments[0]);
    if (Number.isNaN(categoryId)) {
      notFound(res);
      return;
    }
    const category = findCategoryById(data, categoryId);
    if (!category) {
      sendJson(res, 404, { error: 'not_found', message: 'Categoría no encontrada' });
      return;
    }
    if (['PUT', 'PATCH'].includes(method)) {
      if (!requireAdmin(req, data, payload, res)) return;
      if (!payload || !payload.name) {
        sendJson(res, 400, { error: 'missing_fields', message: 'El campo name es obligatorio' });
        return;
      }
      category.name = normalizeCategoryName(payload.name);
      data.products.forEach((product) => {
        if (product.category_id === category.id) {
          product.category = category.name;
        }
      });
      if (data.syncState.custom_categories) {
        const catItem = data.syncState.custom_categories.find((c) => c.id === category.id);
        if (catItem) catItem.name = category.name;
      }
      await saveSyncState(data.syncState);
      sendJson(res, 200, category);
      return;
    }
    if (method === 'DELETE') {
      if (!requireAdmin(req, data, payload, res)) return;
      data.products = data.products.map((product) => {
        if (product.category_id === category.id) {
          return { ...product, category_id: null, category: null };
        }
        return product;
      });
      data.categories = data.categories.filter((item) => item.id !== category.id);
      if (data.syncState.custom_categories) {
        data.syncState.custom_categories = data.syncState.custom_categories.filter((c) => c.id !== category.id);
      }
      await saveSyncState(data.syncState);
      sendJson(res, 200, { deleted: true });
      return;
    }
  }

  notFound(res);
}

async function handleAdmin(data, req, res, segments, payload) {
  const method = req.method;
  if (segments.length === 1 && segments[0] === 'authenticate' && method === 'POST') {
    if (!payload || !payload.password) {
      sendJson(res, 400, { error: 'missing_fields', message: 'El campo password es obligatorio' });
      return;
    }
    if (hashPassword(payload.password) !== data.admin.passwordHash) {
      sendJson(res, 401, { error: 'invalid_credentials', message: 'Contraseña incorrecta' });
      return;
    }
    sendJson(res, 200, { authenticated: true });
    return;
  }

  if (segments.length === 1 && segments[0] === 'password' && method === 'PATCH') {
    if (!requireAdmin(req, data, payload, res)) return;
    if (!payload || !payload.password) {
      sendJson(res, 400, { error: 'missing_fields', message: 'El campo password es obligatorio' });
      return;
    }
    data.syncState.adminPasswordHash = hashPassword(payload.password);
    data.admin.passwordHash = data.syncState.adminPasswordHash;
    await saveSyncState(data.syncState);
    sendJson(res, 200, { updated: true });
    return;
  }

  notFound(res);
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,X-Admin-Password');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const segments = parseSegments(req.url);
  const data = await loadFullData();

  parseBody(req, async (payload) => {
    if (segments.length === 0) {
      sendJson(res, 404, { error: 'not_found', message: 'Ruta no encontrada' });
      return;
    }

    if (segments[0] === 'products') {
      await handleProducts(data, req, res, segments.slice(1), payload);
      return;
    }
    if (segments[0] === 'categories') {
      await handleCategories(data, req, res, segments.slice(1), payload);
      return;
    }
    if (segments[0] === 'admin') {
      await handleAdmin(data, req, res, segments.slice(1), payload);
      return;
    }
    if (segments[0] === 'health' && req.method === 'GET') {
      sendJson(res, 200, { status: 'ok' });
      return;
    }

    notFound(res);
  });
};
