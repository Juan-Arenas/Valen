import os
from pathlib import Path
from typing import Any, Dict, List

from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.ext import ApplicationBuilder, CallbackQueryHandler, CommandHandler, ContextTypes, MessageHandler, filters

from db import (
    create_product,
    delete_product,
    get_product,
    get_products,
    init_db,
    set_product_state,
    update_product,
)

BOT_TOKEN = os.environ.get("BOT_TOKEN")
AUTHORIZED_USERS = set()
for raw_id in os.environ.get("AUTHORIZED_USERS", "").split(","):
    raw_id = raw_id.strip()
    if raw_id:
        try:
            AUTHORIZED_USERS.add(int(raw_id))
        except ValueError:
            pass

if not BOT_TOKEN:
    raise RuntimeError("Set the BOT_TOKEN environment variable before running the bot.")
if not AUTHORIZED_USERS:
    raise RuntimeError("Set the AUTHORIZED_USERS environment variable with at least one Telegram user ID.")

init_db()


def is_authorized(update: Update) -> bool:
    return update.effective_user and update.effective_user.id in AUTHORIZED_USERS


def format_product(product: Dict[str, Any]) -> str:
    status = "ACTIVO" if product.get("active", True) else "INACTIVO"
    price_text = f"${product.get('price', 0):,}".replace(",", ".")
    return f"{product['id']}. {product['name']} — {price_text} — {status}"


def admin_only(func):
    async def wrapper(update: Update, context: ContextTypes.DEFAULT_TYPE):
        if not is_authorized(update):
            await update.message.reply_text("🚫 No estás autorizado para usar este bot.")
            return
        return await func(update, context)
    return wrapper


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "Hola, este bot administra el catálogo de productos.\n"
        "Usa /help para ver los comandos disponibles."
    )


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "Comandos disponibles:\n"
        "/list - Mostrar productos activos\n"
        "/list_all - Mostrar todos los productos\n"
        "/activate <id> - Activar un producto\n"
        "/deactivate <id> - Desactivar un producto\n"
        "/subir <id> - Sinónimo de /activate\n"
        "/bajar <id> - Sinónimo de /deactivate\n"
        "/status <id> - Ver datos de un producto\n"
        "/set_price <id> <precio> - Actualizar precio\n"
        "/set_name <id> <nombre> - Actualizar nombre\n"
        "/set_image <id> <url> - Actualizar imagen desde URL\n"
        "/add_product Nombre;Precio;Imagen;Página - Agregar producto nuevo\n"
        "/delete - Seleccionar un producto para borrar\n"
        "/format - Recibir el formato de actualización\n"
        "También puedes enviar una foto con caption: /set_image <id> para subir la imagen localmente o /add_product Nombre;Precio;Página para crear un producto con la foto.\n"
    )


async def send_product_list(update: Update, products: List[Dict[str, Any]], title: str) -> None:
    if not products:
        await update.message.reply_text("No hay productos para mostrar.")
        return

    chunks: List[str] = []
    current_chunk = [title]
    current_len = len(title)

    for product in products:
        line = format_product(product)
        if current_len + len(line) + 1 > 3800:
            chunks.append("\n".join(current_chunk))
            current_chunk = [line]
            current_len = len(line)
        else:
            current_chunk.append(line)
            current_len += len(line) + 1

    if current_chunk:
        chunks.append("\n".join(current_chunk))

    for chunk in chunks:
        await update.message.reply_text(chunk)


@admin_only
async def list_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    products = get_products(active_only=True)
    await send_product_list(update, products, "Productos activos:")


@admin_only
async def list_all_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    products = get_products(active_only=False)
    await send_product_list(update, products, "Todos los productos:")


@admin_only
async def product_status(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not context.args:
        await update.message.reply_text("Uso: /status <id>")
        return
    try:
        product_id = int(context.args[0])
    except ValueError:
        await update.message.reply_text("El ID debe ser un número válido.")
        return

    product = get_product(product_id)
    if not product:
        await update.message.reply_text(f"Producto con ID {product_id} no encontrado.")
        return

    await update.message.reply_text(
        f"ID: {product['id']}\n"
        f"Nombre: {product['name']}\n"
        f"Precio: ${product['price']:,}".replace(",", ".") + "\n"
        f"Estado: {'ACTIVO' if product.get('active', True) else 'INACTIVO'}\n"
        f"Imagen: {product.get('image', 'sin imagen')}\n"
        f"Página: {product.get('page', '-')}.")


async def change_state(update: Update, context: ContextTypes.DEFAULT_TYPE, active_value: bool) -> None:
    if not context.args:
        await update.message.reply_text("Uso: /activate <id> o /deactivate <id>")
        return
    try:
        product_id = int(context.args[0])
    except ValueError:
        await update.message.reply_text("El ID debe ser un número válido.")
        return

    product = get_product(product_id)
    if not product:
        await update.message.reply_text(f"Producto con ID {product_id} no encontrado.")
        return

    if product.get("active", True) == active_value:
        status = "activo" if active_value else "inactivo"
        await update.message.reply_text(f"El producto ya está {status}.")
        return

    set_product_state(product_id, active_value)
    action = "Activado" if active_value else "Desactivado"
    await update.message.reply_text(f"{action} producto {product_id} - {product['name']}")


@admin_only
async def activate_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await change_state(update, context, True)


@admin_only
async def deactivate_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await change_state(update, context, False)


@admin_only
async def set_name(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if len(context.args) < 2:
        await update.message.reply_text("Uso: /set_name <id> <nombre>")
        return
    try:
        product_id = int(context.args[0])
    except ValueError:
        await update.message.reply_text("El ID debe ser un número válido.")
        return

    new_name = " ".join(context.args[1:]).strip()
    if not new_name:
        await update.message.reply_text("Proporciona un nombre válido.")
        return

    product = get_product(product_id)
    if not product:
        await update.message.reply_text(f"Producto con ID {product_id} no encontrado.")
        return

    update_product(product_id, name=new_name)
    await update.message.reply_text(f"Nombre actualizado para {product_id}: {new_name}")


@admin_only
async def set_image(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if len(context.args) < 2:
        await update.message.reply_text("Uso: /set_image <id> <url>")
        return
    try:
        product_id = int(context.args[0])
    except ValueError:
        await update.message.reply_text("El ID debe ser un número válido.")
        return

    image_url = context.args[1]
    product = get_product(product_id)
    if not product:
        await update.message.reply_text(f"Producto con ID {product_id} no encontrado.")
        return

    update_product(product_id, image=image_url)
    await update.message.reply_text(f"Imagen actualizada para producto {product_id}.")


@admin_only
async def add_product(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    payload = update.message.text.replace("/add_product", "").strip()
    parts = [p.strip() for p in payload.split(";") if p.strip()]
    if len(parts) < 3:
        await update.message.reply_text(
            "Uso: /add_product Nombre;Precio;Imagen;Página\n"
            "Ejemplo: /add_product Labial rojo;12900;img/product_201.jpg;5"
        )
        return

    name = parts[0]
    try:
        price = int(parts[1].replace(".", ""))
    except ValueError:
        await update.message.reply_text("Precio no válido. Usa números sin separador de miles o con puntos.")
        return

    image_path = parts[2]
    page = 1
    if len(parts) >= 4:
        try:
            page = int(parts[3])
        except ValueError:
            page = 1

    product_id = create_product(name, price, image_path, page=page, active=True)
    await update.message.reply_text(f"Producto agregado: {product_id} - {name}")


async def photo_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not is_authorized(update):
        await update.message.reply_text("🚫 No estás autorizado para usar este bot.")
        return

    if not update.message.photo:
        return

    caption = (update.message.caption or "").strip()
    if not caption.startswith("/set_image"):
        return

    parts = caption.split()
    if len(parts) < 2:
        await update.message.reply_text("Uso: envía la foto con el caption: /set_image <id>")
        return

    try:
        product_id = int(parts[1])
    except ValueError:
        await update.message.reply_text("El ID debe ser un número válido.")
        return

    product = get_product(product_id)
    if not product:
        await update.message.reply_text(f"Producto con ID {product_id} no encontrado.")
        return

    photo = update.message.photo[-1]
    file = await context.bot.get_file(photo.file_id)
    image_dir = Path(__file__).resolve().parent / "img"
    image_dir.mkdir(exist_ok=True)
    image_path = image_dir / f"product_{product_id}.jpg"
    await file.download_to_drive(str(image_path))

    update_product(product_id, image=f"img/product_{product_id}.jpg")
    await update.message.reply_text(f"Imagen guardada y actualizada para producto {product_id}.")


@admin_only
async def format_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "Formato de actualización:\n"
        "1) /add_product Nombre;Precio;Imagen;Página\n"
        "2) /set_name <id> <nombre>\n"
        "3) /set_price <id> <precio>\n"
        "4) /set_image <id> <url>\n"
        "5) Envía una foto con caption: /set_image <id> para subir una imagen localmente.\n"
        "6) /activate <id> o /deactivate <id> para mostrar/ocultar el producto.\n"
    )


@admin_only
async def set_price(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if len(context.args) < 2:
        await update.message.reply_text("Uso: /set_price <id> <precio>")
        return
    try:
        product_id = int(context.args[0])
        price = int(context.args[1].replace(".", ""))
    except ValueError:
        await update.message.reply_text("ID o precio no válidos.")
        return

    product = get_product(product_id)
    if not product:
        await update.message.reply_text(f"Producto con ID {product_id} no encontrado.")
        return

    update_product(product_id, price=price)
    await update.message.reply_text(
        f"Precio actualizado: {product_id} - {product['name']} = ${price:,}".replace(",", ".")
    )


async def build_delete_keyboard(products: List[Dict[str, Any]], page: int = 1, page_size: int = 10) -> InlineKeyboardMarkup:
    buttons = []
    start = (page - 1) * page_size
    for product in products[start:start + page_size]:
        label = f"{product['id']}: {product['name'][:30]}"
        buttons.append([InlineKeyboardButton(label, callback_data=f"delete_{product['id']}")])

    navigation = []
    if page > 1:
        navigation.append(InlineKeyboardButton("⬅️ Anterior", callback_data=f"delete_page_{page - 1}"))
    if start + page_size < len(products):
        navigation.append(InlineKeyboardButton("Siguiente ➡️", callback_data=f"delete_page_{page + 1}"))
    if navigation:
        buttons.append(navigation)

    buttons.append([InlineKeyboardButton("Cancelar", callback_data="cancel_delete")])
    return InlineKeyboardMarkup(buttons)


@admin_only
async def delete_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    products = get_products(active_only=False)
    if not products:
        await update.message.reply_text("No hay productos en el catálogo para borrar.")
        return

    page = 1
    if context.args:
        try:
            page = max(1, int(context.args[0]))
        except ValueError:
            page = 1

    keyboard = await build_delete_keyboard(products, page=page)
    await update.message.reply_text(
        "Selecciona un producto para borrar:",
        reply_markup=keyboard,
    )


async def handle_delete_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    if not query:
        return

    if not is_authorized(update):
        await query.answer("No estás autorizado.", show_alert=True)
        return

    data = query.data or ""
    await query.answer()

    if data == "cancel_delete":
        await query.message.edit_text("Operación de borrado cancelada.")
        return

    if data.startswith("delete_page_"):
        try:
            page = int(data.rsplit("_", 1)[1])
        except ValueError:
            page = 1
        products = get_products(active_only=False)
        keyboard = await build_delete_keyboard(products, page=page)
        await query.message.edit_text("Selecciona un producto para borrar:", reply_markup=keyboard)
        return

    if data.startswith("delete_"):
        try:
            product_id = int(data.split("_", 1)[1])
        except ValueError:
            await query.message.edit_text("ID de producto inválido.")
            return

        product = get_product(product_id)
        if not product:
            await query.message.edit_text("Producto no encontrado.")
            return

        keyboard = InlineKeyboardMarkup([
            [InlineKeyboardButton("Sí, borrar", callback_data=f"confirm_delete_{product_id}"), InlineKeyboardButton("No", callback_data="cancel_delete")]
        ])
        await query.message.edit_text(
            f"¿Borrar producto {product_id} - {product['name']}?\nPrecio: ${product['price']:,}".replace(",", "."),
            reply_markup=keyboard,
        )
        return

    if data.startswith("confirm_delete_"):
        try:
            product_id = int(data.split("_", 2)[2])
        except ValueError:
            await query.message.edit_text("ID de producto inválido.")
            return

        deleted = delete_product(product_id)
        if not deleted:
            await query.message.edit_text("No se pudo borrar el producto o ya no existe.")
            return

        await query.message.edit_text(f"Producto {product_id} eliminado correctamente.")
        return

    await query.message.edit_text("Acción desconocida.")


async def photo_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not is_authorized(update):
        await update.message.reply_text("🚫 No estás autorizado para usar este bot.")
        return

    if not update.message.photo:
        return

    caption = (update.message.caption or "").strip()
    if not caption:
        await update.message.reply_text(
            "Envía la foto con caption /set_image <id> o /add_product Nombre;Precio;Página"
        )
        return

    photo = update.message.photo[-1]
    file = await context.bot.get_file(photo.file_id)
    image_dir = Path(__file__).resolve().parent / "img"
    image_dir.mkdir(exist_ok=True)

    if caption.startswith("/set_image"):
        parts = caption.split()
        if len(parts) < 2:
            await update.message.reply_text("Uso: envía la foto con el caption: /set_image <id>")
            return

        try:
            product_id = int(parts[1])
        except ValueError:
            await update.message.reply_text("El ID debe ser un número válido.")
            return

        product = get_product(product_id)
        if not product:
            await update.message.reply_text(f"Producto con ID {product_id} no encontrado.")
            return

        image_path = image_dir / f"product_{product_id}.jpg"
        await file.download_to_drive(str(image_path))
        update_product(product_id, image=f"img/product_{product_id}.jpg")
        await update.message.reply_text(f"Imagen guardada y actualizada para producto {product_id}.")
        return

    if caption.startswith("/add_product"):
        payload = caption.replace("/add_product", "", 1).strip()
        parts = [p.strip() for p in payload.split(";") if p.strip()]
        if len(parts) < 2:
            await update.message.reply_text(
                "Uso: envía la foto con caption: /add_product Nombre;Precio;Página"
            )
            return

        name = parts[0]
        try:
            price = int(parts[1].replace(".", ""))
        except ValueError:
            await update.message.reply_text("Precio no válido. Usa números sin separador de miles o con puntos.")
            return

        page = 1
        if len(parts) >= 3:
            try:
                page = int(parts[2])
            except ValueError:
                page = 1

        product_id = create_product(name, price, "img/placeholder.jpg", page=page, active=True)
        image_path = image_dir / f"product_{product_id}.jpg"
        await file.download_to_drive(str(image_path))
        update_product(product_id, image=f"img/product_{product_id}.jpg")
        await update.message.reply_text(
            f"Producto creado y foto guardada: {product_id} - {name}"
        )
        return

    await update.message.reply_text(
        "Caption no válido. Usa /set_image <id> o /add_product Nombre;Precio;Página"
    )


async def unknown_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text("Comando no reconocido. Escribe /help para ver los comandos.")


def build_application() -> Any:
    application = ApplicationBuilder().token(BOT_TOKEN).build()

    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("help", help_command))
    application.add_handler(CommandHandler(["list", "productos"], list_command))
    application.add_handler(CommandHandler(["list_all", "listar_todos"], list_all_command))
    application.add_handler(CommandHandler(["status", "info"], product_status))
    application.add_handler(CommandHandler(["activate", "subir"], activate_command))
    application.add_handler(CommandHandler(["deactivate", "bajar"], deactivate_command))
    application.add_handler(CommandHandler(["set_price", "precio"], set_price))
    application.add_handler(CommandHandler(["set_name", "nombre"], set_name))
    application.add_handler(CommandHandler(["set_image", "imagen"], set_image))
    application.add_handler(CommandHandler(["add_product", "agregar_producto"], add_product))
    application.add_handler(CommandHandler(["format", "formato"], format_command))
    application.add_handler(CommandHandler("delete", delete_command))
    application.add_handler(CommandHandler("borrar", delete_command))
    application.add_handler(MessageHandler(filters.PHOTO & (filters.CaptionRegex(r'^/set_image') | filters.CaptionRegex(r'^/add_product')), photo_handler))
    application.add_handler(MessageHandler(filters.COMMAND, unknown_command))
    application.add_handler(CallbackQueryHandler(handle_delete_callback))

    return application


if __name__ == "__main__":
    app = build_application()
    print("Bot iniciado. Esperando comandos...")
    app.run_polling()
