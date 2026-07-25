// ==========================================================
// ADMIN.JS - Carga y edición de productos (sin login todavía,
// eso lo sumamos en la siguiente vuelta)
// ==========================================================

import { db } from "./firebase-config.js";
import {
    collection,
    addDoc,
    updateDoc,
    doc,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let productosCache = [];
let idEnEdicion = null; // null = estamos creando uno nuevo

// ==========================================================
// REFERENCIAS AL FORMULARIO
// ==========================================================
const form = document.getElementById('form-producto');
const inputNombre = document.getElementById('input-nombre');
const inputDescripcion = document.getElementById('input-descripcion');
const inputPrecio = document.getElementById('input-precio');
const inputCategoria = document.getElementById('input-categoria');
const inputImagen = document.getElementById('input-imagen');
const inputNuevo = document.getElementById('input-nuevo');
const inputActivo = document.getElementById('input-activo');
const inputOrden = document.getElementById('input-orden');
const previewImg = document.getElementById('preview-imagen');

const tituloForm = document.getElementById('titulo-form');
const btnGuardar = document.getElementById('btn-guardar');
const btnCancelar = document.getElementById('btn-cancelar-edicion');
const listaProductos = document.getElementById('lista-productos');

// ==========================================================
// TOAST simple
// ==========================================================
function mostrarToast(mensaje, esError = false) {
    let toast = document.getElementById('admin-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'admin-toast';
        toast.className = 'fixed bottom-6 left-1/2 -translate-x-1/2 text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-xl z-[80] opacity-0 pointer-events-none transition-opacity duration-300';
        document.body.appendChild(toast);
    }
    toast.innerText = mensaje;
    toast.classList.toggle('bg-red-600/90', esError);
    toast.classList.toggle('bg-gray-900/90', !esError);
    toast.classList.remove('opacity-0');
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => toast.classList.add('opacity-0'), 2500);
}

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
// RESET DEL FORMULARIO (modo "nuevo producto")
// ==========================================================
function resetearFormulario() {
    idEnEdicion = null;
    form.reset();
    previewImg.classList.add('hidden');
    tituloForm.innerText = 'Nuevo producto';
    btnGuardar.innerText = 'Agregar producto';
    btnCancelar.classList.add('hidden');
    inputActivo.checked = true;
}

btnCancelar.addEventListener('click', resetearFormulario);

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
    inputCategoria.value = producto.categoria || 'sahumerios';
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

    tituloForm.innerText = `Editando: ${producto.nombre}`;
    btnGuardar.innerText = 'Guardar cambios';
    btnCancelar.classList.remove('hidden');

    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
window.editarProducto = editarProducto;

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
        categoria: inputCategoria.value,
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
        resetearFormulario();
    } catch (error) {
        console.error('Error al guardar producto:', error);
        mostrarToast('No se pudo guardar. Revisá la consola.', true);
    } finally {
        btnGuardar.disabled = false;
        btnGuardar.innerText = idEnEdicion ? 'Guardar cambios' : 'Agregar producto';
    }
});

// ==========================================================
// LISTADO DE PRODUCTOS (tiempo real)
// ==========================================================
function renderListaProductos() {
    if (!listaProductos) return;

    if (productosCache.length === 0) {
        listaProductos.innerHTML = `
            <p class="text-gray-500 text-sm text-center py-10">Todavía no cargaste ningún producto.</p>
        `;
        return;
    }

    const ordenados = [...productosCache].sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));

    listaProductos.innerHTML = '';
    ordenados.forEach(producto => {
        const card = document.createElement('div');
        card.className = 'flex items-center gap-3 bg-white/50 border border-white/60 rounded-2xl p-3';

        const activo = producto.activo !== false;

        card.innerHTML = `
            <img src="${producto.imagen || ''}" alt="" class="h-14 w-14 object-cover rounded-xl shrink-0 bg-gray-200">
            <div class="flex-1 min-w-0">
                <p class="font-semibold text-gray-800 text-sm truncate">${producto.nombre || 'Sin nombre'}</p>
                <p class="text-xs text-gray-500">
                    $${Number(producto.precio || 0).toLocaleString('es-AR')} ·
                    ${producto.categoria || 'sin categoría'} ·
                    <span class="${activo ? 'text-teal-600' : 'text-red-500'}">${activo ? 'Activo' : 'Oculto'}</span>
                </p>
            </div>
            <button class="btn-editar shrink-0 text-sm font-semibold text-teal-600 hover:text-teal-800 px-3 py-2 rounded-xl hover:bg-white/60 transition">
                Editar
            </button>
        `;

        card.querySelector('.btn-editar').addEventListener('click', () => editarProducto(producto.id));
        listaProductos.appendChild(card);
    });
}

// ==========================================================
// LISTENER EN TIEMPO REAL
// ==========================================================
onSnapshot(collection(db, 'productos'), (snapshot) => {
    productosCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderListaProductos();
}, (error) => {
    console.error('Error al leer productos:', error);
    if (listaProductos) {
        listaProductos.innerHTML = `
            <p class="text-red-500 text-sm text-center py-10">
                No se pudo conectar con Firestore. Revisá la config o las reglas.
            </p>
        `;
    }
});