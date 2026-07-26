// ==========================================================
// CARRITO.JS - Lógica de carrito para Samadhi
// ==========================================================

// ⚠️ CONFIGURACIÓN: reemplazá por el número real de WhatsApp
// Formato: código de país + área + número, sin espacios ni símbolos.
const WHATSAPP_NUMERO = "5493735000000"; // TODO: poner el número real
window.WHATSAPP_NUMERO = WHATSAPP_NUMERO; // accesible también desde scripts type="module" (ej. producto.html)

let carrito = JSON.parse(localStorage.getItem('aromas_carrito')) || [];

function guardarCarrito() {
    localStorage.setItem('aromas_carrito', JSON.stringify(carrito));
}

function actualizarBadge() {
    const totalItems = carrito.reduce((total, producto) => total + producto.cantidad, 0);
    const badges = document.querySelectorAll('#cart-count');
    badges.forEach(badge => {
        badge.innerText = totalItems;
        badge.classList.add('scale-125');
        setTimeout(() => badge.classList.remove('scale-125'), 200);
    });
}

function agregarAlCarrito(productoNuevo) {
    const indiceExistente = carrito.findIndex(item => item.id === productoNuevo.id);

    if (indiceExistente !== -1) {
        carrito[indiceExistente].cantidad += productoNuevo.cantidad;
    } else {
        carrito.push(productoNuevo);
    }

    guardarCarrito();
    actualizarBadge();
    renderCarrito();
    mostrarToast(`${productoNuevo.nombre} agregado al carrito`);
    abrirCarrito();
}

function cambiarCantidadCarrito(id, delta) {
    const indice = carrito.findIndex(item => item.id === id);
    if (indice === -1) return;

    carrito[indice].cantidad += delta;

    if (carrito[indice].cantidad <= 0) {
        carrito.splice(indice, 1);
    }

    guardarCarrito();
    actualizarBadge();
    renderCarrito();
}

function eliminarDelCarrito(id) {
    carrito = carrito.filter(item => item.id !== id);
    guardarCarrito();
    actualizarBadge();
    renderCarrito();
}

function calcularTotalCarrito() {
    return carrito.reduce((total, producto) => total + (producto.precio * producto.cantidad), 0);
}

function formatearPrecio(numero) {
    return numero.toLocaleString('es-AR');
}

// ==========================================================
// DRAWER DEL CARRITO (se inyecta por JS, sin tocar el HTML)
// ==========================================================

function crearDrawerCarrito() {
    if (document.getElementById('carrito-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'carrito-overlay';
    overlay.className = 'fixed inset-0 bg-[#2B2621]/40 z-[60] hidden';
    overlay.onclick = cerrarCarrito;

    const drawer = document.createElement('aside');
    drawer.id = 'carrito-drawer';
    // Ojo: el backdrop-blur NO va acá directo. Se agrega/saca dinámicamente
    // (ver abrirCarrito/cerrarCarrito) porque animar transform + blur al
    // mismo tiempo es carísimo para el navegador y se siente trabado/lento.
    drawer.className = 'fixed top-0 right-0 h-full w-full sm:w-[420px] bg-[#FAF7F0] border-l border-[#2B2621]/10 shadow-2xl z-[70] translate-x-full transition-transform duration-300 will-change-transform flex flex-col font-["Work_Sans",sans-serif]';

    drawer.innerHTML = `
        <div class="flex items-center justify-between px-6 h-20 border-b border-[#2B2621]/10 shrink-0">
            <h2 class="text-xl font-semibold text-[#2B2621]" style="font-family:'Fraunces', serif;">Tu carrito</h2>
            <button onclick="cerrarCarrito()" class="p-2 hover:bg-[#2B2621]/5 rounded-full transition">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-[#4A4038]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>

        <div id="carrito-items" class="flex-1 overflow-y-auto px-6 py-4 space-y-4"></div>

        <div id="carrito-footer" class="px-6 py-5 border-t border-[#2B2621]/10 bg-[#F1EAD9]/50 shrink-0">
            <div class="flex justify-between items-center mb-4">
                <span class="text-[#4A4038] font-medium text-sm">Total</span>
                <span id="carrito-total" class="text-2xl font-semibold text-[#2B2621]" style="font-family:'IBM Plex Mono', monospace;">$0</span>
            </div>
            <button onclick="enviarPedidoWhatsApp()" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-4 rounded-full shadow-sm transition-colors duration-300 flex items-center justify-center space-x-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.393.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.1.824z"></path>
                </svg>
                <span>Finalizar por WhatsApp</span>
            </button>
        </div>
    `;

    drawer.addEventListener('transitionend', (e) => {
        if (e.propertyName !== 'transform') return;
        // Si terminó de deslizar y quedó abierto (no en translate-x-full),
        // recién ahí sumamos el blur, que ya no cuesta nada porque está quieto.
        if (!drawer.classList.contains('translate-x-full')) {
            drawer.classList.add('backdrop-blur-2xl');
        }
    });

    document.body.appendChild(overlay);
    document.body.appendChild(drawer);
}

function abrirCarrito() {
    crearDrawerCarrito();
    renderCarrito();
    const drawer = document.getElementById('carrito-drawer');
    document.getElementById('carrito-overlay').classList.remove('hidden');
    // Sin blur mientras desliza (es lo que hacía lenta la animación)
    drawer.classList.remove('backdrop-blur-2xl');
    requestAnimationFrame(() => {
        drawer.classList.remove('translate-x-full');
    });
    document.body.classList.add('overflow-hidden');
}

function cerrarCarrito() {
    const drawer = document.getElementById('carrito-drawer');
    const overlay = document.getElementById('carrito-overlay');
    if (!drawer || !overlay) return;
    // Sacamos el blur antes de deslizar afuera, por la misma razón
    drawer.classList.remove('backdrop-blur-2xl');
    drawer.classList.add('translate-x-full');
    document.body.classList.remove('overflow-hidden');
    setTimeout(() => overlay.classList.add('hidden'), 300);
}

function toggleCarrito() {
    crearDrawerCarrito();
    const drawer = document.getElementById('carrito-drawer');
    if (drawer.classList.contains('translate-x-full')) {
        abrirCarrito();
    } else {
        cerrarCarrito();
    }
}

function renderCarrito() {
    crearDrawerCarrito();
    const contenedor = document.getElementById('carrito-items');
    const totalEl = document.getElementById('carrito-total');
    const footer = document.getElementById('carrito-footer');
    if (!contenedor) return;

    if (carrito.length === 0) {
        contenedor.innerHTML = `
            <div class="h-full flex flex-col items-center justify-center text-center text-[#7A6F61] py-16">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-[#D3C3A0] mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.4" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <p class="font-medium text-[#2B2621]">Tu carrito está vacío</p>
                <p class="text-sm mt-1">Agregá productos para empezar tu pedido.</p>
            </div>
        `;
        if (footer) footer.classList.add('hidden');
        return;
    }

    if (footer) footer.classList.remove('hidden');

    contenedor.innerHTML = carrito.map(item => `
        <div class="flex items-center gap-3 bg-white border border-[#2B2621]/10 rounded-2xl p-3">
            <img src="${item.imagen}" alt="${item.nombre}" class="h-16 w-16 object-cover rounded-xl shrink-0">
            <div class="flex-1 min-w-0">
                <p class="font-medium text-[#2B2621] text-sm truncate">${item.nombre}</p>
                <p class="text-[#A86A4B] font-medium text-sm" style="font-family:'IBM Plex Mono', monospace;">$${formatearPrecio(item.precio)}</p>
                <div class="flex items-center gap-2 mt-2">
                    <button onclick="cambiarCantidadCarrito('${item.id}', -1)" class="h-7 w-7 flex items-center justify-center bg-[#F1EAD9] border border-[#2B2621]/10 rounded-lg text-[#4A4038] hover:text-[#A86A4B] font-medium transition">-</button>
                    <span class="text-sm font-medium w-5 text-center">${item.cantidad}</span>
                    <button onclick="cambiarCantidadCarrito('${item.id}', 1)" class="h-7 w-7 flex items-center justify-center bg-[#F1EAD9] border border-[#2B2621]/10 rounded-lg text-[#4A4038] hover:text-[#A86A4B] font-medium transition">+</button>
                </div>
            </div>
            <button onclick="eliminarDelCarrito('${item.id}')" class="p-2 text-[#D3C3A0] hover:text-[#A86A4B] transition shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
            </button>
        </div>
    `).join('');

    if (totalEl) totalEl.innerText = `$${formatearPrecio(calcularTotalCarrito())}`;
}

// ==========================================================
// TOAST (feedback visual simple, sin librerías)
// ==========================================================
function mostrarToast(mensaje) {
    let toast = document.getElementById('aromas-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'aromas-toast';
        toast.className = 'fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#2B2621]/95 backdrop-blur-md text-[#FAF7F0] text-sm font-medium px-5 py-3 rounded-full shadow-xl z-[80] opacity-0 pointer-events-none transition-opacity duration-300';
        document.body.appendChild(toast);
    }
    toast.innerText = mensaje;
    toast.classList.remove('opacity-0');
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => toast.classList.add('opacity-0'), 2200);
}

// ==========================================================
// CHECKOUT POR WHATSAPP
// ==========================================================
function enviarPedidoWhatsApp() {
    if (carrito.length === 0) return;

    let mensaje = `¡Hola! Quiero hacer este pedido en *Samadhi*:%0A%0A`;

    carrito.forEach(item => {
        mensaje += `• ${item.cantidad}x ${item.nombre} - $${formatearPrecio(item.precio * item.cantidad)}%0A`;
    });

    mensaje += `%0A*Total: $${formatearPrecio(calcularTotalCarrito())}*`;

    const url = `https://wa.me/${WHATSAPP_NUMERO}?text=${mensaje}`;
    window.open(url, '_blank');
}

// ==========================================================
// BOTONES "AGREGAR AL CARRITO" (data-attributes en el HTML)
// ==========================================================
function inicializarBotonesAgregar() {
    document.querySelectorAll('.btn-agregar-carrito').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const producto = {
                id: btn.dataset.id,
                nombre: btn.dataset.nombre,
                precio: parseFloat(btn.dataset.precio),
                imagen: btn.dataset.imagen,
                cantidad: parseInt(btn.dataset.cantidad || '1', 10)
            };
            agregarAlCarrito(producto);
        });
    });
}

// ==========================================================
// ÍCONO DEL CARRITO EN LA NAV (abre el drawer)
// ==========================================================
function inicializarBotonCarritoNav() {
    document.querySelectorAll('.btn-abrir-carrito').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            toggleCarrito();
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    crearDrawerCarrito();
    actualizarBadge();
    inicializarBotonesAgregar();
    inicializarBotonCarritoNav();
});
