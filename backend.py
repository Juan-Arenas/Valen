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

    if not name or price is None or image is None:
        abort(400, description="name, price and image are required")

    try:
        price = int(price)
        page = int(page)
        if category_id is not None and category_id != "":
            category_id = int(category_id)
    except (TypeError, ValueError):
        abort(400, description="price, page and category_id must be numbers")

    product_id = create_product(name, price, image, page=page, active=active, category_id=category_id)
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


@app.route("/api/admin/authenticate", methods=["POST"])
def admin_authenticate():
    payload = request.get_json(silent=True)
    if not payload or "password" not in payload:
        abort(400, description="El campo password es obligatorio")

    if not check_admin_password(str(payload["password"])):
        abort(401, description="Contraseña incorrecta")

    return jsonify({"authenticated": True})


@app.route("/api/admin/password", methods=["PATCH"])
def admin_update_password():
    _require_admin()
    payload = request.get_json(silent=True)
    if not payload or "password" not in payload:
        abort(400, description="El campo password es obligatorio")

    if not set_admin_password(str(payload["password"])):
        abort(500, description="No se pudo actualizar la contraseña")

    return jsonify({"updated": True})


@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", "5000"))
    debug = os.environ.get("FLASK_DEBUG", "false").lower() in {"1", "true", "yes"}
    app.run(host=host, port=port, debug=debug)
