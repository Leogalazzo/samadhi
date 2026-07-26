// ==========================================================
// ADMIN.JS - Carga y edición de productos y categorías
// (sin login todavía, eso lo sumamos en la siguiente vuelta)
// ==========================================================

import { db } from "./firebase-config.js";
import {
    collection,
    addDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    doc,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let productosCache = [];
let categoriasCache = [];
let idEnEdicion = null;          // producto en edición (null = estamos creando uno nuevo)
let idCategoriaEnEdicion = null; // categoría en edición (null = estamos creando una nueva)

let terminoBusquedaAdmin = '';
let categoriaFiltroAdmin = 'todos';

// ==========================================================
// SIDEBAR / PESTAÑAS
// ==========================================================
const sidebarBtns = document.querySelectorAll('.sidebar-btn');
const panelProductos = document.getElementById('panel-productos');
const panelCategorias = document.getElementById('panel-categorias');

// ---- Sidebar mobile (drawer off-canvas en < lg) ----
const adminSidebar = document.getElementById('admin-sidebar');
const adminSidebarOverlay = document.getElementById('admin-sidebar-overlay');
const btnAbrirSidebarAdmin = document.getElementById('btn-abrir-sidebar-admin');
const btnCerrarSidebarAdmin = document.getElementById('btn-cerrar-sidebar-admin');

function abrirSidebarAdmin() {
    if (!adminSidebar || !adminSidebarOverlay) return;
    adminSidebar.classList.remove('-translate-x-full');
    adminSidebar.classList.add('translate-x-0');
    adminSidebarOverlay.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
}

function cerrarSidebarAdmin() {
    if (!adminSidebar || !adminSidebarOverlay) return;
    adminSidebar.classList.add('-translate-x-full');
    adminSidebar.classList.remove('translate-x-0');
    adminSidebarOverlay.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
}

btnAbrirSidebarAdmin?.addEventListener('click', abrirSidebarAdmin);
btnCerrarSidebarAdmin?.addEventListener('click', cerrarSidebarAdmin);
adminSidebarOverlay?.addEventListener('click', cerrarSidebarAdmin);
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') cerrarSidebarAdmin();
});

function activarTab(tab) {
    const esProductos = tab === 'productos';
    panelProductos.classList.toggle('hidden', !esProductos);
    panelCategorias.classList.toggle('hidden', esProductos);

    sidebarBtns.forEach(btn => {
        btn.classList.toggle('activo', btn.dataset.tab === tab);
    });

    // En mobile el sidebar es un drawer: al elegir una pestaña, se cierra solo.
    cerrarSidebarAdmin();
}

sidebarBtns.forEach(btn => {
    btn.addEventListener('click', () => activarTab(btn.dataset.tab));
});

document.getElementById('link-ir-categorias').addEventListener('click', () => {
    cerrarModalProducto();
    activarTab('categorias');
});

activarTab('productos');

// ==========================================================
// TOAST simple (compartido entre productos y categorías)
// ==========================================================
function mostrarToast(mensaje, esError = false) {
    let toast = document.getElementById('admin-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'admin-toast';
        toast.className = 'fixed bottom-6 left-1/2 -translate-x-1/2 text-sand-50 text-sm font-medium px-5 py-3 rounded-full shadow-xl z-[100] opacity-0 pointer-events-none transition-opacity duration-300';
        document.body.appendChild(toast);
    }
    toast.innerText = mensaje;
    toast.classList.toggle('bg-red-600/90', esError);
    toast.classList.toggle('bg-ink-900/95', !esError);
    toast.classList.remove('opacity-0');
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => toast.classList.add('opacity-0'), 2500);
}

// Genera un identificador simple y estable a partir de un nombre
function generarSlug(texto) {
    return (texto || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function ordenarCategorias(lista) {
    return [...lista].sort((a, b) => {
        if (a.orden != null && b.orden != null) return a.orden - b.orden;
        return (a.nombre || '').localeCompare(b.nombre || '');
    });
}

function normalizarTexto(texto) {
    return (texto || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

// ==========================================================
// ==================  CATEGORÍAS  =========================
// ==========================================================

const overlayCategoria = document.getElementById('overlay-categoria');
const formCategoria = document.getElementById('form-categoria');
const inputCatNombre = document.getElementById('input-cat-nombre');
const inputCatSlug = document.getElementById('input-cat-slug');
const inputCatOrden = document.getElementById('input-cat-orden');

const modalCategoriaTitulo = document.getElementById('modal-categoria-titulo');
const btnGuardarCat = document.getElementById('btn-guardar-cat');
const btnNuevaCategoria = document.getElementById('btn-nueva-categoria');
const btnCerrarModalCategoria = document.getElementById('btn-cerrar-modal-categoria');
const btnCancelarCategoria = document.getElementById('btn-cancelar-categoria');
const listaCategorias = document.getElementById('lista-categorias');
const contadorCategorias = document.getElementById('contador-categorias');

const selectCategoriaProducto = document.getElementById('input-categoria');
const filtroCategoriaAdmin = document.getElementById('filtro-categoria-admin');

// Mientras se está creando (no editando), el identificador se arma solo
// a partir del nombre que se va escribiendo.
inputCatNombre.addEventListener('input', () => {
    if (idCategoriaEnEdicion) return; // en edición el slug queda fijo
    inputCatSlug.value = generarSlug(inputCatNombre.value);
});

function abrirModalCategoria() {
    overlayCategoria.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
    inputCatNombre.focus();
}

function cerrarModalCategoria() {
    overlayCategoria.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
    resetearFormularioCategoria();
}

overlayCategoria.addEventListener('click', (e) => {
    if (e.target === overlayCategoria) cerrarModalCategoria();
});
btnNuevaCategoria.addEventListener('click', () => {
    resetearFormularioCategoria();
    abrirModalCategoria();
});
btnCerrarModalCategoria.addEventListener('click', cerrarModalCategoria);
btnCancelarCategoria.addEventListener('click', cerrarModalCategoria);

function resetearFormularioCategoria() {
    idCategoriaEnEdicion = null;
    formCategoria.reset();
    inputCatSlug.value = '';
    modalCategoriaTitulo.innerText = 'Nueva categoría';
    btnGuardarCat.innerText = 'Agregar categoría';
}

function editarCategoria(id) {
    const categoria = categoriasCache.find(c => c.id === id);
    if (!categoria) return;

    idCategoriaEnEdicion = id;
    inputCatNombre.value = categoria.nombre || '';
    inputCatSlug.value = categoria.slug || '';
    inputCatOrden.value = categoria.orden ?? '';

    modalCategoriaTitulo.innerText = `Editando: ${categoria.nombre}`;
    btnGuardarCat.innerText = 'Guardar cambios';

    abrirModalCategoria();
}
window.editarCategoria = editarCategoria;

async function eliminarCategoria(id) {
    const categoria = categoriasCache.find(c => c.id === id);
    if (!categoria) return;

    const productosAfectados = productosCache.filter(p => p.categoria === categoria.slug).length;

    let mensaje = `¿Eliminar la categoría "${categoria.nombre}"?`;
    if (productosAfectados > 0) {
        mensaje += `\n\nHay ${productosAfectados} producto(s) usándola. No se van a borrar ni ocultar, pero van a quedar con una categoría que ya no vas a poder elegir de nuevo hasta que edites cada uno.`;
    }

    if (!confirm(mensaje)) return;

    try {
        await deleteDoc(doc(db, 'categorias', id));
        mostrarToast('Categoría eliminada');
        if (idCategoriaEnEdicion === id) cerrarModalCategoria();
    } catch (error) {
        console.error('Error al eliminar categoría:', error);
        mostrarToast('No se pudo eliminar. Revisá la consola.', true);
    }
}
window.eliminarCategoria = eliminarCategoria;

formCategoria.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nombre = inputCatNombre.value.trim();
    if (!nombre) {
        mostrarToast('Ponele un nombre a la categoría.', true);
        return;
    }

    const slug = idCategoriaEnEdicion ? inputCatSlug.value : generarSlug(nombre);

    if (!slug) {
        mostrarToast('Ese nombre no genera un identificador válido, probá con otro.', true);
        return;
    }

    // Evita duplicados (mismo identificador en otra categoría)
    const yaExiste = categoriasCache.some(c => c.slug === slug && c.id !== idCategoriaEnEdicion);
    if (yaExiste) {
        mostrarToast('Ya existe una categoría con ese identificador.', true);
        return;
    }

    const datos = {
        nombre,
        slug,
        orden: inputCatOrden.value !== '' ? parseFloat(inputCatOrden.value) : null
    };

    btnGuardarCat.disabled = true;
    btnGuardarCat.innerText = 'Guardando...';

    try {
        if (idCategoriaEnEdicion) {
            // El slug (= ID del documento) no cambia en una edición
            await updateDoc(doc(db, 'categorias', idCategoriaEnEdicion), datos);
            mostrarToast('Categoría actualizada');
        } else {
            // Usamos el slug como ID del documento (en vez de un ID random)
            // para que las reglas de Firestore puedan validar con exists()
            // que la categoría de un producto realmente existe.
            await setDoc(doc(db, 'categorias', slug), datos);
            mostrarToast('Categoría agregada');
        }
        cerrarModalCategoria();
    } catch (error) {
        console.error('Error al guardar categoría:', error);
        mostrarToast('No se pudo guardar. Revisá la consola.', true);
    } finally {
        btnGuardarCat.disabled = false;
        btnGuardarCat.innerText = idCategoriaEnEdicion ? 'Guardar cambios' : 'Agregar categoría';
    }
});

function renderListaCategorias() {
    if (!listaCategorias) return;

    contadorCategorias.innerText = categoriasCache.length === 0
        ? ''
        : `${categoriasCache.length} categoría${categoriasCache.length === 1 ? '' : 's'}`;

    if (categoriasCache.length === 0) {
        listaCategorias.innerHTML = `
            <div class="text-center py-16 text-ink-500">
                <p class="font-medium text-lg text-ink-900 mb-1">Todavía no hay categorías.</p>
                <p class="text-sm">Creá la primera para poder clasificar tus productos.</p>
            </div>
        `;
        return;
    }

    const ordenadas = ordenarCategorias(categoriasCache);

    listaCategorias.innerHTML = '';
    ordenadas.forEach(categoria => {
        const cantidad = productosCache.filter(p => p.categoria === categoria.slug).length;

        const fila = document.createElement('div');
        fila.className = 'flex items-center gap-4 bg-white border border-ink-900/10 rounded-2xl px-5 py-4';

        fila.innerHTML = `
            <div class="flex-1 min-w-0">
                <p class="font-display text-base text-ink-900 truncate">${categoria.nombre || 'Sin nombre'}</p>
                <p class="font-mono text-xs text-ink-500 mt-0.5">
                    ${categoria.slug} · ${cantidad} producto${cantidad === 1 ? '' : 's'}
                </p>
            </div>
            <button class="btn-editar-cat shrink-0 text-sm font-semibold text-ink-700 hover:text-clay-600 px-3 py-2 rounded-xl hover:bg-ink-900/5 transition">
                Editar
            </button>
            <button class="btn-eliminar-cat shrink-0 text-sm font-semibold text-red-500 hover:text-red-700 px-3 py-2 rounded-xl hover:bg-red-50 transition">
                Eliminar
            </button>
        `;

        fila.querySelector('.btn-editar-cat').addEventListener('click', () => editarCategoria(categoria.id));
        fila.querySelector('.btn-eliminar-cat').addEventListener('click', () => eliminarCategoria(categoria.id));
        listaCategorias.appendChild(fila);
    });
}

// Completa el <select> de categoría del formulario de producto
function actualizarSelectCategoriaProducto() {
    const valorActual = selectCategoriaProducto.value;
    const ordenadas = ordenarCategorias(categoriasCache);

    if (ordenadas.length === 0) {
        selectCategoriaProducto.innerHTML = `<option value="">No hay categorías creadas todavía</option>`;
    } else {
        selectCategoriaProducto.innerHTML = ordenadas
            .map(c => `<option value="${c.slug}">${c.nombre}</option>`)
            .join('');
        if (ordenadas.some(c => c.slug === valorActual)) {
            selectCategoriaProducto.value = valorActual;
        }
    }
}

// Completa el filtro de categoría del listado de admin
function actualizarFiltroCategoriaAdmin() {
    const valorActual = filtroCategoriaAdmin.value || 'todos';
    const ordenadas = ordenarCategorias(categoriasCache);

    filtroCategoriaAdmin.innerHTML = `<option value="todos">Todas las categorías</option>` +
        ordenadas.map(c => `<option value="${c.slug}">${c.nombre}</option>`).join('');

    if (valorActual !== 'todos' && ordenadas.some(c => c.slug === valorActual)) {
        filtroCategoriaAdmin.value = valorActual;
    } else {
        filtroCategoriaAdmin.value = 'todos';
        categoriaFiltroAdmin = 'todos';
    }
}

filtroCategoriaAdmin.addEventListener('change', () => {
    categoriaFiltroAdmin = filtroCategoriaAdmin.value;
    renderGridProductos();
});

// ==========================================================
// ==================  PRODUCTOS  ==========================
// ==========================================================

const overlayProducto = document.getElementById('overlay-producto');
const form = document.getElementById('form-producto');
const inputNombre = document.getElementById('input-nombre');
const inputDescripcion = document.getElementById('input-descripcion');
const inputPrecio = document.getElementById('input-precio');
const inputImagen = document.getElementById('input-imagen');
const inputNuevo = document.getElementById('input-nuevo');
const inputActivo = document.getElementById('input-activo');
const inputOrden = document.getElementById('input-orden');
const previewImg = document.getElementById('preview-imagen');

const modalProductoTitulo = document.getElementById('modal-producto-titulo');
const btnGuardar = document.getElementById('btn-guardar');
const btnNuevoProducto = document.getElementById('btn-nuevo-producto');
const btnCerrarModalProducto = document.getElementById('btn-cerrar-modal-producto');
const btnCancelarProducto = document.getElementById('btn-cancelar-producto');
const gridProductos = document.getElementById('grid-productos');
const contadorProductos = document.getElementById('contador-productos');
const buscadorAdminProductos = document.getElementById('buscador-admin-productos');

// ==========================================================
// PREVIEW DE IMAGEN
// ==========================================================
inputImagen.addEventListener('input', () => {
    const url = inputImagen.value.trim();
    if (url) {
        previewImg.src = url;
        previewImg.classList.remove('hidden');
    } else {
        previewImg.classList.add('hidden');
    }
});

// ==========================================================
// ABRIR / CERRAR MODAL
// ==========================================================
function abrirModalProducto() {
    overlayProducto.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
    inputNombre.focus();
}

function cerrarModalProducto() {
    overlayProducto.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
    resetearFormulario();
}

overlayProducto.addEventListener('click', (e) => {
    if (e.target === overlayProducto) cerrarModalProducto();
});
btnNuevoProducto.addEventListener('click', () => {
    resetearFormulario();
    abrirModalProducto();
});
btnCerrarModalProducto.addEventListener('click', cerrarModalProducto);
btnCancelarProducto.addEventListener('click', cerrarModalProducto);

document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!overlayProducto.classList.contains('hidden')) cerrarModalProducto();
    if (!overlayCategoria.classList.contains('hidden')) cerrarModalCategoria();
});

// ==========================================================
// RESET DEL FORMULARIO (modo "nuevo producto")
// ==========================================================
function resetearFormulario() {
    idEnEdicion = null;
    form.reset();
    previewImg.classList.add('hidden');
    modalProductoTitulo.innerText = 'Nuevo producto';
    btnGuardar.innerText = 'Agregar producto';
    inputActivo.checked = true;
    actualizarSelectCategoriaProducto();
}

// ==========================================================
// CARGAR UN PRODUCTO EN EL FORM PARA EDITARLO
// ==========================================================
function editarProducto(id) {
    const producto = productosCache.find(p => p.id === id);
    if (!producto) return;

    idEnEdicion = id;
    inputNombre.value = producto.nombre || '';
    inputDescripcion.value = producto.descripcion || '';
    inputPrecio.value = producto.precio || '';
    actualizarSelectCategoriaProducto();
    selectCategoriaProducto.value = producto.categoria || '';
    inputImagen.value = producto.imagen || '';
    inputNuevo.checked = !!producto.nuevo;
    inputActivo.checked = producto.activo !== false;
    inputOrden.value = producto.orden ?? '';

    if (producto.imagen) {
        previewImg.src = producto.imagen;
        previewImg.classList.remove('hidden');
    } else {
        previewImg.classList.add('hidden');
    }

    modalProductoTitulo.innerText = `Editando: ${producto.nombre}`;
    btnGuardar.innerText = 'Guardar cambios';

    abrirModalProducto();
}
window.editarProducto = editarProducto;

async function eliminarProducto(id) {
    const producto = productosCache.find(p => p.id === id);
    if (!producto) return;

    if (!confirm(`¿Eliminar "${producto.nombre}"? Esta acción no se puede deshacer.`)) return;

    try {
        await deleteDoc(doc(db, 'productos', id));
        mostrarToast('Producto eliminado');
        if (idEnEdicion === id) cerrarModalProducto();
    } catch (error) {
        console.error('Error al eliminar producto:', error);
        mostrarToast('No se pudo eliminar. Revisá la consola.', true);
    }
}
window.eliminarProducto = eliminarProducto;

// Marcar / desmarcar stock sin abrir el modal
async function toggleDisponibilidad(id) {
    const producto = productosCache.find(p => p.id === id);
    if (!producto) return;

    const nuevoEstado = producto.activo === false; // pasa a true si estaba sin stock

    try {
        await updateDoc(doc(db, 'productos', id), { activo: nuevoEstado });
        mostrarToast(nuevoEstado ? 'Producto marcado con stock' : 'Producto marcado sin stock');
    } catch (error) {
        console.error('Error al cambiar disponibilidad:', error);
        mostrarToast('No se pudo actualizar. Revisá la consola.', true);
    }
}
window.toggleDisponibilidad = toggleDisponibilidad;

// ==========================================================
// GUARDAR (crear o actualizar según corresponda)
// ==========================================================
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nombre = inputNombre.value.trim();
    const precio = parseFloat(inputPrecio.value);
    const imagen = inputImagen.value.trim();

    if (!nombre || !imagen || isNaN(precio)) {
        mostrarToast('Completá al menos nombre, precio e imagen.', true);
        return;
    }

    const datos = {
        nombre,
        descripcion: inputDescripcion.value.trim(),
        precio,
        categoria: selectCategoriaProducto.value || null,
        imagen,
        nuevo: inputNuevo.checked,
        activo: inputActivo.checked,
        orden: inputOrden.value !== '' ? parseFloat(inputOrden.value) : null
    };

    btnGuardar.disabled = true;
    btnGuardar.innerText = 'Guardando...';

    try {
        if (idEnEdicion) {
            await updateDoc(doc(db, 'productos', idEnEdicion), datos);
            mostrarToast('Producto actualizado');
        } else {
            await addDoc(collection(db, 'productos'), datos);
            mostrarToast('Producto agregado');
        }
        cerrarModalProducto();
    } catch (error) {
        console.error('Error al guardar producto:', error);
        mostrarToast('No se pudo guardar. Revisá la consola.', true);
    } finally {
        btnGuardar.disabled = false;
        btnGuardar.innerText = idEnEdicion ? 'Guardar cambios' : 'Agregar producto';
    }
});

// ==========================================================
// BUSCADOR (panel de productos del admin)
// ==========================================================
let debounceBusquedaAdmin = null;
buscadorAdminProductos.addEventListener('input', (e) => {
    const valor = e.target.value;
    clearTimeout(debounceBusquedaAdmin);
    debounceBusquedaAdmin = setTimeout(() => {
        terminoBusquedaAdmin = valor;
        renderGridProductos();
    }, 150);
});

// ==========================================================
// TARJETA DE PRODUCTO (grid del admin)
// ==========================================================
function nombreCategoria(slug) {
    const categoria = categoriasCache.find(c => c.slug === slug);
    return categoria ? categoria.nombre : (slug || 'Sin categoría');
}

function crearCardProductoAdmin(producto) {
    const activo = producto.activo !== false;

    const card = document.createElement('div');
    card.className = 'group bg-white border border-ink-900/10 rounded-3xl p-4 flex flex-col hover:border-ink-900/20 hover:-translate-y-0.5 transition-all duration-300';

    const imgWrap = document.createElement('div');
    imgWrap.className = 'aspect-square rounded-2xl overflow-hidden mb-4 relative bg-sand-100';

    const img = document.createElement('img');
    img.src = producto.imagen || 'https://images.unsplash.com/photo-1596433809252-260c27459eb5?auto=format&fit=crop&w=500&q=80';
    img.alt = producto.nombre || 'Producto';
    img.loading = 'lazy';
    img.className = `w-full h-full object-cover transition-all duration-300 ${activo ? '' : 'grayscale opacity-50'}`;
    imgWrap.appendChild(img);

    if (producto.nuevo) {
        const etiqueta = document.createElement('span');
        etiqueta.className = 'absolute top-3 left-3 bg-sand-50/95 px-3 py-1 rounded-full font-mono text-[10px] uppercase tracking-wider text-clay-600';
        etiqueta.innerText = 'Nuevo';
        imgWrap.appendChild(etiqueta);
    }

    if (!activo) {
        const etiquetaSinStock = document.createElement('span');
        etiquetaSinStock.className = 'absolute top-3 right-3 bg-ink-900/85 px-3 py-1 rounded-full font-mono text-[10px] uppercase tracking-wider text-sand-50';
        etiquetaSinStock.innerText = 'Sin stock';
        imgWrap.appendChild(etiquetaSinStock);
    }

    const cat = document.createElement('p');
    cat.className = 'font-mono text-[10px] uppercase tracking-widest text-sage-600 mb-1.5';
    cat.innerText = nombreCategoria(producto.categoria);

    const titulo = document.createElement('h3');
    titulo.className = 'text-base font-medium text-ink-900 leading-snug mb-1 truncate';
    titulo.style.fontFamily = "'Fraunces', serif";
    titulo.innerText = producto.nombre || 'Sin nombre';

    const precio = document.createElement('p');
    precio.className = 'text-sm text-ink-700';
    precio.style.fontFamily = "'IBM Plex Mono', monospace";
    precio.innerText = `$${Number(producto.precio || 0).toLocaleString('es-AR')}`;

    const acciones = document.createElement('div');
    acciones.className = 'mt-4 pt-4 border-t border-ink-900/10 flex items-center gap-2';

    const btnEditar = document.createElement('button');
    btnEditar.className = 'flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-ink-700 hover:text-clay-600 hover:bg-ink-900/5 rounded-xl py-2.5 transition';
    btnEditar.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        Editar
    `;
    btnEditar.addEventListener('click', () => editarProducto(producto.id));

    const btnToggle = document.createElement('button');
    btnToggle.className = 'shrink-0 h-9 w-9 flex items-center justify-center text-ink-500 hover:text-sage-600 hover:bg-ink-900/5 rounded-xl transition';
    btnToggle.title = activo ? 'Marcar sin stock' : 'Marcar con stock';
    btnToggle.innerHTML = activo
        ? `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
           </svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.88 9.88l4.242 4.242M9.88 9.88L3 3m6.88 6.88L21 21m-6.121-6.121L21 3" />
           </svg>`;
    btnToggle.addEventListener('click', () => toggleDisponibilidad(producto.id));

    const btnEliminar = document.createElement('button');
    btnEliminar.className = 'shrink-0 h-9 w-9 flex items-center justify-center text-ink-500 hover:text-red-500 hover:bg-red-50 rounded-xl transition';
    btnEliminar.title = 'Eliminar';
    btnEliminar.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
    `;
    btnEliminar.addEventListener('click', () => eliminarProducto(producto.id));

    acciones.appendChild(btnEditar);
    acciones.appendChild(btnToggle);
    acciones.appendChild(btnEliminar);

    card.appendChild(imgWrap);
    card.appendChild(cat);
    card.appendChild(titulo);
    card.appendChild(precio);
    card.appendChild(acciones);

    return card;
}

// ==========================================================
// RENDER PRINCIPAL DEL GRID (admin)
// ==========================================================
function renderGridProductos() {
    if (!gridProductos) return;

    contadorProductos.innerText = productosCache.length === 0
        ? ''
        : `${productosCache.length} producto${productosCache.length === 1 ? '' : 's'} cargado${productosCache.length === 1 ? '' : 's'}`;

    const busqueda = normalizarTexto(terminoBusquedaAdmin.trim());

    const visibles = productosCache
        .filter(p => categoriaFiltroAdmin === 'todos' || p.categoria === categoriaFiltroAdmin)
        .filter(p => {
            if (!busqueda) return true;
            const texto = normalizarTexto(`${p.nombre || ''} ${p.descripcion || ''}`);
            return texto.includes(busqueda);
        })
        .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));

    gridProductos.innerHTML = '';

    if (productosCache.length === 0) {
        gridProductos.innerHTML = `
            <div class="col-span-full text-center py-16 text-ink-500">
                <p class="font-medium text-lg text-ink-900 mb-1">Todavía no cargaste ningún producto.</p>
                <p class="text-sm">Usá el botón "Nuevo producto" para agregar el primero.</p>
            </div>
        `;
        return;
    }

    if (visibles.length === 0) {
        gridProductos.innerHTML = `
            <div class="col-span-full text-center py-16 text-ink-500">
                <p class="font-medium text-lg text-ink-900 mb-1">No hay productos para este filtro.</p>
                <p class="text-sm">Probá con otra búsqueda o categoría.</p>
            </div>
        `;
        return;
    }

    visibles.forEach(producto => {
        gridProductos.appendChild(crearCardProductoAdmin(producto));
    });
}

// ==========================================================
// LISTENERS EN TIEMPO REAL
// ==========================================================
onSnapshot(collection(db, 'categorias'), (snapshot) => {
    categoriasCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    actualizarSelectCategoriaProducto();
    actualizarFiltroCategoriaAdmin();
    renderListaCategorias();
    renderGridProductos(); // los nombres de categoría de cada producto pueden cambiar
}, (error) => {
    console.error('Error al leer categorías:', error);
    if (listaCategorias) {
        listaCategorias.innerHTML = `
            <p class="text-red-500 text-sm text-center py-10">
                No se pudo conectar con Firestore. Revisá la config o las reglas.
            </p>
        `;
    }
});

onSnapshot(collection(db, 'productos'), (snapshot) => {
    productosCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderGridProductos();
    renderListaCategorias(); // el conteo de productos por categoría puede cambiar
}, (error) => {
    console.error('Error al leer productos:', error);
    if (gridProductos) {
        gridProductos.innerHTML = `
            <p class="col-span-full text-red-500 text-sm text-center py-10">
                No se pudo conectar con Firestore. Revisá la config o las reglas.
            </p>
        `;
    }
});
