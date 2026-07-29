import os
from flask import Flask, jsonify, request, abort
from flask_cors import CORS

from db import (
    init_db,
    create_product,
    get_product,
    get_products,
    set_product_state,
    update_product,
)

app = Flask(__name__)
CORS(app)
init_db()


@app.route("/api/products", methods=["GET"])
def list_products():
    active_param = request.args.get("active", "true").strip().lower()
    active_only = active_param not in {"0", "false", "no"}
    products = get_products(active_only=active_only)
    return jsonify(products)


@app.route("/api/products/<int:product_id>", methods=["GET"])
def get_product_by_id(product_id: int):
    product = get_product(product_id)
    if not product:
        abort(404, description="Producto no encontrado")
    return jsonify(product)


@app.route("/api/products", methods=["POST"])
def create_product_endpoint():
    payload = request.get_json(silent=True)
    if not payload:
        abort(400, description="JSON body is required")

    name = payload.get("name")
    price = payload.get("price")
    image = payload.get("image")
    page = payload.get("page", 1)
    active = payload.get("active", True)

    if not name or price is None or image is None:
        abort(400, description="name, price and image are required")

    try:
        price = int(price)
        page = int(page)
    except (TypeError, ValueError):
        abort(400, description="price and page must be numbers")

    product_id = create_product(name, price, image, page=page, active=active)
    product = get_product(product_id)
    return jsonify(product), 201


@app.route("/api/products/<int:product_id>", methods=["PUT", "PATCH"])
def update_product_endpoint(product_id: int):
    payload = request.get_json(silent=True)
    if not payload:
        abort(400, description="JSON body is required")

    fields = {k: payload[k] for k in ["name", "price", "image", "page", "active"] if k in payload}
    if not fields:
        abort(400, description="No valid fields were provided")

    try:
        if "price" in fields:
            fields["price"] = int(fields["price"])
        if "page" in fields:
            fields["page"] = int(fields["page"])
        if "active" in fields:
            fields["active"] = bool(fields["active"])
    except (TypeError, ValueError):
        abort(400, description="price, page and active must be valid values")

    updated = update_product(product_id, **fields)
    if not updated:
        abort(404, description="Producto no encontrado")

    product = get_product(product_id)
    return jsonify(product)


@app.route("/api/products/<int:product_id>/state", methods=["PATCH"])
def update_product_state(product_id: int):
    payload = request.get_json(silent=True)
    if not payload or "active" not in payload:
        abort(400, description="active field is required")

    active = bool(payload["active"])
    updated = set_product_state(product_id, active)
    if not updated:
        abort(404, description="Producto no encontrado")

    product = get_product(product_id)
    return jsonify(product)


@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", "5000"))
    debug = os.environ.get("FLASK_DEBUG", "false").lower() in {"1", "true", "yes"}
    app.run(host=host, port=port, debug=debug)
