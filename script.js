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
            nav.classList.add('bg-white/60', 'shadow-md');
            nav.classList.remove('bg-white/30', 'shadow-sm');
        } else {
            nav.classList.add('bg-white/30', 'shadow-sm');
            nav.classList.remove('bg-white/60', 'shadow-md');
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
// INIT
// ==========================================================
document.addEventListener('DOMContentLoaded', () => {
    inicializarNavScroll();
    activarReveal();
});