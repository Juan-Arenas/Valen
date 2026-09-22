const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SOURCE_FILE = path.join(process.cwd(), 'extracted_products.json');
const DEFAULT_PASSWORD = process.env.ADMIN_PASSWORD || '2006';

function hashPassword(password) {
  return crypto.createHash('sha256').update(String(password).trim()).digest('hex');
}

let adminPasswordHash = hashPassword(DEFAULT_PASSWORD);

const DEFAULT_CATEGORIES = [
  { id: 1, name: 'Cuidado Facial y Corporal' },
  { id: 2, name: 'Maquillaje' },
  { id: 3, name: 'Cabello y Ducha' },
  { id: 4, name: 'Accesorios' },
  { id: 5, name: 'Bloomshell' },
];

function normalizeCategoryName(name) {
  const clean = String(name || '').replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1FA00}-\u{1FAFF}\u{200D}\u{FE0F}]/gu, '').replace(/\s+/g, ' ').trim();
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

function loadProductsFromFile() {
  if (fs.existsSync(SOURCE_FILE)) {
    try {
      const content = fs.readFileSync(SOURCE_FILE, 'utf8');
      return JSON.parse(content);
    } catch (e) {
      console.error('Error reading extracted_products.json:', e);
    }
  }
  return [];
}

function saveProductsToFile(products) {
  try {
    fs.writeFileSync(SOURCE_FILE, JSON.stringify(products, null, 4), 'utf8');
    return true;
  } catch (e) {
    console.error('Error saving extracted_products.json:', e);
    return false;
  }
}

function getCategoriesList(products) {
  const categories = DEFAULT_CATEGORIES.map(c => ({ ...c }));
  const catNames = new Set(categories.map(c => c.name.toLowerCase()));
  let nextId = 6;

  (products || []).forEach(p => {
    const catName = normalizeCategoryName(p.category);
    if (catName && !catNames.has(catName.toLowerCase())) {
      categories.push({ id: nextId++, name: catName });
      catNames.add(catName.toLowerCase());
    }
  });

  return categories;
}

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Password');
  res.end(JSON.stringify(payload));
}

function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        resolve({});
      }
    });
  });
}

function checkAdminAuth(req, payload) {
  const adminHeader = req.headers['x-admin-password'] || (payload && payload.adminPassword) || '';
  return hashPassword(adminHeader) === adminPasswordHash;
}

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Password');
    res.end();
    return;
  }

  const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = urlObj.pathname.replace(/^\/api\/?/, '');
  const segments = pathname.split('/').filter(Boolean);
  const method = req.method;

  const payload = ['POST', 'PUT', 'PATCH'].includes(method) ? await parseBody(req) : {};
  let products = loadProductsFromFile();

  // Route: /api/health
  if (segments[0] === 'health') {
    return sendJson(res, 200, { status: 'ok', totalProducts: products.length });
  }

  // Route: /api/admin/authenticate
  if (segments[0] === 'admin' && segments[1] === 'authenticate' && method === 'POST') {
    const pwd = String(payload.password || '').trim();
    if (hashPassword(pwd) === adminPasswordHash) {
      return sendJson(res, 200, { authenticated: true });
    }
    return sendJson(res, 401, { error: 'unauthorized', message: 'Contraseña incorrecta' });
  }

  // Route: /api/admin/password
  if (segments[0] === 'admin' && segments[1] === 'password' && method === 'PATCH') {
    if (!checkAdminAuth(req, payload)) {
      return sendJson(res, 401, { error: 'unauthorized', message: 'Credenciales inválidas' });
    }
    const newPwd = String(payload.password || '').trim();
    if (!newPwd) {
      return sendJson(res, 400, { error: 'missing_password', message: 'El PIN es obligatorio' });
    }
    adminPasswordHash = hashPassword(newPwd);
    return sendJson(res, 200, { updated: true });
  }

  // Route: /api/categories
  if (segments[0] === 'categories') {
    const categories = getCategoriesList(products);
    if (segments.length === 1) {
      if (method === 'GET') {
        return sendJson(res, 200, categories);
      }
      if (method === 'POST') {
        if (!checkAdminAuth(req, payload)) {
          return sendJson(res, 401, { error: 'unauthorized', message: 'Credenciales inválidas' });
        }
        const name = normalizeCategoryName(payload.name);
        if (!name) {
          return sendJson(res, 400, { error: 'missing_name', message: 'El nombre es obligatorio' });
        }
        const existing = categories.find(c => c.name.toLowerCase() === name.toLowerCase());
        if (existing) {
          return sendJson(res, 200, existing);
        }
        const newCat = { id: categories.length + 1, name };
        return sendJson(res, 201, newCat);
      }
    }
    if (segments.length === 2 && method === 'DELETE') {
      if (!checkAdminAuth(req, payload)) {
        return sendJson(res, 401, { error: 'unauthorized', message: 'Credenciales inválidas' });
      }
      return sendJson(res, 200, { deleted: true });
    }
  }

  // Route: /api/products
  if (segments[0] === 'products') {
    // /api/products (GET list, POST create)
    if (segments.length === 1) {
      if (method === 'GET') {
        const activeParam = (urlObj.searchParams.get('active') || 'true').toLowerCase();
        const activeOnly = !['0', 'false', 'no'].includes(activeParam);
        const categoryId = urlObj.searchParams.get('category_id');

        let result = products;
        if (activeOnly) {
          result = result.filter(p => p.active !== false);
        }
        if (categoryId) {
          result = result.filter(p => String(p.category_id) === String(categoryId));
        }
        return sendJson(res, 200, result);
      }

      if (method === 'POST') {
        if (!checkAdminAuth(req, payload)) {
          return sendJson(res, 401, { error: 'unauthorized', message: 'Credenciales inválidas' });
        }
        if (!payload.name || payload.price == null) {
          return sendJson(res, 400, { error: 'missing_fields', message: 'Nombre y precio son obligatorios' });
        }

        const maxId = products.reduce((max, p) => Math.max(max, Number(p.id) || 0), 0);
        const newProduct = {
          id: maxId + 1,
          name: String(payload.name).trim(),
          price: Number(payload.price) || 0,
          image: String(payload.image || 'img/product_1.jpg').trim(),
          page: Number(payload.page) || 1,
          active: payload.active !== false,
          category: normalizeCategoryName(payload.category || 'Maquillaje'),
          category_id: payload.category_id ? Number(payload.category_id) : 2
        };

        products.push(newProduct);
        saveProductsToFile(products);
        return sendJson(res, 201, newProduct);
      }
    }

    // /api/products/:id
    if (segments.length === 2) {
      const productId = Number(segments[1]);
      const index = products.findIndex(p => Number(p.id) === productId);

      if (index === -1) {
        return sendJson(res, 404, { error: 'not_found', message: 'Producto no encontrado' });
      }

      if (method === 'GET') {
        return sendJson(res, 200, products[index]);
      }

      if (['PUT', 'PATCH'].includes(method)) {
        if (!checkAdminAuth(req, payload)) {
          return sendJson(res, 401, { error: 'unauthorized', message: 'Credenciales inválidas' });
        }
        if (payload.name != null) products[index].name = String(payload.name).trim();
        if (payload.price != null) products[index].price = Number(payload.price);
        if (payload.image != null && payload.image !== '') products[index].image = String(payload.image).trim();
        if (payload.page != null) products[index].page = Number(payload.page) || 1;
        if (payload.active != null) products[index].active = Boolean(payload.active);
        if (payload.category != null) products[index].category = normalizeCategoryName(payload.category);
        if (payload.category_id != null) products[index].category_id = Number(payload.category_id);

        saveProductsToFile(products);
        return sendJson(res, 200, products[index]);
      }

      if (method === 'DELETE') {
        if (!checkAdminAuth(req, payload)) {
          return sendJson(res, 401, { error: 'unauthorized', message: 'Credenciales inválidas' });
        }
        products.splice(index, 1);
        saveProductsToFile(products);
        return sendJson(res, 200, { deleted: true });
      }
    }

    // /api/products/:id/state
    if (segments.length === 3 && segments[2] === 'state' && method === 'PATCH') {
      if (!checkAdminAuth(req, payload)) {
        return sendJson(res, 401, { error: 'unauthorized', message: 'Credenciales inválidas' });
      }
      const productId = Number(segments[1]);
      const product = products.find(p => Number(p.id) === productId);
      if (!product) {
        return sendJson(res, 404, { error: 'not_found', message: 'Producto no encontrado' });
      }
      product.active = Boolean(payload.active);
      saveProductsToFile(products);
      return sendJson(res, 200, product);
    }
  }

  return sendJson(res, 404, { error: 'not_found', message: 'Ruta no encontrada' });
};
