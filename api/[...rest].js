const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { neon } = require('@neondatabase/serverless');

const DATABASE_URL = (
  process.env.DATABASE_URL ||
  'postgresql://authenticator:npg_l1dPIAZeQ6rb@ep-holy-rice-ayq7meg3.c-5.us-east-2.aws.neon.tech/valen?sslmode=require'
).trim();

const DEFAULT_PASSWORD = (process.env.ADMIN_PASSWORD || '2006').trim();

// Initialize Neon SQL client
let sql = null;
try {
  sql = neon(DATABASE_URL);
} catch (e) {
  console.error('[API] Error al inicializar neon client:', e);
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(String(password).trim()).digest('hex');
}

let cachedAdminPasswordHash = hashPassword(DEFAULT_PASSWORD);

// Cache password hash periodically or fetch from DB
async function getAdminPasswordHash() {
  if (!sql) return cachedAdminPasswordHash;
  try {
    const rows = await sql`SELECT password_hash FROM admin WHERE role = 'admin' LIMIT 1`;
    if (rows && rows.length > 0 && rows[0].password_hash) {
      cachedAdminPasswordHash = rows[0].password_hash;
      return cachedAdminPasswordHash;
    }
  } catch (e) {
    console.warn('[API] No se pudo leer hash de admin desde DB:', e.message);
  }
  return cachedAdminPasswordHash;
}

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

async function resolveCategoryId(sql, categoryName, givenId = null) {
  if (!sql) return null;
  // 1. If given an ID, check if it exists in categories table
  if (givenId && Number(givenId) > 0) {
    try {
      const check = await sql`SELECT id FROM categories WHERE id = ${Number(givenId)} LIMIT 1;`;
      if (check.length > 0) return check[0].id;
    } catch (e) {}
  }

  // 2. Look up by normalized category name
  const normName = normalizeCategoryName(categoryName || 'Maquillaje');
  try {
    const match = await sql`SELECT id FROM categories WHERE LOWER(name) = LOWER(${normName}) LIMIT 1;`;
    if (match.length > 0) return match[0].id;
  } catch (e) {}

  // 3. Try to insert new category into categories table
  try {
    const inserted = await sql`
      INSERT INTO categories (name) VALUES (${normName})
      ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
      RETURNING id;
    `;
    if (inserted.length > 0) return inserted[0].id;
  } catch (e) {}

  // 4. Fallback to any valid category (e.g. Maquillaje)
  try {
    const fallback = await sql`SELECT id FROM categories WHERE name = 'Maquillaje' LIMIT 1;`;
    if (fallback.length > 0) return fallback[0].id;
    const anyCat = await sql`SELECT id FROM categories ORDER BY id ASC LIMIT 1;`;
    if (anyCat.length > 0) return anyCat[0].id;
  } catch (e) {}

  return null;
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.headers['x-real-ip'] || (req.socket && req.socket.remoteAddress) || '127.0.0.1';
}

function getClientUserAgent(req) {
  return req.headers['user-agent'] || 'Unknown Browser';
}

function parseDeviceInfo(userAgent) {
  const ua = String(userAgent || '');
  if (/android/i.test(ua)) return 'Android Device 📱';
  if (/iphone/i.test(ua)) return 'iPhone 📱';
  if (/ipad/i.test(ua)) return 'iPad 📱';
  if (/windows/i.test(ua)) return 'Windows PC 💻';
  if (/macintosh|mac os x/i.test(ua)) return 'Mac 💻';
  if (/linux/i.test(ua)) return 'Linux 💻';
  return 'Web Client 🌐';
}

function formatNowDate() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  // Format: HH:MM:SS DD/MM/YYYY
  return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())} ${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
}

function sanitizeForAudit(obj, depth = 0) {
  if (!obj || typeof obj !== 'object' || depth > 4) return obj;
  if (Array.isArray(obj)) return obj.map(x => sanitizeForAudit(x, depth + 1));
  const res = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string') {
      if (v.startsWith('data:image')) {
        res[k] = `[Imagen base64: ${(v.length / 1024).toFixed(1)} KB]`;
      } else if (v.length > 1000) {
        res[k] = v.substring(0, 1000) + '...';
      } else {
        res[k] = v;
      }
    } else if (typeof v === 'object' && v !== null) {
      res[k] = sanitizeForAudit(v, depth + 1);
    } else {
      res[k] = v;
    }
  }
  return res;
}

async function insertAuditLog({ level = 'INFO', action, status = 'OK', message, details = {}, req }) {
  if (!sql) return null;
  try {
    const id = 'valen_log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const ip = req ? getClientIp(req) : 'Server Internal';
    const ua = req ? getClientUserAgent(req) : 'Internal Node';
    const devInfo = parseDeviceInfo(ua);
    const timeFormatted = formatNowDate();
    const cleanDetails = sanitizeForAudit(details || {});

    await sql`
      INSERT INTO audit_logs (id, timestamp, time_formatted, level, action, status, message, details, ip_address, user_agent, device_info)
      VALUES (
        ${id},
        NOW(),
        ${timeFormatted},
        ${String(level).toUpperCase()},
        ${String(action).toUpperCase()},
        ${String(status).toUpperCase()},
        ${String(message)},
        ${JSON.stringify(cleanDetails)}::jsonb,
        ${ip},
        ${ua},
        ${devInfo}
      )
    `;

    return { id, timeFormatted, ip, devInfo };
  } catch (err) {
    console.error('[API Audit Log Error]:', err.message);
    return null;
  }
}

async function checkAdminAuth(req, payload) {
  const adminHeader = req.headers['x-admin-password'] || (payload && payload.adminPassword) || '';
  if (!adminHeader) return false;
  const hash = hashPassword(adminHeader);
  const correctHash = await getAdminPasswordHash();
  return hash === correctHash || String(adminHeader).trim() === DEFAULT_PASSWORD;
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
  if (req.body) {
    if (typeof req.body === 'object') return Promise.resolve(req.body);
    try {
      return Promise.resolve(JSON.parse(req.body));
    } catch (e) {
      return Promise.resolve({});
    }
  }
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
    req.on('error', () => resolve({}));
  });
}

// Background sync to GitHub if tokens are present
async function backgroundSyncToGithub(products) {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  if (!token || !repo) return false;

  try {
    const content = `const INLINE_PRODUCTS = ${JSON.stringify(products, null, 2)};`;
    const encodedContent = Buffer.from(content).toString('base64');
    const path = 'catalogo.js';
    const branch = process.env.GITHUB_BRANCH || 'main';

    const res = await fetch(`https://api.github.com/repos/${repo}/contents/${path}?ref=${branch}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'Valen-Makeup-App'
      }
    });
    let sha = '';
    if (res.ok) {
      const data = await res.json();
      sha = data.sha;
    }

    await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'Valen-Makeup-App',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Auto-update catalogo.js from Admin Panel (Neon DB Sync)',
        content: encodedContent,
        sha: sha || undefined,
        branch: branch
      })
    });
    return true;
  } catch(e) {
    console.warn('[API Background GitHub Sync]:', e.message);
    return false;
  }
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

  // -------------------------------------------------------------
  // Route: /api/health
  // -------------------------------------------------------------
  if (segments[0] === 'health') {
    let dbStatus = 'ok';
    let productCount = 0;
    try {
      if (sql) {
        const r = await sql`SELECT count(*) FROM products`;
        productCount = Number(r[0].count);
      }
    } catch (e) {
      dbStatus = 'degraded: ' + e.message;
    }
    return sendJson(res, 200, {
      status: 'ok',
      database: dbStatus,
      totalProducts: productCount,
      neon: Boolean(sql)
    });
  }

  // -------------------------------------------------------------
  // Route: /api/admin/authenticate
  // -------------------------------------------------------------
  if (segments[0] === 'admin' && segments[1] === 'authenticate' && method === 'POST') {
    const enteredPin = String(payload.password || '').trim();
    const correctHash = await getAdminPasswordHash();
    const isCorrect = hashPassword(enteredPin) === correctHash || enteredPin === DEFAULT_PASSWORD;

    const ip = getClientIp(req);
    const ua = getClientUserAgent(req);
    const dev = parseDeviceInfo(ua);

    if (isCorrect) {
      await insertAuditLog({
        level: 'INFO',
        action: 'AUTH_LOGIN',
        status: 'OK',
        message: `Acceso autorizado al Panel de Administración desde ${dev} (${ip})`,
        details: { ip, userAgent: ua, deviceInfo: dev },
        req
      });
      return sendJson(res, 200, { authenticated: true });
    } else {
      await insertAuditLog({
        level: 'WARN',
        action: 'AUTH_FAILED',
        status: 'FAILED',
        message: `Intento de acceso denegado: PIN incorrecto desde ${dev} (${ip})`,
        details: { enteredLength: enteredPin.length, ip, userAgent: ua, deviceInfo: dev },
        req
      });
      return sendJson(res, 401, { error: 'unauthorized', message: 'Contraseña incorrecta' });
    }
  }

  // -------------------------------------------------------------
  // Route: /api/admin/password
  // -------------------------------------------------------------
  if (segments[0] === 'admin' && segments[1] === 'password' && method === 'PATCH') {
    const isAuth = await checkAdminAuth(req, payload);
    if (!isAuth) {
      return sendJson(res, 401, { error: 'unauthorized', message: 'Credenciales inválidas' });
    }
    const newPin = String(payload.password || '').trim();
    if (!newPin || newPin.length < 4) {
      return sendJson(res, 400, { error: 'missing_password', message: 'El PIN debe tener al menos 4 dígitos' });
    }

    const newHash = hashPassword(newPin);
    if (sql) {
      await sql`
        INSERT INTO admin (role, password_hash)
        VALUES ('admin', ${newHash})
        ON CONFLICT (role) DO UPDATE SET password_hash = EXCLUDED.password_hash;
      `;
    }
    cachedAdminPasswordHash = newHash;

    await insertAuditLog({
      level: 'INFO',
      action: 'AUTH_PIN_CHANGE',
      status: 'OK',
      message: 'PIN de administrador actualizado exitosamente',
      details: { updatedBy: getClientIp(req) },
      req
    });

    return sendJson(res, 200, { updated: true });
  }

  // -------------------------------------------------------------
  // Route: /api/logs (GET, POST, DELETE) - Centralized Global Logs
  // -------------------------------------------------------------
  if (segments[0] === 'logs') {
    // GET /api/logs -> Read centralized logs for all devices
    if (method === 'GET') {
      try {
        if (!sql) return sendJson(res, 200, []);
        const limitParam = Number(urlObj.searchParams.get('limit')) || 300;
        const rows = await sql`
          SELECT id, timestamp, time_formatted as "timeFormatted", level, action, status, message, details,
                 ip_address as "ipAddress", user_agent as "userAgent", device_info as "deviceInfo"
          FROM audit_logs
          ORDER BY timestamp DESC
          LIMIT ${limitParam};
        `;
        return sendJson(res, 200, rows);
      } catch (err) {
        console.error('[API GET /api/logs]:', err);
        return sendJson(res, 500, { error: err.message });
      }
    }

    // POST /api/logs -> Client sends log event to persist in central DB
    if (method === 'POST') {
      try {
        const { level, action, status, message, details } = payload;
        if (!action || !message) {
          return sendJson(res, 400, { error: 'action and message are required' });
        }
        const created = await insertAuditLog({
          level: level || 'INFO',
          action,
          status: status || 'OK',
          message,
          details: details || {},
          req
        });
        return sendJson(res, 201, { created: true, log: created });
      } catch (err) {
        return sendJson(res, 500, { error: err.message });
      }
    }

    // DELETE /api/logs -> Admin clears logs
    if (method === 'DELETE') {
      const isAuth = await checkAdminAuth(req, payload);
      if (!isAuth) {
        return sendJson(res, 401, { error: 'unauthorized', message: 'Credenciales inválidas' });
      }
      try {
        if (sql) {
          await sql`TRUNCATE TABLE audit_logs;`;
          await insertAuditLog({
            level: 'WARN',
            action: 'LOGS_CLEARED',
            status: 'OK',
            message: 'Historial de auditoría reiniciado por el administrador',
            req
          });
        }
        return sendJson(res, 200, { cleared: true });
      } catch (err) {
        return sendJson(res, 500, { error: err.message });
      }
    }
  }

  // -------------------------------------------------------------
  // Route: /api/categories (GET, POST, DELETE)
  // -------------------------------------------------------------
  if (segments[0] === 'categories') {
    if (segments.length === 1) {
      if (method === 'GET') {
        try {
          if (!sql) return sendJson(res, 200, []);
          const categories = await sql`SELECT id, name FROM categories ORDER BY id ASC;`;
          return sendJson(res, 200, categories);
        } catch (e) {
          return sendJson(res, 500, { error: e.message });
        }
      }

      if (method === 'POST') {
        const isAuth = await checkAdminAuth(req, payload);
        if (!isAuth) {
          return sendJson(res, 401, { error: 'unauthorized', message: 'Credenciales inválidas' });
        }
        const name = normalizeCategoryName(payload.name);
        if (!name) {
          return sendJson(res, 400, { error: 'missing_name', message: 'El nombre es obligatorio' });
        }
        try {
          const inserted = await sql`
            INSERT INTO categories (name) VALUES (${name})
            ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
            RETURNING id, name;
          `;
          await insertAuditLog({
            level: 'INFO',
            action: 'CATEGORY_CREATE',
            status: 'OK',
            message: `Nueva categoría creada en base de datos: "${name}"`,
            details: { categoryId: inserted[0].id, name },
            req
          });
          return sendJson(res, 201, inserted[0]);
        } catch (err) {
          return sendJson(res, 500, { error: err.message });
        }
      }
    }

    if (segments.length === 2 && method === 'DELETE') {
      const isAuth = await checkAdminAuth(req, payload);
      if (!isAuth) {
        return sendJson(res, 401, { error: 'unauthorized', message: 'Credenciales inválidas' });
      }
      const rawParam = decodeURIComponent(segments[1]).trim();
      const catId = Number(rawParam);
      try {
        if (sql) {
          let catName = '';

          if (!isNaN(catId) && String(catId) === rawParam) {
            const rows = await sql`SELECT name FROM categories WHERE id = ${catId} LIMIT 1;`;
            if (rows.length > 0) catName = rows[0].name;
          } else {
            catName = rawParam;
          }

          if (catName) {
            // Reassign ONLY products with this exact category name
            await sql`
              UPDATE products 
              SET category = 'Maquillaje' 
              WHERE LOWER(category) = LOWER(${catName});
            `;
            await sql`
              DELETE FROM categories 
              WHERE LOWER(name) = LOWER(${catName});
            `;

            await insertAuditLog({
              level: 'INFO',
              action: 'CATEGORY_DELETE',
              status: 'OK',
              message: `Categoría "${catName}" eliminada del catálogo`,
              details: { name: catName },
              req
            });
          }
        }
        return sendJson(res, 200, { deleted: true });
      } catch (err) {
        console.error('[API DELETE /categories Error]:', err);
        return sendJson(res, 500, { error: err.message });
      }
    }

    if (segments.length === 2 && (method === 'PUT' || method === 'PATCH')) {
      const isAuth = await checkAdminAuth(req, payload);
      if (!isAuth) {
        return sendJson(res, 401, { error: 'unauthorized', message: 'Credenciales inválidas' });
      }
      const rawParam = decodeURIComponent(segments[1]).trim();
      const catId = Number(rawParam);
      const newName = normalizeCategoryName(payload && payload.name);
      if (!newName) {
        return sendJson(res, 400, { error: 'missing_name', message: 'El nuevo nombre es obligatorio' });
      }
      try {
        if (sql) {
          let oldName = '';

          if (!isNaN(catId) && String(catId) === rawParam) {
            const rows = await sql`SELECT name FROM categories WHERE id = ${catId} LIMIT 1;`;
            if (rows.length > 0) oldName = rows[0].name;
          } else {
            oldName = rawParam;
          }

          if (oldName) {
            await sql`UPDATE categories SET name = ${newName} WHERE LOWER(name) = LOWER(${oldName});`;
            await sql`UPDATE products SET category = ${newName} WHERE LOWER(category) = LOWER(${oldName});`;

            await insertAuditLog({
              level: 'INFO',
              action: 'CATEGORY_UPDATE',
              status: 'OK',
              message: `Categoría "${oldName}" renombrada a "${newName}"`,
              details: { oldName, newName },
              req
            });
          }
        }
        return sendJson(res, 200, { updated: true, name: newName });
      } catch (err) {
        console.error('[API UPDATE /categories Error]:', err);
        return sendJson(res, 500, { error: err.message });
      }
    }
  }

  // -------------------------------------------------------------
  // Route: /api/products
  // -------------------------------------------------------------
  if (segments[0] === 'products') {
    // /api/products (GET list, POST create)
    if (segments.length === 1) {
      if (method === 'GET') {
        try {
          const activeParam = (urlObj.searchParams.get('active') || 'true').toLowerCase();
          const activeOnly = !['0', 'false', 'no'].includes(activeParam);
          const categoryParam = urlObj.searchParams.get('category');

          let rows = [];
          if (sql) {
            if (activeOnly && categoryParam) {
              rows = await sql`
                SELECT p.id, p.name, p.price, p.image, p.page, p.active, p.category_id,
                       p.category, p.skin_tones_image, p.skin_tones_count
                FROM products p
                WHERE p.active = TRUE AND LOWER(p.category) = LOWER(${categoryParam})
                ORDER BY p.id DESC;
              `;
            } else if (activeOnly) {
              rows = await sql`
                SELECT p.id, p.name, p.price, p.image, p.page, p.active, p.category_id,
                       p.category, p.skin_tones_image, p.skin_tones_count
                FROM products p
                WHERE p.active = TRUE
                ORDER BY p.id DESC;
              `;
            } else if (categoryParam) {
              rows = await sql`
                SELECT p.id, p.name, p.price, p.image, p.page, p.active, p.category_id,
                       p.category, p.skin_tones_image, p.skin_tones_count
                FROM products p
                WHERE LOWER(p.category) = LOWER(${categoryParam})
                ORDER BY p.id DESC;
              `;
            } else {
              rows = await sql`
                SELECT p.id, p.name, p.price, p.image, p.page, p.active, p.category_id,
                       p.category, p.skin_tones_image, p.skin_tones_count
                FROM products p
                ORDER BY p.id DESC;
              `;
            }
          }

          return sendJson(res, 200, rows);
        } catch (err) {
          console.error('[API GET /products Error]:', err);
          return sendJson(res, 500, { error: err.message });
        }
      }

      if (method === 'POST') {
        const isAuth = await checkAdminAuth(req, payload);
        if (!isAuth) {
          return sendJson(res, 401, { error: 'unauthorized', message: 'Credenciales inválidas' });
        }
        if (!payload.name || payload.price == null) {
          return sendJson(res, 400, { error: 'missing_fields', message: 'Nombre y precio son obligatorios' });
        }

        try {
          const name = String(payload.name).trim();
          const price = Number(String(payload.price).replace(/[^0-9]/g, '')) || 0;
          const image = String(payload.image || 'img/product_1.jpg').trim();
          const page = Number(payload.page) || 1;
          const active = payload.active !== false;
          const category = normalizeCategoryName(payload.category || 'Maquillaje');
          const category_id = await resolveCategoryId(sql, category, payload.category_id);
          const skin_tones_image = String(payload.skin_tones_image || '').trim();
          const skin_tones_count = Number(payload.skin_tones_count) || 0;

          // Insert into Neon database (with upsert if ID is provided)
          let inserted;
          if (payload.id && Number(payload.id) > 0) {
            const reqId = Number(payload.id);
            inserted = await sql`
              INSERT INTO products (id, name, price, image, page, active, category_id, category, skin_tones_image, skin_tones_count)
              VALUES (
                ${reqId},
                ${name},
                ${price},
                ${image},
                ${page},
                ${active},
                ${category_id},
                ${category},
                ${skin_tones_image},
                ${skin_tones_count}
              )
              ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                price = EXCLUDED.price,
                image = EXCLUDED.image,
                page = EXCLUDED.page,
                active = EXCLUDED.active,
                category_id = EXCLUDED.category_id,
                category = EXCLUDED.category,
                skin_tones_image = EXCLUDED.skin_tones_image,
                skin_tones_count = EXCLUDED.skin_tones_count
              RETURNING id, name, price, image, page, active, category_id, category, skin_tones_image, skin_tones_count;
            `;
            await sql`SELECT setval('products_id_seq', (SELECT GREATEST(MAX(id), ${reqId}) FROM products));`.catch(() => {});
          } else {
            inserted = await sql`
              INSERT INTO products (name, price, image, page, active, category_id, category, skin_tones_image, skin_tones_count)
              VALUES (
                ${name},
                ${price},
                ${image},
                ${page},
                ${active},
                ${category_id},
                ${category},
                ${skin_tones_image},
                ${skin_tones_count}
              )
              RETURNING id, name, price, image, page, active, category_id, category, skin_tones_image, skin_tones_count;
            `;
          }

          const newProduct = inserted[0];

          await insertAuditLog({
            level: 'INFO',
            action: 'PRODUCT_CREATE',
            status: 'OK',
            message: `Creado producto nuevo #${newProduct.id} "${newProduct.name}" ($${Number(newProduct.price).toLocaleString('es-CO')})`,
            details: {
              productId: newProduct.id,
              name: newProduct.name,
              price: newProduct.price,
              category: newProduct.category,
              active: newProduct.active
            },
            req
          });

          // Trigger background GitHub sync if configured
          sql`SELECT * FROM products ORDER BY id DESC`.then(allProds => {
            backgroundSyncToGithub(allProds).catch(() => {});
          }).catch(() => {});

          return sendJson(res, 201, newProduct);
        } catch (err) {
          console.error('[API POST /products Error]:', err);
          return sendJson(res, 500, { error: err.message });
        }
      }
    }

    // /api/products/:id
    if (segments.length === 2) {
      const productId = Number(segments[1]);

      if (method === 'GET') {
        try {
          const rows = await sql`
            SELECT p.id, p.name, p.price, p.image, p.page, p.active, p.category_id,
                   COALESCE(NULLIF(p.category, ''), c.name, 'Maquillaje') as category,
                   p.skin_tones_image, p.skin_tones_count
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.id = ${productId}
            LIMIT 1;
          `;
          if (!rows || rows.length === 0) {
            return sendJson(res, 404, { error: 'not_found', message: 'Producto no encontrado' });
          }
          return sendJson(res, 200, rows[0]);
        } catch (err) {
          return sendJson(res, 500, { error: err.message });
        }
      }

      if (['PUT', 'PATCH'].includes(method)) {
        const isAuth = await checkAdminAuth(req, payload);
        if (!isAuth) {
          return sendJson(res, 401, { error: 'unauthorized', message: 'Credenciales inválidas' });
        }

        try {
          // Fetch existing product first for diff audit
          const existing = await sql`SELECT * FROM products WHERE id = ${productId} LIMIT 1;`;
          if (!existing || existing.length === 0) {
            return sendJson(res, 404, { error: 'not_found', message: 'Producto no encontrado' });
          }
          const prev = existing[0];

          const name = payload.name != null ? String(payload.name).trim() : prev.name;
          const price = payload.price != null ? Number(String(payload.price).replace(/[^0-9]/g, '')) : prev.price;
          const image = (payload.image != null && payload.image !== '') ? String(payload.image).trim() : prev.image;
          const skin_tones_image = payload.skin_tones_image != null ? String(payload.skin_tones_image).trim() : prev.skin_tones_image;
          const skin_tones_count = payload.skin_tones_count != null ? Number(payload.skin_tones_count) : prev.skin_tones_count;
          const page = payload.page != null ? Number(payload.page) : prev.page;
          const active = payload.active != null ? Boolean(payload.active) : prev.active;
          const category = payload.category != null ? normalizeCategoryName(payload.category) : prev.category;
          const category_id = await resolveCategoryId(sql, category, payload.category_id != null ? payload.category_id : prev.category_id);

          const updated = await sql`
            UPDATE products
            SET name = ${name},
                price = ${price},
                image = ${image},
                skin_tones_image = ${skin_tones_image},
                skin_tones_count = ${skin_tones_count},
                page = ${page},
                active = ${active},
                category = ${category},
                category_id = ${category_id}
            WHERE id = ${productId}
            RETURNING id, name, price, image, page, active, category_id, category, skin_tones_image, skin_tones_count;
          `;

          const diff = {};
          if (prev.name !== name) diff.name = { before: prev.name, after: name };
          if (Number(prev.price) !== Number(price)) diff.price = { before: prev.price, after: price };
          if (prev.category !== category) diff.category = { before: prev.category, after: category };
          if (Boolean(prev.active) !== Boolean(active)) diff.active = { before: prev.active, after: active };
          const changedFields = Object.keys(diff);

          await insertAuditLog({
            level: 'INFO',
            action: 'PRODUCT_UPDATE',
            status: 'OK',
            message: `Editado producto #${productId} "${name}" [${changedFields.length > 0 ? changedFields.join(', ') : 'detalles actualizados'}]`,
            details: {
              productId,
              productName: name,
              changedFields,
              diff
            },
            req
          });

          // Background sync
          sql`SELECT * FROM products ORDER BY id DESC`.then(allProds => {
            backgroundSyncToGithub(allProds).catch(() => {});
          }).catch(() => {});

          return sendJson(res, 200, updated[0]);
        } catch (err) {
          console.error('[API UPDATE /products Error]:', err);
          return sendJson(res, 500, { error: err.message });
        }
      }

      if (method === 'DELETE') {
        const isAuth = await checkAdminAuth(req, payload);
        if (!isAuth) {
          return sendJson(res, 401, { error: 'unauthorized', message: 'Credenciales inválidas' });
        }

        try {
          const existing = await sql`SELECT id, name, price, category FROM products WHERE id = ${productId} LIMIT 1;`;
          const prodName = existing.length > 0 ? existing[0].name : `Producto #${productId}`;

          await sql`DELETE FROM products WHERE id = ${productId};`;

          await insertAuditLog({
            level: 'WARN',
            action: 'PRODUCT_DELETE',
            status: 'OK',
            message: `Eliminado producto #${productId} "${prodName}" del catálogo central`,
            details: { productId, name: prodName },
            req
          });

          // Background sync
          sql`SELECT * FROM products ORDER BY id DESC`.then(allProds => {
            backgroundSyncToGithub(allProds).catch(() => {});
          }).catch(() => {});

          return sendJson(res, 200, { deleted: true });
        } catch (err) {
          console.error('[API DELETE /products Error]:', err);
          return sendJson(res, 500, { error: err.message });
        }
      }
    }

    // /api/products/:id/state
    if (segments.length === 3 && segments[2] === 'state' && method === 'PATCH') {
      const isAuth = await checkAdminAuth(req, payload);
      if (!isAuth) {
        return sendJson(res, 401, { error: 'unauthorized', message: 'Credenciales inválidas' });
      }

      try {
        const productId = Number(segments[1]);
        const newActive = Boolean(payload.active);

        const updated = await sql`
          UPDATE products
          SET active = ${newActive}
          WHERE id = ${productId}
          RETURNING id, name, active;
        `;

        if (!updated || updated.length === 0) {
          return sendJson(res, 404, { error: 'not_found', message: 'Producto no encontrado' });
        }

        const prod = updated[0];
        await insertAuditLog({
          level: 'INFO',
          action: 'PRODUCT_TOGGLE',
          status: 'OK',
          message: `Visibilidad modificada: #${productId} "${prod.name}" pasa a ${newActive ? 'ACTIVO (visible)' : 'OCULTO (inactivo)'}`,
          details: { productId, productName: prod.name, newState: newActive ? 'ACTIVO' : 'OCULTO' },
          req
        });

        return sendJson(res, 200, prod);
      } catch (err) {
        return sendJson(res, 500, { error: err.message });
      }
    }
  }

  // -------------------------------------------------------------
  // Route: /api/settings (GET, PATCH) - Delivery, Wheel & Store Settings
  // -------------------------------------------------------------
  if (segments[0] === 'settings') {
    const DEFAULT_SETTINGS = {
      delivery_pereira: 7000,
      delivery_dosquebradas: 8000,
      delivery_free_min: 100000,
      delivery_free_enabled: true,
      wheel_enabled: true,
      wheel_min_purchase: 50000,
      wheel_prizes: [
        { id: 1, label: '10% DTO', type: 'percent', value: 10, code: 'VALEN10', prob: 25 },
        { id: 2, label: 'Envío Gratis', type: 'free_delivery', value: 0, code: 'ENVIOGRATIS', prob: 20 },
        { id: 3, label: '$5.000 DTO', type: 'fixed', value: 5000, code: 'VALEN5K', prob: 25 },
        { id: 4, label: '15% DTO', type: 'percent', value: 15, code: 'VALEN15', prob: 15 },
        { id: 5, label: 'Gloss Gratis', type: 'gift', value: 0, code: 'REGALOGLOSS', prob: 15 }
      ]
    };

    if (method === 'GET') {
      try {
        let settings = { ...DEFAULT_SETTINGS };
        if (sql) {
          const rows = await sql`SELECT key, value FROM store_settings;`;
          rows.forEach(r => {
            try {
              settings[r.key] = typeof r.value === 'string' ? JSON.parse(r.value) : r.value;
            } catch (e) {
              settings[r.key] = r.value;
            }
          });
        }
        return sendJson(res, 200, settings);
      } catch (err) {
        console.error('[API GET /settings Error]:', err.message);
        return sendJson(res, 200, DEFAULT_SETTINGS);
      }
    }

    if (method === 'PATCH' || method === 'POST') {
      const isAuth = await checkAdminAuth(req, payload);
      if (!isAuth) {
        return sendJson(res, 401, { error: 'unauthorized', message: 'Credenciales inválidas' });
      }

      try {
        if (sql) {
          for (const [key, val] of Object.entries(payload)) {
            if (key === 'adminPassword') continue;
            const valJson = JSON.stringify(val);
            await sql`
              INSERT INTO store_settings (key, value, updated_at)
              VALUES (${key}, ${valJson}::jsonb, NOW())
              ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
            `;
          }
        }

        await insertAuditLog({
          level: 'INFO',
          action: 'SETTINGS_UPDATE',
          status: 'OK',
          message: 'Configuración general de la tienda actualizada (Domicilios / Ruleta)',
          details: payload,
          req
        });

        return sendJson(res, 200, { updated: true, settings: payload });
      } catch (err) {
        console.error('[API PATCH /settings Error]:', err.message);
        return sendJson(res, 500, { error: err.message });
      }
    }
  }

  // -------------------------------------------------------------
  // Route: /api/orders (GET, POST, PATCH /status)
  // -------------------------------------------------------------
  if (segments[0] === 'orders') {
    if (segments.length === 1 && method === 'GET') {
      const isAuth = await checkAdminAuth(req, payload);
      if (!isAuth) {
        return sendJson(res, 401, { error: 'unauthorized', message: 'Credenciales inválidas' });
      }
      try {
        if (!sql) return sendJson(res, 200, []);
        const rows = await sql`
          SELECT id, created_at as "createdAt", customer_name as "customerName",
                 customer_phone as "customerPhone", city, barrio, address, reference,
                 items, subtotal, delivery_fee as "deliveryFee", discount, total,
                 payment_method as "paymentMethod", notes, status
          FROM orders
          ORDER BY created_at DESC
          LIMIT 150;
        `;
        return sendJson(res, 200, rows);
      } catch (err) {
        return sendJson(res, 500, { error: err.message });
      }
    }

    if (segments.length === 1 && method === 'POST') {
      try {
        const {
          customerName, customerPhone, city, barrio, address, reference,
          items, subtotal, deliveryFee, discount, total, paymentMethod, notes
        } = payload;

        if (!customerName || !city || !barrio || !address || !items || !total) {
          return sendJson(res, 400, { error: 'missing_fields', message: 'Faltan campos obligatorios para el pedido' });
        }

        const orderId = 'VALEN-' + Date.now().toString(36).toUpperCase();
        const itemsJson = typeof items === 'string' ? items : JSON.stringify(items);

        let createdOrder = null;
        if (sql) {
          const inserted = await sql`
            INSERT INTO orders (
              id, customer_name, customer_phone, city, barrio, address, reference,
              items, subtotal, delivery_fee, discount, total, payment_method, notes, status
            ) VALUES (
              ${orderId},
              ${String(customerName).trim()},
              ${String(customerPhone || '').trim()},
              ${String(city).trim()},
              ${String(barrio).trim()},
              ${String(address).trim()},
              ${String(reference || '').trim()},
              ${itemsJson}::jsonb,
              ${Number(subtotal) || 0},
              ${Number(deliveryFee) || 0},
              ${Number(discount) || 0},
              ${Number(total) || 0},
              ${String(paymentMethod || 'Contraentrega').trim()},
              ${String(notes || '').trim()},
              'Pendiente'
            )
            RETURNING id, created_at, customer_name, total, status;
          `;
          createdOrder = inserted[0];
        }

        await insertAuditLog({
          level: 'INFO',
          action: 'ORDER_CREATE',
          status: 'OK',
          message: `Nuevo pedido registrado #${orderId} de ${customerName} ($${Number(total).toLocaleString('es-CO')})`,
          details: { orderId, customerName, city, barrio, total, paymentMethod },
          req
        });

        return sendJson(res, 201, { created: true, orderId, order: createdOrder });
      } catch (err) {
        console.error('[API POST /orders Error]:', err.message);
        return sendJson(res, 500, { error: err.message });
      }
    }

    // PATCH /api/orders/:id/status
    if (segments.length === 3 && segments[2] === 'status' && (method === 'PATCH' || method === 'PUT')) {
      const isAuth = await checkAdminAuth(req, payload);
      if (!isAuth) {
        return sendJson(res, 401, { error: 'unauthorized', message: 'Credenciales inválidas' });
      }

      const orderId = segments[1];
      const newStatus = String(payload.status || 'Pendiente').trim();

      try {
        if (sql) {
          await sql`
            UPDATE orders
            SET status = ${newStatus}
            WHERE id = ${orderId};
          `;
        }

        await insertAuditLog({
          level: 'INFO',
          action: 'ORDER_STATUS_UPDATE',
          status: 'OK',
          message: `Pedido #${orderId} actualizado a estado "${newStatus}"`,
          details: { orderId, status: newStatus },
          req
        });

        return sendJson(res, 200, { updated: true, orderId, status: newStatus });
      } catch (err) {
        return sendJson(res, 500, { error: err.message });
      }
    }
  }

  // -------------------------------------------------------------
  // Route: /api/reviews (GET, POST, PATCH, DELETE)
  // -------------------------------------------------------------
  if (segments[0] === 'reviews') {
    if (segments.length === 1 && method === 'GET') {
      try {
        const seeAll = urlObj.searchParams.get('all') === 'true';
        if (seeAll) {
          const isAuth = await checkAdminAuth(req, payload);
          if (!isAuth) {
            return sendJson(res, 401, { error: 'unauthorized', message: 'Credenciales inválidas' });
          }
          const rows = await sql`
            SELECT id, product_id as "productId", product_name as "productName",
                   customer_name as "customerName", rating, comment,
                   date_formatted as "dateFormatted", photo_url as "photoUrl",
                   verified_purchase as "verifiedPurchase", approved, featured
            FROM reviews
            ORDER BY id DESC;
          `;
          return sendJson(res, 200, rows);
        }

        // Public reviews: only approved
        const rows = await sql`
          SELECT id, product_id as "productId", product_name as "productName",
                 customer_name as "customerName", rating, comment,
                 date_formatted as "dateFormatted", photo_url as "photoUrl",
                 verified_purchase as "verifiedPurchase", approved, featured
          FROM reviews
          WHERE approved = TRUE
          ORDER BY featured DESC, id DESC
          LIMIT 50;
        `;
        return sendJson(res, 200, rows);
      } catch (err) {
        return sendJson(res, 500, { error: err.message });
      }
    }

    if (segments.length === 1 && method === 'POST') {
      try {
        const { customerName, rating, comment, productId, productName, photoUrl, orderId } = payload;
        if (!customerName || !comment) {
          return sendJson(res, 400, { error: 'missing_fields', message: 'Nombre y reseña son obligatorios' });
        }

        // Check if verified order
        let isVerified = false;
        if (orderId && sql) {
          const checkOrd = await sql`SELECT id FROM orders WHERE id = ${String(orderId).trim()} LIMIT 1;`;
          if (checkOrd.length > 0) isVerified = true;
        }

        const today = new Date();
        const dateFormatted = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

        const inserted = await sql`
          INSERT INTO reviews (
            product_id, product_name, customer_name, rating, comment,
            date_formatted, photo_url, verified_purchase, approved, featured
          ) VALUES (
            ${productId ? Number(productId) : null},
            ${String(productName || '').trim()},
            ${String(customerName).trim()},
            ${Math.max(1, Math.min(5, Number(rating) || 5))},
            ${String(comment).trim()},
            ${dateFormatted},
            ${String(photoUrl || '').trim()},
            ${isVerified},
            TRUE,
            FALSE
          )
          RETURNING id, customer_name, rating, comment, date_formatted, verified_purchase, approved;
        `;

        await insertAuditLog({
          level: 'INFO',
          action: 'REVIEW_SUBMIT',
          status: 'OK',
          message: `Nueva reseña recibida de ${customerName} (${rating} estrellas): "${String(comment).slice(0, 30)}..."`,
          details: { reviewId: inserted[0].id, customerName, rating, isVerified },
          req
        });

        return sendJson(res, 201, inserted[0]);
      } catch (err) {
        return sendJson(res, 500, { error: err.message });
      }
    }

    if (segments.length === 2 && (method === 'PATCH' || method === 'PUT')) {
      const isAuth = await checkAdminAuth(req, payload);
      if (!isAuth) {
        return sendJson(res, 401, { error: 'unauthorized', message: 'Credenciales inválidas' });
      }

      const reviewId = Number(segments[1]);
      try {
        const approved = payload.approved !== undefined ? Boolean(payload.approved) : undefined;
        const featured = payload.featured !== undefined ? Boolean(payload.featured) : undefined;

        if (approved !== undefined && featured !== undefined) {
          await sql`UPDATE reviews SET approved = ${approved}, featured = ${featured} WHERE id = ${reviewId};`;
        } else if (approved !== undefined) {
          await sql`UPDATE reviews SET approved = ${approved} WHERE id = ${reviewId};`;
        } else if (featured !== undefined) {
          await sql`UPDATE reviews SET featured = ${featured} WHERE id = ${reviewId};`;
        }

        return sendJson(res, 200, { updated: true, reviewId });
      } catch (err) {
        return sendJson(res, 500, { error: err.message });
      }
    }

    if (segments.length === 2 && method === 'DELETE') {
      const isAuth = await checkAdminAuth(req, payload);
      if (!isAuth) {
        return sendJson(res, 401, { error: 'unauthorized', message: 'Credenciales inválidas' });
      }
      const reviewId = Number(segments[1]);
      try {
        await sql`DELETE FROM reviews WHERE id = ${reviewId};`;
        return sendJson(res, 200, { deleted: true, reviewId });
      } catch (err) {
        return sendJson(res, 500, { error: err.message });
      }
    }
  }

  // -------------------------------------------------------------
  // Route: /api/looks (GET, POST, PATCH, DELETE) - "Compra el Look"
  // -------------------------------------------------------------
  if (segments[0] === 'looks') {
    if (segments.length === 1 && method === 'GET') {
      try {
        const isAuth = await checkAdminAuth(req, payload);
        let rows = [];
        if (isAuth && urlObj.searchParams.get('all') === 'true') {
          rows = await sql`
            SELECT id, title, tagline, description, image, products,
                   individual_price as "individualPrice", bundle_price as "bundlePrice",
                   savings, active
            FROM looks
            ORDER BY id ASC;
          `;
        } else {
          rows = await sql`
            SELECT id, title, tagline, description, image, products,
                   individual_price as "individualPrice", bundle_price as "bundlePrice",
                   savings, active
            FROM looks
            WHERE active = TRUE
            ORDER BY id ASC;
          `;
        }
        return sendJson(res, 200, rows);
      } catch (err) {
        return sendJson(res, 500, { error: err.message });
      }
    }

    if (segments.length === 1 && method === 'POST') {
      const isAuth = await checkAdminAuth(req, payload);
      if (!isAuth) {
        return sendJson(res, 401, { error: 'unauthorized', message: 'Credenciales inválidas' });
      }

      try {
        const { title, tagline, description, image, products, individualPrice, bundlePrice } = payload;
        const indPrice = Number(individualPrice) || 0;
        const bndPrice = Number(bundlePrice) || 0;
        const sav = Math.max(0, indPrice - bndPrice);
        const prodJson = typeof products === 'string' ? products : JSON.stringify(products || []);

        const inserted = await sql`
          INSERT INTO looks (
            title, tagline, description, image, products, individual_price, bundle_price, savings, active
          ) VALUES (
            ${String(title).trim()},
            ${String(tagline || '').trim()},
            ${String(description || '').trim()},
            ${String(image || 'img/product_1.jpg').trim()},
            ${prodJson}::jsonb,
            ${indPrice},
            ${bndPrice},
            ${sav},
            TRUE
          )
          RETURNING id, title, tagline, description, image, products, individual_price as "individualPrice", bundle_price as "bundlePrice", savings, active;
        `;

        await insertAuditLog({
          level: 'INFO',
          action: 'LOOK_CREATE',
          status: 'OK',
          message: `Nuevo Look creado: "${title}" (Precio Kit: $${bndPrice.toLocaleString('es-CO')})`,
          details: { lookId: inserted[0].id, title, bndPrice },
          req
        });

        return sendJson(res, 201, inserted[0]);
      } catch (err) {
        return sendJson(res, 500, { error: err.message });
      }
    }

    if (segments.length === 2 && (method === 'PATCH' || method === 'PUT')) {
      const isAuth = await checkAdminAuth(req, payload);
      if (!isAuth) {
        return sendJson(res, 401, { error: 'unauthorized', message: 'Credenciales inválidas' });
      }

      const lookId = Number(segments[1]);
      try {
        const { title, tagline, description, image, products, individualPrice, bundlePrice, active } = payload;
        const indPrice = individualPrice != null ? Number(individualPrice) : undefined;
        const bndPrice = bundlePrice != null ? Number(bundlePrice) : undefined;
        const sav = (indPrice != null && bndPrice != null) ? Math.max(0, indPrice - bndPrice) : undefined;
        const prodJson = products ? (typeof products === 'string' ? products : JSON.stringify(products)) : undefined;

        await sql`
          UPDATE looks
          SET title = COALESCE(${title}, title),
              tagline = COALESCE(${tagline}, tagline),
              description = COALESCE(${description}, description),
              image = COALESCE(${image}, image),
              products = COALESCE(${prodJson ? prodJson + '::jsonb' : null}, products),
              individual_price = COALESCE(${indPrice}, individual_price),
              bundle_price = COALESCE(${bndPrice}, bundle_price),
              savings = COALESCE(${sav}, savings),
              active = COALESCE(${active != null ? Boolean(active) : null}, active)
          WHERE id = ${lookId};
        `;

        return sendJson(res, 200, { updated: true, lookId });
      } catch (err) {
        return sendJson(res, 500, { error: err.message });
      }
    }

    if (segments.length === 2 && method === 'DELETE') {
      const isAuth = await checkAdminAuth(req, payload);
      if (!isAuth) {
        return sendJson(res, 401, { error: 'unauthorized', message: 'Credenciales inválidas' });
      }
      const lookId = Number(segments[1]);
      try {
        await sql`DELETE FROM looks WHERE id = ${lookId};`;
        return sendJson(res, 200, { deleted: true, lookId });
      } catch (err) {
        return sendJson(res, 500, { error: err.message });
      }
    }
  }

  // -------------------------------------------------------------
  // Route: /api/coupons (GET, POST, DELETE)
  // -------------------------------------------------------------
  if (segments[0] === 'coupons') {
    if (segments.length === 1 && method === 'GET') {
      const codeQuery = urlObj.searchParams.get('code');
      try {
        if (codeQuery) {
          const rows = await sql`
            SELECT code, discount_type as "discountType", discount_value as "discountValue",
                   min_order as "minOrder", active
            FROM coupons
            WHERE LOWER(code) = LOWER(${String(codeQuery).trim()}) AND active = TRUE
            LIMIT 1;
          `;
          if (rows.length === 0) {
            return sendJson(res, 404, { error: 'not_found', message: 'Cupón no válido o inactivo' });
          }
          return sendJson(res, 200, rows[0]);
        }

        // Admin list all coupons
        const isAuth = await checkAdminAuth(req, payload);
        if (!isAuth) {
          return sendJson(res, 401, { error: 'unauthorized', message: 'Credenciales inválidas' });
        }
        const rows = await sql`SELECT * FROM coupons ORDER BY code ASC;`;
        return sendJson(res, 200, rows);
      } catch (err) {
        return sendJson(res, 500, { error: err.message });
      }
    }

    if (segments.length === 1 && method === 'POST') {
      const isAuth = await checkAdminAuth(req, payload);
      if (!isAuth) {
        return sendJson(res, 401, { error: 'unauthorized', message: 'Credenciales inválidas' });
      }
      try {
        const { code, discountType, discountValue, minOrder } = payload;
        if (!code || !discountType || discountValue == null) {
          return sendJson(res, 400, { error: 'missing_fields', message: 'Código, tipo y valor son requeridos' });
        }

        const cleanCode = String(code).trim().toUpperCase();
        await sql`
          INSERT INTO coupons (code, discount_type, discount_value, min_order, active)
          VALUES (
            ${cleanCode},
            ${String(discountType).trim()},
            ${Number(discountValue)},
            ${Number(minOrder) || 0},
            TRUE
          )
          ON CONFLICT (code) DO UPDATE SET
            discount_type = EXCLUDED.discount_type,
            discount_value = EXCLUDED.discount_value,
            min_order = EXCLUDED.min_order,
            active = TRUE;
        `;
        return sendJson(res, 201, { created: true, code: cleanCode });
      } catch (err) {
        return sendJson(res, 500, { error: err.message });
      }
    }

    if (segments.length === 2 && method === 'DELETE') {
      const isAuth = await checkAdminAuth(req, payload);
      if (!isAuth) {
        return sendJson(res, 401, { error: 'unauthorized', message: 'Credenciales inválidas' });
      }
      try {
        const code = decodeURIComponent(segments[1]).toUpperCase();
        await sql`DELETE FROM coupons WHERE UPPER(code) = ${code};`;
        return sendJson(res, 200, { deleted: true, code });
      } catch (err) {
        return sendJson(res, 500, { error: err.message });
      }
    }
  }

  return sendJson(res, 404, { error: 'not_found', message: 'Ruta no encontrada' });
};

