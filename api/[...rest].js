const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const TMP_FILE = path.join(os.tmpdir(), 'valen_makeup_data.json');
const SOURCE_FILE = path.join(process.cwd(), 'extracted_products.json');
const DEFAULT_PASSWORD = process.env.ADMIN_PASSWORD || '2006';

function hashPassword(password) {
  return crypto.createHash('sha256').update(String(password)).digest('hex');
}

const DEFAULT_CATEGORIES = [
  { id: 1, name: 'Cuidado Facial' },
  { id: 2, name: 'Maquillaje' },
  { id: 3, name: 'Cabello' },
  { id: 4, name: 'Accesorios' },
  { id: 5, name: 'Herramientas' },
  { id: 6, name: 'Corporal' },
  { id: 7, name: 'Bloomshell' },
];

function getCategoryForPage(page) {
  const p = Number(page) || 1;
  if (p >= 2 && p <= 15) return 'Cuidado Facial';
  if (p >= 16 && p <= 30) return 'Maquillaje';
  if (p >= 31 && p <= 35) return 'Cabello';
  if (p >= 36 && p <= 40) return 'Accesorios';
  if (p >= 41 && p <= 47) return 'Herramientas';
  if (p >= 48 && p <= 50) return 'Corporal';
  if (p >= 51) return 'Bloomshell';
  return 'Cuidado Facial';
}

function loadInitialData() {
  const raw = fs.readFileSync(SOURCE_FILE, 'utf8');
  const productsRaw = JSON.parse(raw);
  const data = {
    products: [],
    categories: DEFAULT_CATEGORIES.map(c => ({ ...c })),
    admin: {
      passwordHash: hashPassword(DEFAULT_PASSWORD),
    },
    nextProductId: 1,
    nextCategoryId: 8,
  };

  const categoryMap = {};
  data.categories.forEach(cat => {
    categoryMap[cat.name.toLowerCase()] = cat.id;
  });

  for (const item of productsRaw) {
    const name = String(item.name || '').trim();
    const price = Number(item.price || 0);
    const image = String(item.image || '').trim();
    const page = Number(item.page || 1) || 1;
    const active = item.active !== false;
    let categoryName = String(item.category || '').trim();
    if (!categoryName) {
      categoryName = getCategoryForPage(page);
    }
    let categoryId = null;

    if (categoryName) {
      if (!categoryMap[categoryName.toLowerCase()]) {
        categoryMap[categoryName.toLowerCase()] = data.nextCategoryId;
        data.categories.push({ id: data.nextCategoryId, name: categoryName });
        data.nextCategoryId += 1;
      }
      categoryId = categoryMap[categoryName.toLowerCase()];
    }

    data.products.push({
      id: Number(item.id) || data.nextProductId,
      name,
      price,
      image,
      page,
      active,
      category_id: categoryId,
      category: categoryName || null,
    });
    data.nextProductId = Math.max(data.nextProductId, Number(item.id) + 1 || data.nextProductId + 1);
  }

  if (data.products.length > 0) {
    data.nextProductId = Math.max(data.nextProductId, Math.max(...data.products.map((item) => item.id)) + 1);
  }

  fs.writeFileSync(TMP_FILE, JSON.stringify(data, null, 2), 'utf8');
  return data;
}

function loadData() {
  if (fs.existsSync(TMP_FILE)) {
    try {
      const existing = JSON.parse(fs.readFileSync(TMP_FILE, 'utf8'));
      if (existing && existing.categories && existing.categories.length > 0) {
        return existing;
      }
    } catch (error) {
      return loadInitialData();
    }
  }
  return loadInitialData();
}

function saveData(data) {
  fs.writeFileSync(TMP_FILE, JSON.stringify(data, null, 2), 'utf8');
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

function normalizeCategoryName(name) {
  return String(name || '').trim();
}

function findCategoryById(data, categoryId) {
  return data.categories.find((category) => category.id === categoryId) || null;
}

function ensureCategory(data, name) {
  const normalized = normalizeCategoryName(name);
  if (!normalized) {
    return null;
  }
  const existing = data.categories.find((category) => category.name.toLowerCase() === normalized.toLowerCase());
  if (existing) return existing.id;
  const newCategory = { id: data.nextCategoryId++, name: normalized };
  data.categories.push(newCategory);
  return newCategory.id;
}

function updateProductCategoryField(product, data) {
  const category = findCategoryById(data, product.category_id);
  product.category = category ? category.name : null;
}

function removeUnusedCategories(data) {
  // Never auto-remove categories; categories should only be deleted explicitly
}

function handleProducts(data, req, res, segments, payload) {
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
      saveData(data);
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
      saveData(data);
      sendJson(res, 200, product);
      return;
    }
    if (method === 'DELETE') {
      if (!requireAdmin(req, data, payload, res)) return;
      data.products = data.products.filter((item) => item.id !== productId);
      removeUnusedCategories(data);
      saveData(data);
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
    saveData(data);
    sendJson(res, 200, product);
    return;
  }

  notFound(res);
}

function handleCategories(data, req, res, segments, payload) {
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
      saveData(data);
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
      saveData(data);
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
      saveData(data);
      sendJson(res, 200, { deleted: true });
      return;
    }
  }

  notFound(res);
}

function handleAdmin(data, req, res, segments, payload) {
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
    data.admin.passwordHash = hashPassword(payload.password);
    saveData(data);
    sendJson(res, 200, { updated: true });
    return;
  }

  notFound(res);
}

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,X-Admin-Password');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const segments = parseSegments(req.url);
  const data = loadData();

  parseBody(req, (payload) => {
    if (segments.length === 0) {
      sendJson(res, 404, { error: 'not_found', message: 'Ruta no encontrada' });
      return;
    }

    if (segments[0] === 'products') {
      handleProducts(data, req, res, segments.slice(1), payload);
      return;
    }
    if (segments[0] === 'categories') {
      handleCategories(data, req, res, segments.slice(1), payload);
      return;
    }
    if (segments[0] === 'admin') {
      handleAdmin(data, req, res, segments.slice(1), payload);
      return;
    }
    if (segments[0] === 'health' && req.method === 'GET') {
      sendJson(res, 200, { status: 'ok' });
      return;
    }

    notFound(res);
  });
};
