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

async function insertAuditLog({ level = 'INFO', action, status = 'OK', message, details = {}, req }) {
  if (!sql) return null;
  try {
    const id = 'valen_log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const ip = req ? getClientIp(req) : 'Server Internal';
    const ua = req ? getClientUserAgent(req) : 'Internal Node';
    const devInfo = parseDeviceInfo(ua);
    const timeFormatted = formatNowDate();

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
        ${JSON.stringify(details)},
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
          let actualId = null;

          if (!isNaN(catId) && String(catId) === rawParam) {
            actualId = catId;
            const rows = await sql`SELECT id, name FROM categories WHERE id = ${catId} LIMIT 1;`;
            if (rows.length > 0) catName = rows[0].name;
          } else {
            catName = rawParam;
            const rows = await sql`SELECT id, name FROM categories WHERE LOWER(name) = LOWER(${rawParam}) LIMIT 1;`;
            if (rows.length > 0) {
              actualId = rows[0].id;
              catName = rows[0].name;
            }
          }

          // Step 1: Reassign products to avoid foreign key violation
          if (actualId) {
            await sql`
              UPDATE products 
              SET category_id = NULL, category = 'Maquillaje' 
              WHERE category_id = ${actualId};
            `;
          }
          if (catName) {
            await sql`
              UPDATE products 
              SET category = 'Maquillaje' 
              WHERE LOWER(category) = LOWER(${catName});
            `;
          }

          // Step 2: Delete from categories
          if (actualId) {
            await sql`DELETE FROM categories WHERE id = ${actualId};`;
          } else if (catName) {
            await sql`DELETE FROM categories WHERE LOWER(name) = LOWER(${catName});`;
          }

          await insertAuditLog({
            level: 'INFO',
            action: 'CATEGORY_DELETE',
            status: 'OK',
            message: `Categoría "${catName || rawParam}" eliminada del catálogo por el administrador`,
            details: { categoryId: actualId, name: catName || rawParam },
            req
          });
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
          let actualId = null;

          if (!isNaN(catId) && String(catId) === rawParam) {
            actualId = catId;
            const rows = await sql`SELECT id, name FROM categories WHERE id = ${catId} LIMIT 1;`;
            if (rows.length > 0) oldName = rows[0].name;
          } else {
            oldName = rawParam;
            const rows = await sql`SELECT id, name FROM categories WHERE LOWER(name) = LOWER(${rawParam}) LIMIT 1;`;
            if (rows.length > 0) {
              actualId = rows[0].id;
              oldName = rows[0].name;
            }
          }

          if (actualId) {
            await sql`UPDATE categories SET name = ${newName} WHERE id = ${actualId};`;
          } else if (oldName) {
            await sql`UPDATE categories SET name = ${newName} WHERE LOWER(name) = LOWER(${oldName});`;
          }

          if (oldName) {
            await sql`UPDATE products SET category = ${newName} WHERE LOWER(category) = LOWER(${oldName});`;
          }

          await insertAuditLog({
            level: 'INFO',
            action: 'CATEGORY_UPDATE',
            status: 'OK',
            message: `Categoría "${oldName || rawParam}" renombrada a "${newName}"`,
            details: { categoryId: actualId, oldName, newName },
            req
          });
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
          const categoryId = urlObj.searchParams.get('category_id');

          let rows = [];
          if (sql) {
            if (activeOnly && categoryId) {
              rows = await sql`
                SELECT p.id, p.name, p.price, p.image, p.page, p.active, p.category_id,
                       COALESCE(NULLIF(p.category, ''), c.name, 'Maquillaje') as category,
                       p.skin_tones_image, p.skin_tones_count
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                WHERE p.active = TRUE AND p.category_id = ${Number(categoryId)}
                ORDER BY p.id DESC;
              `;
            } else if (activeOnly) {
              rows = await sql`
                SELECT p.id, p.name, p.price, p.image, p.page, p.active, p.category_id,
                       COALESCE(NULLIF(p.category, ''), c.name, 'Maquillaje') as category,
                       p.skin_tones_image, p.skin_tones_count
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                WHERE p.active = TRUE
                ORDER BY p.id DESC;
              `;
            } else if (categoryId) {
              rows = await sql`
                SELECT p.id, p.name, p.price, p.image, p.page, p.active, p.category_id,
                       COALESCE(NULLIF(p.category, ''), c.name, 'Maquillaje') as category,
                       p.skin_tones_image, p.skin_tones_count
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                WHERE p.category_id = ${Number(categoryId)}
                ORDER BY p.id DESC;
              `;
            } else {
              rows = await sql`
                SELECT p.id, p.name, p.price, p.image, p.page, p.active, p.category_id,
                       COALESCE(NULLIF(p.category, ''), c.name, 'Maquillaje') as category,
                       p.skin_tones_image, p.skin_tones_count
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
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
          const category_id = payload.category_id ? Number(payload.category_id) : 5;
          const skin_tones_image = String(payload.skin_tones_image || '').trim();
          const skin_tones_count = Number(payload.skin_tones_count) || 0;

          // Insert into Neon database
          const inserted = await sql`
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
          const category_id = payload.category_id != null ? Number(payload.category_id) : prev.category_id;

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

  return sendJson(res, 404, { error: 'not_found', message: 'Ruta no encontrada' });
};
