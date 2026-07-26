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
//   activo:      boolean  (opcional, default true. false = sin stock: se
//                          sigue mostrando en la web, pero con la etiqueta
//                          "Sin stock" y sin poder agregarlo al carrito)
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
let categoriasCache = [];
let terminoBusqueda = '';
let categoriaActiva = 'todos';

const contenedor = document.getElementById('contenedor-productos');
const contenedorFiltros = document.getElementById('filtros-categoria');

// ==========================================================
// SKELETON LOADERS (mientras llega la data)
// ==========================================================
function mostrarSkeletons(cantidad = 4) {
    if (!contenedor) return;
    contenedor.innerHTML = '';
    for (let i = 0; i < cantidad; i++) {
        const skeleton = document.createElement('div');
        skeleton.className = 'bg-sand-100 border border-ink-900/10 rounded-3xl p-4 animate-pulse';
        skeleton.innerHTML = `
            <div class="aspect-square rounded-2xl bg-ink-900/10 mb-4"></div>
            <div class="h-3 bg-ink-900/10 rounded-full w-1/3 mb-3"></div>
            <div class="h-4 bg-ink-900/10 rounded-full w-3/4 mb-4"></div>
            <div class="h-10 bg-ink-900/10 rounded-full w-full"></div>
        `;
        contenedor.appendChild(skeleton);
    }
}

// Primera letra en mayúscula, fallback para categorías que todavía
// no estén cargadas en la colección "categorias" (o data vieja)
function capitalizar(texto) {
    if (!texto) return '';
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// Nombre "lindo" de una categoría a partir de su identificador (slug).
// Si no la encuentra en categoriasCache, muestra el slug capitalizado.
function nombreCategoria(slug) {
    if (!slug) return '';
    const categoria = categoriasCache.find(c => c.slug === slug);
    return categoria ? categoria.nombre : capitalizar(slug);
}

function ordenarCategorias(lista) {
    return [...lista].sort((a, b) => {
        if (a.orden != null && b.orden != null) return a.orden - b.orden;
        return (a.nombre || '').localeCompare(b.nombre || '');
    });
}

// ==========================================================
// TARJETA DE PRODUCTO (se arma con createElement, no con
// innerHTML + template strings, para no romperse con comillas
// o caracteres especiales en nombres/descripciones)
// ==========================================================
function crearCardProducto(producto) {
    const sinStock = producto.activo === false;

    const card = document.createElement('div');
    card.className = 'group bg-white border border-ink-900/10 rounded-3xl p-4 flex flex-col hover:border-ink-900/20 hover:-translate-y-1 transition-all duration-300 reveal';

    const link = document.createElement('a');
    link.href = `producto.html?id=${producto.id}`;
    link.className = 'block';

    const imgWrap = document.createElement('div');
    imgWrap.className = 'aspect-square overflow-hidden rounded-2xl mb-4 relative bg-sand-100';

    const img = document.createElement('img');
    img.src = producto.imagen || 'https://images.unsplash.com/photo-1596433809252-260c27459eb5?auto=format&fit=crop&w=500&q=80';
    img.alt = producto.nombre || 'Producto';
    img.loading = 'lazy';
    img.className = `w-full h-full object-cover transition-all duration-500 ${sinStock ? 'grayscale opacity-60' : 'group-hover:scale-105'}`;
    imgWrap.appendChild(img);

    if (producto.nuevo && !sinStock) {
        const etiqueta = document.createElement('div');
        etiqueta.className = 'absolute top-3 left-3 bg-sand-50/95 px-3 py-1 rounded-full font-mono text-[10px] uppercase tracking-wider text-clay-600';
        etiqueta.innerText = 'Nuevo';
        imgWrap.appendChild(etiqueta);
    }

    if (sinStock) {
        const etiquetaStock = document.createElement('div');
        etiquetaStock.className = 'absolute top-3 left-3 bg-ink-900/85 px-3 py-1 rounded-full font-mono text-[10px] uppercase tracking-wider text-sand-50';
        etiquetaStock.innerText = 'Sin stock';
        imgWrap.appendChild(etiquetaStock);
    }

    const info = document.createElement('div');
    info.className = 'flex-1';

    if (producto.categoria) {
        const cat = document.createElement('p');
        cat.className = 'font-mono text-[10px] uppercase tracking-widest text-sage-600 mb-1.5';
        cat.innerText = nombreCategoria(producto.categoria);
        info.appendChild(cat);
    }

    const titulo = document.createElement('h3');
    titulo.className = 'text-base font-medium text-ink-900 leading-snug';
    titulo.style.fontFamily = "'Fraunces', serif";
    titulo.innerText = producto.nombre || 'Sin nombre';

    info.appendChild(titulo);
    link.appendChild(imgWrap);
    link.appendChild(info);

    const footer = document.createElement('div');
    footer.className = 'mt-4 flex justify-between items-center pt-4 border-t border-ink-900/10';

    const precio = document.createElement('span');
    precio.className = `text-base font-medium ${sinStock ? 'text-ink-500' : 'text-ink-900'}`;
    precio.style.fontFamily = "'IBM Plex Mono', monospace";
    precio.innerText = `$${Number(producto.precio || 0).toLocaleString('es-AR')}`;

    footer.appendChild(precio);

    if (sinStock) {
        // Sin stock: no se puede agregar al carrito, solo ver el detalle.
        // Es un botón deshabilitado (no un link) para que quede claro que no es una acción disponible.
        const btnSinStock = document.createElement('button');
        btnSinStock.type = 'button';
        btnSinStock.disabled = true;
        btnSinStock.className = 'shrink-0 bg-ink-900/10 text-ink-500 font-mono text-[10px] uppercase tracking-wider px-3.5 py-2 rounded-full cursor-not-allowed';
        btnSinStock.innerText = 'Sin stock';
        footer.appendChild(btnSinStock);
    } else {
        const btn = document.createElement('button');
        btn.className = 'btn-agregar-carrito bg-ink-900 hover:bg-clay-600 text-sand-50 h-9 w-9 rounded-full flex items-center justify-center transition-colors';
        btn.dataset.id = producto.id;
        btn.dataset.nombre = producto.nombre || 'Sin nombre';
        btn.dataset.precio = producto.precio || 0;
        btn.dataset.imagen = img.src;
        btn.dataset.cantidad = '1';
        btn.setAttribute('aria-label', `Agregar ${producto.nombre || 'producto'} al carrito`);
        btn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
        `;
        footer.appendChild(btn);
    }

    card.appendChild(link);
    card.appendChild(footer);

    return card;
}

// ==========================================================
// FILTROS DE CATEGORÍA (se arman solos según lo que haya cargado)
// ==========================================================
function renderFiltrosCategoria() {
    if (!contenedorFiltros) return;

    // Solo mostramos como filtro las categorías que efectivamente tienen
    // algún producto cargado, para no llenar la barra de chips vacíos.
    // (los productos sin stock también cuentan: se muestran igual, solo no se pueden comprar)
    const slugsConProductos = new Set(
        productosCache.filter(p => p.categoria).map(p => p.categoria)
    );

    const categoriasConProductos = ordenarCategorias(
        categoriasCache.filter(c => slugsConProductos.has(c.slug))
    );

    // Por si hay productos con una categoría vieja que ya no existe en
    // la colección "categorias": igual la mostramos, con su slug capitalizado.
    const slugsConocidos = new Set(categoriasConProductos.map(c => c.slug));
    const huerfanas = Array.from(slugsConProductos)
        .filter(slug => !slugsConocidos.has(slug))
        .sort()
        .map(slug => ({ slug, nombre: capitalizar(slug) }));

    const opciones = [...categoriasConProductos, ...huerfanas];

    if (opciones.length === 0) {
        contenedorFiltros.innerHTML = '';
        return;
    }

    contenedorFiltros.innerHTML = '';

    const chipTodos = document.createElement('button');
    chipTodos.type = 'button';
    chipTodos.innerText = 'Todos';
    chipTodos.className = chipClase(categoriaActiva === 'todos');
    chipTodos.addEventListener('click', () => {
        categoriaActiva = 'todos';
        renderFiltrosCategoria();
        renderProductos();
    });
    contenedorFiltros.appendChild(chipTodos);

    opciones.forEach(cat => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.innerText = cat.nombre;
        chip.className = chipClase(cat.slug === categoriaActiva);
        chip.addEventListener('click', () => {
            categoriaActiva = cat.slug;
            renderFiltrosCategoria();
            renderProductos();
        });
        contenedorFiltros.appendChild(chip);
    });
}

function chipClase(activo) {
    return `px-4 py-2 rounded-full font-mono text-xs uppercase tracking-wider border transition-colors ${
        activo
            ? 'bg-ink-900 border-ink-900 text-sand-50'
            : 'bg-transparent border-ink-900/15 text-ink-700 hover:border-ink-900/40'
    }`;
}

// ==========================================================
// RENDER PRINCIPAL
// ==========================================================
function renderProductos() {
    if (!contenedor) return;

    const busqueda = normalizarTexto(terminoBusqueda.trim());

    // Los productos sin stock (activo: false) se muestran igual, pero
    // van al final del listado y no se pueden agregar al carrito.
    const visibles = productosCache
        .filter(p => categoriaActiva === 'todos' || p.categoria === categoriaActiva)
        .filter(p => {
            if (!busqueda) return true;
            const texto = normalizarTexto(`${p.nombre || ''} ${p.descripcion || ''}`);
            return texto.includes(busqueda);
        })
        .sort((a, b) => {
            const sinStockA = a.activo === false ? 1 : 0;
            const sinStockB = b.activo === false ? 1 : 0;
            if (sinStockA !== sinStockB) return sinStockA - sinStockB;
            if (a.orden != null && b.orden != null) return a.orden - b.orden;
            return (a.nombre || '').localeCompare(b.nombre || '');
        });

    contenedor.innerHTML = '';

    if (visibles.length === 0) {
        const vacio = document.createElement('div');
        vacio.className = 'col-span-full text-center py-16 text-ink-500';
        vacio.innerHTML = busqueda
            ? `
                <p class="font-medium text-lg text-ink-900 mb-1">No encontramos productos para "${escaparHtml(terminoBusqueda.trim())}".</p>
                <p class="text-sm">Probá con otra palabra o revisá que esté bien escrito.</p>
            `
            : `
                <p class="font-medium text-lg text-ink-900 mb-1">Todavía no hay productos cargados.</p>
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
    categoriaActiva = 'todos';
    const input = document.getElementById('buscador-productos');
    if (input) input.value = '';
    renderFiltrosCategoria();
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
        renderFiltrosCategoria();
        renderProductos();
    }, (error) => {
        console.error('Error al leer productos de Firestore:', error);
        if (contenedor) {
            contenedor.innerHTML = `
                <div class="col-span-full text-center py-16 text-ink-500">
                    <p class="font-medium text-ink-900">No pudimos cargar el catálogo.</p>
                    <p class="text-sm mt-1">Revisá la configuración de Firebase o las reglas de Firestore.</p>
                </div>
            `;
        }
    });
}

function iniciarListenerCategorias() {
    onSnapshot(collection(db, 'categorias'), (snapshot) => {
        categoriasCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Los nombres/orden de categoría pueden afectar tarjetas y chips ya renderizados
        renderFiltrosCategoria();
        renderProductos();
    }, (error) => {
        console.error('Error al leer categorías de Firestore:', error);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    inicializarBuscador();
    iniciarListenerCategorias();
    iniciarListenerProductos();
});
