Despliegue rápido - Valen Makeup

Resumen
- Este repositorio contiene un frontend estático (`index.html`, `script.js`, `styles.css`) y un backend en Flask (`backend.py`, `db.py`). La aplicación usa SQLite por defecto, pero recomendamos usar un Postgres gestionado (Neon, Supabase, Railway) en producción.

Requisitos
- Python 3.9+ (localmente)
- `pip install -r requirements.txt`

Pasos para desplegar usando Neon (Postgres) + Render (o cualquier servicio que acepte `DATABASE_URL`):

1) Crear base de datos en Neon
  - En Neon crea un proyecto y copia la `DATABASE_URL` (cadena de conexión Postgres).

2) Subir el código a GitHub
  - Incluye todos los archivos listados en el repo (no incluyas `catalog.db`).

3) Configurar el servicio de hosting para el backend (ej. Render, Railway, Fly, Heroku alternative)
  - Crea un nuevo servicio (tipo web) que ejecute `python backend.py`.
  - Variables de entorno recomendadas:
    - `DATABASE_URL`: la cadena de Neon.
    - `ADMIN_PASSWORD`: cambia el valor por seguridad (por defecto es `2006`).
    - `HOST`: `0.0.0.0` (opcional)
    - `PORT`: `5000` (o el puerto que el proveedor asigne)
    - `FLASK_DEBUG`: `false`

4) Si usas Render: crea servicio web con el repo y en build command deja `pip install -r requirements.txt`, start command `python backend.py`.

5) Frontend
  - Puedes servir el frontend desde el mismo backend (está integrado) o desplegarlo en Netlify/Vercel. Si lo sirves separado, en `index.html` cambia `window.API_BASE_URL` por la URL del backend.

6) Seguridad
  - Cambia `ADMIN_PASSWORD` desde las variables de entorno o usando el endpoint PATCH `/api/admin/password` (requiere la contraseña actual).
  - Mantén `DATABASE_URL` privado.

Comandos útiles (local testing)
```bash
python -m venv venv
source venv/Scripts/activate    # Windows: venv\\Scripts\\activate
pip install -r requirements.txt
set DATABASE_URL=postgres://... # Windows PowerShell: $env:DATABASE_URL='postgres://...'
set ADMIN_PASSWORD=2006
python backend.py
```

Notas sobre Neon
- Neon provee una URL Postgres. Pega esa URL en `DATABASE_URL` en el servicio de hosting. `db.py` detectará Postgres automáticamente y creará las tablas.

Neon — `API_URL` vs `DATABASE_URL`
- Neon puede mostrar dos cosas en su consola:
  - `API_URL` o endpoint REST (ej. `https://.../neondb/rest/v1`): es un endpoint HTTP tipo PostgREST para consultas desde el frontend o integraciones; NO es la cadena de conexión que necesita `db.py`.
  - `DATABASE_URL` (connection string Postgres): es la cadena que debes usar en la variable de entorno `DATABASE_URL` para que `db.py` pueda conectarse con `psycopg`.

Pasos rápidos si ves solo `API_URL` en la consola:
1. En Neon, abre la sección de conexión (connection settings) o credenciales y copia la `connection string` (formato `postgres://user:pass@host:port/dbname`).
2. En tu servicio (Render, Railway, etc.) añade la variable de entorno `DATABASE_URL` con esa cadena.
3. Si por alguna razón solo quieres usar el endpoint REST (`API_URL`), coméntamelo y adapto `db.py` para usar llamadas HTTP a PostgREST en lugar de psycopg (es posible, pero cambia la lógica actual).

Ejemplo — setear variable localmente (Windows PowerShell):
```powershell
$env:DATABASE_URL = 'postgres://user:password@host:5432/dbname'
$env:ADMIN_PASSWORD = 'tu_nueva_clave'
python backend.py
```

Ejemplo — setear en Render / Railway: añade `DATABASE_URL` en las variables de entorno del servicio con la cadena que copiaste de Neon.


Archivos a subir
- `backend.py`, `db.py`, `index.html`, `script.js`, `styles.css`, `requirements.txt`, `extracted_products.json`, `Procfile`, `runtime.txt`, `Dockerfile` (opcional), `README_DEPLOY.md`.

Limpiar antes de subir
- Ignora con `.gitignore`: `catalog.db`, `venv/`, `__pycache__/`.

Si quieres, preparo los cambios: añado `.gitignore` y dejo un `Procfile` mínimo listo para Render/Heroku.


S3 / Neon Object Storage (subida de imágenes)
- Si quieres subir imágenes al storage de Neon (S3-compatible), añade estas variables de entorno en el servicio:
  - `AWS_ENDPOINT_URL_S3` (ej. https://<bucket>.storage.c-5.us-east-2.aws.neon.tech)
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
  - `AWS_REGION`

- Flujo recomendado:
  1. Crea un bucket en Neon Storage y configura permisos (lectura pública para objetos si quieres servir imágenes directamente).
  2. Añade las variables de entorno anteriores en el panel de tu hosting (Render/Railway/Neon).
  3. Opcional: implementar en el backend un endpoint `/api/upload` que reciba archivos y los suba al bucket S3-compatible, devolviendo la URL pública para almacenar en `image` del producto.
  4. Alternativa más simple: subir imágenes manualmente al bucket y pegar la URL en el campo `URL de imagen` del panel administrativo.

- Prueba localmente definiendo las variables de entorno y ejecutando `python backend.py`.

- Seguridad: no compartas las claves en público. Si ya pegaste las claves en un chat público, revócalas y crea nuevas.

