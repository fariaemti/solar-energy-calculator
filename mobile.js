/* ========================================
   MOBILE JAVASCRIPT - Otimizações para Celular
   ======================================== */

// ==========================================
// MENU MOBILE
// ==========================================

/**
 * Inicializa menu mobile hamburger com suporte ao Material Symbols
 */
function inicializarMenuMobile() {
    const navbarContent = document.querySelector('.navbar-content');
    if (!navbarContent) return;
    
    // Criar botão de menu se não existir
    if (!document.querySelector('.menu-toggle')) {
        const menuToggle = document.createElement('button');
        menuToggle.className = 'menu-toggle';
        menuToggle.setAttribute('aria-label', 'Abrir Menu');
        menuToggle.innerHTML = '<span class="material-symbols-outlined">menu</span>';
        
        const navLinks = document.querySelector('.nav-links');
        if (navLinks) {
            navbarContent.insertBefore(menuToggle, navLinks);
        } else {
            navbarContent.appendChild(menuToggle);
        }
        
        menuToggle.addEventListener('click', toggleMenu);
    }
    
    // Fechar menu ao clicar em um link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                const navLinks = document.querySelector('.nav-links');
                const menuIcon = document.querySelector('.menu-toggle .material-symbols-outlined');
                
                if (navLinks) navLinks.classList.remove('active');
                if (menuIcon) menuIcon.textContent = 'menu';
            }
        });
    });
}

/**
 * Toggle do menu mobile
 */
function toggleMenu() {
    const navLinks = document.querySelector('.nav-links');
    const menuIcon = document.querySelector('.menu-toggle .material-symbols-outlined');
    
    if (!navLinks) return;
    
    if (navLinks.classList.contains('active')) {
        navLinks.classList.remove('active');
        if (menuIcon) menuIcon.textContent = 'menu';
    } else {
        navLinks.classList.add('active');
        if (menuIcon) menuIcon.textContent = 'close';
    }
}

// ==========================================
// OTIMIZAÇÕES PARA TOUCH
// ==========================================

/**
 * Detectar dispositivo mobile
 */
function ehMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
}

/**
 * Detectar orientação
 */
function detectarOrientacao() {
    if (window.matchMedia('(orientation: portrait)').matches) {
        document.body.classList.add('portrait');
        document.body.classList.remove('landscape');
    } else {
        document.body.classList.add('landscape');
        document.body.classList.remove('portrait');
    }
}

/**
 * Lidar com mudança de orientação
 */
function lidarMudancaOrientacao() {
    window.addEventListener('orientationchange', () => {
        detectarOrientacao();
        
        setTimeout(() => {
            if (typeof calculoAtual !== 'undefined' && calculoAtual && typeof atualizarGraficos === 'function') {
                atualizarGraficos();
            }
        }, 300);
    });
}

/**
 * Otimizar inputs para mobile
 */
function otimizarInputsMobile() {
    if (!ehMobile()) return;
    
    // Prevenir zoom automático no iOS
    document.querySelectorAll('input, select, textarea').forEach(input => {
        input.style.fontSize = '16px';
    });
    
    const inputsConfig = [
        'consumoMensal',
        'tarifaEnergia',
        'areaDisponivel',
        'custoPainel',
        'potenciaPainel'
    ];
    
    inputsConfig.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.setAttribute('inputmode', 'decimal');
    });
    
    const anosEl = document.getElementById('anos');
    if (anosEl) anosEl.setAttribute('inputmode', 'numeric');
}

// ==========================================
// PERFORMANCE MOBILE
// ==========================================

/**
 * Lazy loading de imagens
 */
function inicializarLazyLoading() {
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.classList.remove('lazy');
                    }
                    imageObserver.unobserve(img);
                }
            });
        });
        
        document.querySelectorAll('img.lazy').forEach(img => imageObserver.observe(img));
    }
}

/**
 * Debounce para eventos contínuos
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Redimensionamento responsivo de gráficos
 */
const handleResizeChart = debounce(() => {
    if (typeof calculoAtual !== 'undefined' && calculoAtual && window.innerWidth <= 768 && typeof atualizarGraficos === 'function') {
        atualizarGraficos();
    }
}, 500);

// ==========================================
// NOTIFICAÇÕES MOBILE (TOAST)
// ==========================================

/**
 * Exibe notificação no estilo Toast
 */
function mostrarToast(mensagem, tipo = 'info', duracao = 3000) {
    const toastAntigo = document.querySelector('.toast');
    if (toastAntigo) toastAntigo.remove();

    const toast = document.createElement('div');
    toast.className = `toast toast-${tipo}`;
    toast.textContent = mensagem;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        width: 90%;
        max-width: 400px;
        padding: 12px 20px;
        border-radius: 8px;
        background: ${tipo === 'success' ? '#10b981' : tipo === 'error' ? '#ef4444' : '#0ea5e9'};
        color: white;
        text-align: center;
        font-weight: 600;
        z-index: 9999;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        animation: slideUp 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideDown 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, duracao);
}

// ==========================================
// LOCAL STORAGE E INICIALIZAÇÃO
// ==========================================

function verificarStorageDisponivel() {
    try {
        const test = '__test__';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
    } catch (e) {
        return false;
    }
}

function limparStorageAntigo() {
    try {
        const historicoStr = localStorage.getItem('historico_calculos');
        if (historicoStr) {
            const historicoLocal = JSON.parse(historicoStr);
            if (Array.isArray(historicoLocal) && historicoLocal.length > 10) {
                const historicoLimitado = historicoLocal.slice(0, 10);
                localStorage.setItem('historico_calculos', JSON.stringify(historicoLimitado));
            }
        }
    } catch (e) {
        console.error('Erro ao gerenciar histórico:', e);
    }
}

function inicializarMobile() {
    inicializarMenuMobile();
    otimizarInputsMobile();
    detectarOrientacao();
    lidarMudancaOrientacao();
    inicializarLazyLoading();
    
    window.addEventListener('resize', handleResizeChart);
    
    if (verificarStorageDisponivel()) {
        limparStorageAntigo();
    } else {
        console.warn('LocalStorage não disponível');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    inicializarMobile();
});

// Estilos de animação e menu mobile CSS injetados dinamicamente
const style = document.createElement('style');
style.textContent = `
    .menu-toggle {
        background: none;
        border: none;
        color: var(--text-dark);
        font-size: 1.8rem;
        cursor: pointer;
        display: none;
        padding: 0.25rem;
    }

    @media (max-width: 768px) {
        .menu-toggle {
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .nav-links {
            display: none;
            flex-direction: column;
            width: 100%;
            padding: 1rem 0;
            gap: 1rem;
        }

        .nav-links.active {
            display: flex;
        }
    }

    @keyframes slideUp {
        from {
            transform: translate(-50%, 100px);
            opacity: 0;
        }
        to {
            transform: translate(-50%, 0);
            opacity: 1;
        }
    }
    
    @keyframes slideDown {
        from {
            transform: translate(-50%, 0);
            opacity: 1;
        }
        to {
            transform: translate(-50%, 100px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
