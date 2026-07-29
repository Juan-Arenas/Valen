# Ventas Maquillaje

Este proyecto ya puede integrarse con un bot de Telegram para actualizar el catálogo desde el teléfono.

## Arquitectura actualizada: backend + base de datos

Este proyecto ahora incluye un backend en Python con SQLite para almacenar el catálogo en una base de datos y un bot de Telegram que actualiza directamente esa base de datos.

### Qué puede hacer ahora
- El catálogo se guarda en `catalog.db` en SQLite.
- El bot de Telegram actualiza el catálogo en la base de datos.
- El frontend carga `GET /api/products` desde el backend.
- Sigue existiendo un fallback local a `extracted_products.json` si el backend no está disponible.

### Requisitos
- Python 3.10+
- Token de bot de Telegram
- IDs de usuarios autorizados para el bot

### Instalación
```powershell
python -m pip install -r requirements.txt
```

### Ejecución del backend
```powershell
python backend.py
```

El backend expone estas rutas:
- `GET /api/products` - productos activos por defecto
- `GET /api/products?active=false` - todos los productos
- `GET /api/products/<id>` - producto por ID
- `POST /api/products` - crear producto
- `PUT /api/products/<id>` - actualizar producto
- `PATCH /api/products/<id>/state` - cambiar estado activo/inactivo
- `GET /api/health` - estado del servicio

### Configuración del bot
Configura las variables de entorno antes de iniciar el bot:
```powershell
$env:BOT_TOKEN = "TU_TOKEN_DE_TELEGRAM"
$env:AUTHORIZED_USERS = "123456789,987654321"
```

### Ejecución del bot
```powershell
python telegram_bot.py
```

### Despliegue recomendado
Este proyecto está preparado para desplegarse en servicios como Railway, Fly.io o Heroku.

- Frontend + backend juntos: el backend sirve `index.html`, `styles.css`, `script.js`, `img/` y la API.
- Bot de Telegram: se ejecuta como un worker continuo.

Variables de entorno para producción:
- `DATABASE_URL` (opcional): URL de Postgres si usas una base de datos en la nube.
- `BOT_TOKEN`: token de Telegram.
- `AUTHORIZED_USERS`: lista de IDs de Telegram autorizados.
- `HOST`: host del servicio (por defecto `0.0.0.0`).
- `PORT`: puerto HTTP para el backend.
- `FLASK_DEBUG`: `true` o `false`.

### Despliegue en Heroku
Para desplegar en Heroku, sigue este flujo:

1. Instala Heroku CLI en Windows:
```powershell
choco install heroku-cli
```
2. Inicia sesión y crea la app:
```powershell
cd "C:\Users\Juan Arenas\Downloads\Ventas Maquillaje"
heroku login
heroku create nombre-de-tu-app
```
3. Añade Postgres:
```powershell
heroku addons:create heroku-postgresql:hobby-dev --app nombre-de-tu-app
```
4. Configura variables de entorno en Heroku:
```powershell
heroku config:set BOT_TOKEN="TU_BOT_TOKEN" AUTHORIZED_USERS="123456789,987654321" FLASK_DEBUG=false --app nombre-de-tu-app
```
5. Empuja tu código y arranca los procesos:
```powershell
git push heroku main
heroku ps:scale web=1 worker=1 --app nombre-de-tu-app
```
6. Verifica que funciona:
```powershell
heroku open --app nombre-de-tu-app
heroku logs --tail --app nombre-de-tu-app
```

Comprueba también:
- `https://nombre-de-tu-app.herokuapp.com/api/health`
- Envía `/help` al bot de Telegram para confirmar que responde.

### Procfile
El archivo `Procfile` expone:
```text
web: gunicorn backend:app --bind 0.0.0.0:$PORT
worker: python telegram_bot.py
```

### Hosting con Postgres
Si despliegas con `DATABASE_URL`, `db.py` usará Postgres automáticamente en lugar de SQLite.

### API remota en el frontend
`script.js` ahora usa `window.API_BASE_URL` si está configurado. Si no, usa `/api/products` localmente.

### Archivo runtime
Se incluye `runtime.txt` para servicios que usan la versión de Python definida en ese archivo.

### Contenedores Docker
También puedes ejecutar todo con Docker y Docker Compose:

```bash
docker compose up --build
```

Esto levanta:
- `web`: backend y frontend disponibles en `http://localhost:5000`
- `bot`: worker del bot de Telegram

Asegúrate de definir en tu entorno:
- `BOT_TOKEN`
- `AUTHORIZED_USERS`
- `DATABASE_URL` (opcional)

### Comandos disponibles
- `/help` - Mostrar ayuda
- `/format` - Ver el formato de actualización de producto
- `/list` - Listar productos activos
- `/list_all` - Listar todos los productos
- `/activate <id>` o `/subir <id>` - Activar producto
- `/deactivate <id>` o `/bajar <id>` - Desactivar producto
- `/status <id>` - Ver detalles de un producto
- `/set_price <id> <precio>` - Cambiar precio
- `/set_name <id> <nombre>` - Cambiar nombre
- `/set_image <id> <url>` - Cambiar imagen desde URL
- `/add_product Nombre;Precio;Imagen;Página` - Agregar producto nuevo
- `/delete` - Seleccionar y borrar un producto con botones interactivos
- Enviar una foto con caption `/set_image <id>` para subir la imagen localmente
- Enviar una foto con caption `/add_product Nombre;Precio;Página` para crear un producto y guardar la imagen

### Cómo funciona la web ahora
`script.js` intenta primero cargar los productos desde el backend en `/api/products`.
Si no encuentra el backend, usa `extracted_products.json` como fallback.

Para desplegar la web y el backend juntos, sirve el frontend desde el mismo host que `backend.py`.
Si el frontend se publica en un servicio separado, actualiza la URL en `script.js` o usa un proxy hacia la API.

### Datos del catálogo
El backend usa la base de datos SQLite y carga inicialmente `extracted_products.json` en `catalog.db` solo la primera vez.
Los productos deben tener estos campos:
- `id` (número)
- `name` (nombre del producto)
- `price` (precio en pesos)
- `image` (ruta local o URL de la imagen)
- `page` (número de página, opcional)
- `active` (true/false para mostrar u ocultar)

Ejemplo de producto:
```json
{
  "id": 1,
  "name": "Labial rojo",
  "price": 12900,
  "image": "img/product_201.jpg",
  "page": 5,
  "active": true
}
```

### Usuarios autorizados
Configura los IDs en la variable de entorno `AUTHORIZED_USERS`:
```powershell
$env:AUTHORIZED_USERS = "123456789,987654321"
```
El bot solo responderá a esos usuarios.

Para obtener el ID de Telegram de un usuario, se puede usar un bot como @userinfobot o pedirle que ejecute `/start` y registrar el ID que aparece en el log del bot.
