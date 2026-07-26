// ==========================================================
// SCRIPT.JS - Vida general del sitio (no es lógica de carrito ni de datos)
// ==========================================================

// ==========================================================
// 1. NAV: más opaca y con más sombra al hacer scroll
// ==========================================================
function inicializarNavScroll() {
    const nav = document.querySelector('nav');
    if (!nav) return;

    const actualizarNav = () => {
        if (window.scrollY > 20) {
            nav.classList.add('bg-sand-50/95', 'shadow-sm');
            nav.classList.remove('bg-sand-50/80');
        } else {
            nav.classList.add('bg-sand-50/80');
            nav.classList.remove('bg-sand-50/95', 'shadow-sm');
        }
    };

    window.addEventListener('scroll', actualizarNav, { passive: true });
    actualizarNav();
}

// ==========================================================
// 2. SCROLL REVEAL: los elementos con clase .reveal aparecen
//    suavemente cuando entran en pantalla. Usa solo clases de
//    Tailwind, no necesita CSS aparte.
//    Se re-ejecuta cada vez que productos.js agrega tarjetas nuevas.
// ==========================================================
let observadorReveal = null;

function activarReveal() {
    if (!('IntersectionObserver' in window)) {
        // Navegadores muy viejos: mostramos todo directo, sin animación
        document.querySelectorAll('.reveal').forEach(el => {
            el.classList.remove('opacity-0', 'translate-y-6');
            el.classList.add('opacity-100', 'translate-y-0');
        });
        return;
    }

    if (!observadorReveal) {
        observadorReveal = new IntersectionObserver((entradas) => {
            entradas.forEach(entrada => {
                if (entrada.isIntersecting) {
                    entrada.target.classList.remove('opacity-0', 'translate-y-6');
                    entrada.target.classList.add('opacity-100', 'translate-y-0');
                    observadorReveal.unobserve(entrada.target);
                }
            });
        }, { threshold: 0.15 });
    }

    document.querySelectorAll('.reveal:not(.reveal-observado)').forEach(el => {
        el.classList.add('opacity-0', 'translate-y-6', 'transition-all', 'duration-700', 'ease-out', 'reveal-observado');
        observadorReveal.observe(el);
    });
}

// Lo exponemos para que productos.js lo pueda llamar tras renderizar
window.activarReveal = activarReveal;

// ==========================================================
// 3. MODAL DE CONTACTO (Ubicación, WhatsApp, Instagram, horarios)
// ==========================================================
function actualizarLinkWhatsappContacto() {
    const link = document.getElementById('contacto-whatsapp-link');
    if (!link) return;
    const numero = window.WHATSAPP_NUMERO;
    const mensaje = encodeURIComponent('¡Hola! Quiero hacer una consulta.');
    link.href = numero ? `https://wa.me/${numero}?text=${mensaje}` : '#';
}

function abrirModalContacto() {
    const overlay = document.getElementById('contacto-overlay');
    const modal = document.getElementById('contacto-modal');
    const panel = document.getElementById('contacto-modal-panel');
    if (!overlay || !modal || !panel) return;

    actualizarLinkWhatsappContacto();

    overlay.classList.remove('hidden');
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    requestAnimationFrame(() => {
        panel.classList.remove('opacity-0', 'scale-95');
        panel.classList.add('opacity-100', 'scale-100');
    });

    document.body.classList.add('overflow-hidden');
}

function cerrarModalContacto() {
    const overlay = document.getElementById('contacto-overlay');
    const modal = document.getElementById('contacto-modal');
    const panel = document.getElementById('contacto-modal-panel');
    if (!overlay || !modal || !panel) return;

    panel.classList.remove('opacity-100', 'scale-100');
    panel.classList.add('opacity-0', 'scale-95');
    overlay.classList.add('hidden');

    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }, 200);

    document.body.classList.remove('overflow-hidden');
}

function inicializarModalContacto() {
    const btnAbrir = document.getElementById('btn-abrir-contacto');
    if (btnAbrir) {
        btnAbrir.addEventListener('click', abrirModalContacto);
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') cerrarModalContacto();
    });
}

// ==========================================================
// INIT
// ==========================================================
document.addEventListener('DOMContentLoaded', () => {
    inicializarNavScroll();
    activarReveal();
    inicializarModalContacto();
});
