// ==========================================================
// PRODUCTOS.JS - Catálogo dinámico desde Firestore
// ==========================================================
//
// Estructura de documento esperada en la colección "productos":
// {
//   nombre:      string   (obligatorio)
//   descripcion: string   (opcional)
//   precio:      number   (obligatorio)
//   categoria:   string   ("sahumerios" | "cascadas" | "esencias")
//   imagen:      string   (URL, ej. Cloudinary)
//   nuevo:       boolean  (opcional, muestra la etiqueta "Nuevo")
//   activo:      boolean  (opcional, default true. false = oculto en la web)
//   orden:       number   (opcional, para ordenar manualmente)
// }
//
// Por ahora los productos se cargan a mano desde la consola de Firebase.
// Más adelante esto se reemplaza por un panel de administración.

import { db } from "./firebase-config.js";
import {
    collection,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let productosCache = [];
let terminoBusqueda = '';

const contenedor = document.getElementById('contenedor-productos');

// ==========================================================
// SKELETON LOADERS (mientras llega la data)
// ==========================================================
function mostrarSkeletons(cantidad = 4) {
    if (!contenedor) return;
    contenedor.innerHTML = '';
    for (let i = 0; i < cantidad; i++) {
        const skeleton = document.createElement('div');
        skeleton.className = 'bg-white/30 backdrop-blur-xl border border-white/50 rounded-3xl p-4 animate-pulse';
        skeleton.innerHTML = `
            <div class="aspect-square rounded-2xl bg-gray-300/50 mb-4"></div>
            <div class="h-4 bg-gray-300/50 rounded-full w-3/4 mb-2"></div>
            <div class="h-3 bg-gray-300/40 rounded-full w-full mb-1"></div>
            <div class="h-3 bg-gray-300/40 rounded-full w-2/3 mb-4"></div>
            <div class="h-10 bg-gray-300/50 rounded-xl w-full"></div>
        `;
        contenedor.appendChild(skeleton);
    }
}

// ==========================================================
// TARJETA DE PRODUCTO (se arma con createElement, no con
// innerHTML + template strings, para no romperse con comillas
// o caracteres especiales en nombres/descripciones)
// ==========================================================
function crearCardProducto(producto) {
    const card = document.createElement('div');
    card.className = 'bg-white/30 backdrop-blur-xl border border-white/50 shadow-xl shadow-teal-900/5 rounded-3xl p-4 flex flex-col hover:-translate-y-1 transition-transform duration-300 reveal';

    const link = document.createElement('a');
    link.href = `producto.html?id=${producto.id}`;
    link.className = 'block';

    const imgWrap = document.createElement('div');
    imgWrap.className = 'aspect-square overflow-hidden rounded-2xl mb-4 relative';

    const img = document.createElement('img');
    img.src = producto.imagen || 'https://images.unsplash.com/photo-1596433809252-260c27459eb5?auto=format&fit=crop&w=500&q=80';
    img.alt = producto.nombre || 'Producto';
    img.loading = 'lazy';
    img.className = 'w-full h-full object-cover';
    imgWrap.appendChild(img);

    if (producto.nuevo) {
        const etiqueta = document.createElement('div');
        etiqueta.className = 'absolute top-2 left-2 bg-white/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/50 text-xs font-semibold text-gray-800';
        etiqueta.innerText = 'Nuevo';
        imgWrap.appendChild(etiqueta);
    }

    const info = document.createElement('div');
    info.className = 'flex-1';

    const titulo = document.createElement('h3');
    titulo.className = 'text-lg font-bold text-gray-800';
    titulo.innerText = producto.nombre || 'Sin nombre';

    const desc = document.createElement('p');
    desc.className = 'text-gray-600 text-sm mt-1 line-clamp-2';
    desc.innerText = producto.descripcion || '';

    info.appendChild(titulo);
    info.appendChild(desc);
    link.appendChild(imgWrap);
    link.appendChild(info);

    const footer = document.createElement('div');
    footer.className = 'mt-4 flex justify-between items-center pt-4 border-t border-white/40';

    const precio = document.createElement('span');
    precio.className = 'text-xl font-black text-gray-900';
    precio.innerText = `$${Number(producto.precio || 0).toLocaleString('es-AR')}`;

    const btn = document.createElement('button');
    btn.className = 'btn-agregar-carrito bg-white/60 hover:bg-white border border-white text-gray-900 h-10 w-10 rounded-xl flex items-center justify-center shadow-sm transition-colors';
    btn.dataset.id = producto.id;
    btn.dataset.nombre = producto.nombre || 'Sin nombre';
    btn.dataset.precio = producto.precio || 0;
    btn.dataset.imagen = img.src;
    btn.dataset.cantidad = '1';
    btn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
    `;

    footer.appendChild(precio);
    footer.appendChild(btn);

    card.appendChild(link);
    card.appendChild(footer);

    return card;
}

// ==========================================================
// RENDER PRINCIPAL
// ==========================================================
function renderProductos() {
    if (!contenedor) return;

    const busqueda = normalizarTexto(terminoBusqueda.trim());

    const visibles = productosCache
        .filter(p => p.activo !== false)
        .filter(p => {
            if (!busqueda) return true;
            const texto = normalizarTexto(`${p.nombre || ''} ${p.descripcion || ''}`);
            return texto.includes(busqueda);
        })
        .sort((a, b) => {
            if (a.orden != null && b.orden != null) return a.orden - b.orden;
            return (a.nombre || '').localeCompare(b.nombre || '');
        });

    contenedor.innerHTML = '';

    if (visibles.length === 0) {
        const vacio = document.createElement('div');
        vacio.className = 'col-span-full text-center py-16 text-gray-500';
        vacio.innerHTML = busqueda
            ? `
                <p class="font-medium text-lg mb-1">No encontramos productos para "${escaparHtml(terminoBusqueda.trim())}".</p>
                <p class="text-sm">Probá con otra palabra o revisá que esté bien escrito.</p>
            `
            : `
                <p class="font-medium text-lg mb-1">Todavía no hay productos cargados.</p>
                <p class="text-sm">Muy pronto vas a ver el catálogo completo acá.</p>
            `;
        contenedor.appendChild(vacio);
        return;
    }

    visibles.forEach(producto => {
        contenedor.appendChild(crearCardProducto(producto));
    });

    // Los botones "agregar" se acaban de crear: hay que engancharlos al carrito
    if (typeof inicializarBotonesAgregar === 'function') {
        inicializarBotonesAgregar();
    }

    // Activar animación de entrada para las cards nuevas
    if (typeof activarReveal === 'function') {
        activarReveal();
    }
}

// Saca tildes y pasa a minúsculas para que la búsqueda no sea sensible a acentos
function normalizarTexto(texto) {
    return (texto || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

// Evita que texto buscado por el usuario rompa el HTML del mensaje de "vacío"
function escaparHtml(texto) {
    const div = document.createElement('div');
    div.innerText = texto;
    return div.innerHTML;
}

// ==========================================================
// BUSCADOR (input en la sección "Nuestros productos")
// ==========================================================
let debounceBusqueda = null;

function inicializarBuscador() {
    const input = document.getElementById('buscador-productos');
    if (!input) return;

    input.addEventListener('input', (e) => {
        const valor = e.target.value;
        clearTimeout(debounceBusqueda);
        // Pequeño debounce para no re-renderizar en cada tecla si el catálogo es grande
        debounceBusqueda = setTimeout(() => {
            terminoBusqueda = valor;
            renderProductos();
        }, 150);
    });
}

function limpiarBusqueda() {
    terminoBusqueda = '';
    const input = document.getElementById('buscador-productos');
    if (input) input.value = '';
    renderProductos();
}

// Exponemos las funciones que necesita el HTML (onclick) y script.js
window.limpiarBusqueda = limpiarBusqueda;

// ==========================================================
// LISTENER EN TIEMPO REAL
// ==========================================================
function iniciarListenerProductos() {
    mostrarSkeletons();

    onSnapshot(collection(db, 'productos'), (snapshot) => {
        productosCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderProductos();
    }, (error) => {
        console.error('Error al leer productos de Firestore:', error);
        if (contenedor) {
            contenedor.innerHTML = `
                <div class="col-span-full text-center py-16 text-gray-500">
                    <p class="font-medium">No pudimos cargar el catálogo.</p>
                    <p class="text-sm mt-1">Revisá la configuración de Firebase o las reglas de Firestore.</p>
                </div>
            `;
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    inicializarBuscador();
    iniciarListenerProductos();
});