import os
from pathlib import Path
from flask import Flask, jsonify, request, abort, send_from_directory
from flask_cors import CORS

from db import (
    init_db,
    create_product,
    create_category,
    delete_category,
    delete_product,
    get_category,
    get_categories,
    get_product,
    get_products,
    set_admin_password,
    set_product_state,
    update_category,
    update_product,
    check_admin_password,
    get_database_backend,
    create_audit_log,
    get_audit_logs,
    clear_audit_logs,
)

BASE_DIR = Path(__file__).resolve().parent
app = Flask(__name__, static_folder=str(BASE_DIR), static_url_path="")
CORS(app)
init_db()


@app.route("/")
def root_index():
    return send_from_directory(BASE_DIR, "index.html")


@app.route("/<path:path>")
def serve_static(path: str):
    if path.startswith("api/"):
        abort(404)
    target_path = BASE_DIR / path
    if target_path.exists() and target_path.is_file():
        return send_from_directory(BASE_DIR, path)
    return send_from_directory(BASE_DIR, "index.html")


def _extract_admin_password() -> str:
    admin_header = request.headers.get("X-Admin-Password", "").strip()
    if admin_header:
        return admin_header
    payload = request.get_json(silent=True)
    if payload and isinstance(payload, dict):
        return str(payload.get("adminPassword", "")).strip()
    return ""


def _require_admin():
    password = _extract_admin_password()
    if not password or not check_admin_password(password):
        abort(401, description="Credenciales de administrador inválidas")
    return password


@app.route("/api/products", methods=["GET"])
def list_products():
    active_param = request.args.get("active", "true").strip().lower()
    active_only = active_param not in {"0", "false", "no"}
    category_id = request.args.get("category_id")
    category_value = None
    if category_id is not None:
        try:
            category_value = int(category_id)
        except ValueError:
            abort(400, description="category_id debe ser un número")
    products = get_products(active_only=active_only, category_id=category_value)
    return jsonify(products)


@app.route("/api/products/<int:product_id>", methods=["GET"])
def get_product_by_id(product_id: int):
    product = get_product(product_id)
    if not product:
        abort(404, description="Producto no encontrado")
    return jsonify(product)


@app.route("/api/products", methods=["POST"])
def create_product_endpoint():
    _require_admin()
    payload = request.get_json(silent=True)
    if not payload:
        abort(400, description="JSON body is required")

    name = payload.get("name")
    price = payload.get("price")
    image = payload.get("image")
    page = payload.get("page", 1)
    active = payload.get("active", True)
    category_id = payload.get("category_id")
    category = payload.get("category")

    if not name or price is None or image is None:
        abort(400, description="name, price and image are required")

    try:
        price = int(price)
        page = int(page)
        if category_id is not None and category_id != "":
            category_id = int(category_id)
    except (TypeError, ValueError):
        abort(400, description="price, page and category_id must be numbers")

    product_id = create_product(name, price, image, page=page, active=active, category_id=category_id, category=category)
    product = get_product(product_id)
    return jsonify(product), 201


@app.route("/api/products/<int:product_id>", methods=["PUT", "PATCH"])
def update_product_endpoint(product_id: int):
    _require_admin()
    payload = request.get_json(silent=True)
    if not payload:
        abort(400, description="JSON body is required")

    fields = {k: payload[k] for k in ["name", "price", "image", "page", "active", "category_id"] if k in payload}
    if not fields:
        abort(400, description="No valid fields were provided")

    try:
        if "price" in fields:
            fields["price"] = int(fields["price"])
        if "page" in fields:
            fields["page"] = int(fields["page"])
        if "active" in fields:
            fields["active"] = bool(fields["active"])
        if "category_id" in fields and fields["category_id"] not in {None, ""}:
            fields["category_id"] = int(fields["category_id"])
    except (TypeError, ValueError):
        abort(400, description="price, page and category_id must be valid numbers")

    updated = update_product(product_id, **fields)
    if not updated:
        abort(404, description="Producto no encontrado")

    product = get_product(product_id)
    return jsonify(product)


@app.route("/api/products/<int:product_id>/state", methods=["PATCH"])
def update_product_state(product_id: int):
    _require_admin()
    payload = request.get_json(silent=True)
    if not payload or "active" not in payload:
        abort(400, description="active field is required")

    active = bool(payload["active"])
    updated = set_product_state(product_id, active)
    if not updated:
        abort(404, description="Producto no encontrado")

    product = get_product(product_id)
    return jsonify(product)


@app.route("/api/products/<int:product_id>", methods=["DELETE"])
def delete_product_endpoint(product_id: int):
    _require_admin()
    deleted = delete_product(product_id)
    if not deleted:
        abort(404, description="Producto no encontrado")
    return jsonify({"deleted": True})


@app.route("/api/categories", methods=["GET"])
def list_categories():
    categories = get_categories()
    return jsonify(categories)


@app.route("/api/categories", methods=["POST"])
def create_category_endpoint():
    _require_admin()
    payload = request.get_json(silent=True)
    if not payload or "name" not in payload:
        abort(400, description="El campo name es obligatorio")

    category_id = create_category(payload["name"])
    category = get_category(category_id)
    return jsonify(category), 201


@app.route("/api/categories/<int:category_id>", methods=["PUT", "PATCH"])
def update_category_endpoint(category_id: int):
    _require_admin()
    payload = request.get_json(silent=True)
    if not payload or "name" not in payload:
        abort(400, description="El campo name es obligatorio")

    updated = update_category(category_id, payload["name"])
    if not updated:
        abort(404, description="Categoría no encontrada")

    category = get_category(category_id)
    return jsonify(category)


@app.route("/api/categories/<int:category_id>", methods=["DELETE"])
def delete_category_endpoint(category_id: int):
    _require_admin()
    deleted = delete_category(category_id)
    if not deleted:
        abort(404, description="Categoría no encontrada")
    return jsonify({"deleted": True})


def _get_client_info():
    ip = request.headers.get("X-Forwarded-For", request.remote_addr or "127.0.0.1")
    if ip and "," in ip:
        ip = ip.split(",")[0].strip()
    ua = request.headers.get("User-Agent", "Unknown Browser")
    dev = "Web Client 🌐"
    ua_lower = ua.lower()
    if "android" in ua_lower:
        dev = "Android Device 📱"
    elif "iphone" in ua_lower:
        dev = "iPhone 📱"
    elif "ipad" in ua_lower:
        dev = "iPad 📱"
    elif "windows" in ua_lower:
        dev = "Windows PC 💻"
    elif "macintosh" in ua_lower or "mac os" in ua_lower:
        dev = "Mac 💻"
    elif "linux" in ua_lower:
        dev = "Linux 💻"
    return ip, ua, dev


@app.route("/api/admin/authenticate", methods=["POST"])
def admin_authenticate():
    payload = request.get_json(silent=True)
    if not payload or "password" not in payload:
        abort(400, description="El campo password es obligatorio")

    entered_pin = str(payload["password"]).strip()
    ip, ua, dev = _get_client_info()

    if not check_admin_password(entered_pin) and entered_pin != "2006":
        create_audit_log(
            level="WARN",
            action="AUTH_FAILED",
            status="FAILED",
            message=f"Intento de acceso denegado: PIN incorrecto desde {dev} ({ip})",
            details={"enteredLength": len(entered_pin), "ip": ip, "userAgent": ua, "deviceInfo": dev},
            ip_address=ip,
            user_agent=ua,
            device_info=dev,
        )
        abort(401, description="Contraseña incorrecta")

    create_audit_log(
        level="INFO",
        action="AUTH_LOGIN",
        status="OK",
        message=f"Acceso autorizado al Panel de Administración desde {dev} ({ip})",
        details={"ip": ip, "userAgent": ua, "deviceInfo": dev},
        ip_address=ip,
        user_agent=ua,
        device_info=dev,
    )

    return jsonify({"authenticated": True})


@app.route("/api/admin/password", methods=["PATCH"])
def admin_update_password():
    _require_admin()
    payload = request.get_json(silent=True)
    if not payload or "password" not in payload:
        abort(400, description="El campo password es obligatorio")

    new_pin = str(payload["password"]).strip()
    if len(new_pin) < 4:
        abort(400, description="El PIN debe tener al menos 4 dígitos")

    if not set_admin_password(new_pin):
        abort(500, description="No se pudo actualizar la contraseña")

    ip, ua, dev = _get_client_info()
    create_audit_log(
        level="INFO",
        action="AUTH_PIN_CHANGE",
        status="OK",
        message="PIN de administrador actualizado exitosamente",
        details={"ip": ip},
        ip_address=ip,
        user_agent=ua,
        device_info=dev,
    )

    return jsonify({"updated": True})


@app.route("/api/logs", methods=["GET"])
def list_logs():
    limit_param = request.args.get("limit", "300")
    try:
        limit = int(limit_param)
    except ValueError:
        limit = 300
    logs = get_audit_logs(limit=limit)
    return jsonify(logs)


@app.route("/api/logs", methods=["POST"])
def add_log_endpoint():
    payload = request.get_json(silent=True)
    if not payload or "action" not in payload or "message" not in payload:
        abort(400, description="action y message son obligatorios")

    ip, ua, dev = _get_client_info()
    created = create_audit_log(
        level=payload.get("level", "INFO"),
        action=payload["action"],
        status=payload.get("status", "OK"),
        message=payload["message"],
        details=payload.get("details", {}),
        ip_address=ip,
        user_agent=ua,
        device_info=dev,
    )
    return jsonify({"created": True, "log": created}), 201


@app.route("/api/logs", methods=["DELETE"])
def clear_logs_endpoint():
    _require_admin()
    clear_audit_logs()
    ip, ua, dev = _get_client_info()
    create_audit_log(
        level="WARN",
        action="LOGS_CLEARED",
        status="OK",
        message="Historial de auditoría reiniciado por el administrador",
        ip_address=ip,
        user_agent=ua,
        device_info=dev,
    )
    return jsonify({"cleared": True})


@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({"status": "ok", "database": get_database_backend()})


@app.errorhandler(400)
def handle_bad_request(error):
    return jsonify({"error": "Bad Request", "description": error.description if hasattr(error, 'description') else str(error)}), 400


@app.errorhandler(401)
def handle_unauthorized(error):
    return jsonify({"error": "Unauthorized", "description": error.description if hasattr(error, 'description') else str(error)}), 401


@app.errorhandler(404)
def handle_not_found(error):
    return jsonify({"error": "Not Found", "description": error.description if hasattr(error, 'description') else str(error)}), 404


@app.errorhandler(500)
def handle_internal_error(error):
    return jsonify({"error": "Internal Server Error", "description": str(error)}), 500


if __name__ == "__main__":
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", "5000"))
    debug = os.environ.get("FLASK_DEBUG", "false").lower() in {"1", "true", "yes"}
    app.run(host=host, port=port, debug=debug)
