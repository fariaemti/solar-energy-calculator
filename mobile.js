/* ========================================
   MOBILE JAVASCRIPT - Otimizações para Celular
   ======================================== */

// ==========================================
// MENU MOBILE
// ==========================================

/**
 * Inicializa menu mobile hamburger
 */
function inicializarMenuMobile() {
    const navbarContent = document.querySelector('.navbar-content');
    
    // Criar botão de menu se não existir
    if (!document.querySelector('.menu-toggle')) {
        const menuToggle = document.createElement('button');
        menuToggle.className = 'menu-toggle';
        menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
        menuToggle.setAttribute('title', 'Menu');
        
        navbarContent.insertBefore(menuToggle, document.querySelector('.nav-links'));
        
        menuToggle.addEventListener('click', toggleMenu);
    }
    
    // Fechar menu ao clicar em um link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                document.querySelector('.nav-links').classList.remove('active');
                document.querySelector('.menu-toggle i').className = 'fas fa-bars';
            }
        });
    });
}

/**
 * Toggle do menu mobile
 */
function toggleMenu() {
    const navLinks = document.querySelector('.nav-links');
    const menuToggle = document.querySelector('.menu-toggle i');
    
    if (navLinks.classList.contains('active')) {
        navLinks.classList.remove('active');
        menuToggle.className = 'fas fa-bars';
    } else {
        navLinks.classList.add('active');
        menuToggle.className = 'fas fa-times';
    }
}

// ==========================================
// OTIMIZAÇÕES PARA TOUCH
// ==========================================

/**
 * Detectar dispositivo mobile
 */
function ehMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
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
        
        // Recriar gráficos se necessário
        setTimeout(() => {
            if (calculoAtual) {
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
    
    // Forçar font-size de 16px para evitar zoom no iOS
    document.querySelectorAll('input, select, textarea').forEach(input => {
        input.style.fontSize = '16px';
    });
    
    // Adicionar autocomplete
    document.getElementById('consumoMensal').setAttribute('inputmode', 'decimal');
    document.getElementById('tarifaEnergia').setAttribute('inputmode', 'decimal');
    document.getElementById('areaDisponivel').setAttribute('inputmode', 'decimal');
    document.getElementById('custoPainel').setAttribute('inputmode', 'decimal');
    document.getElementById('anos').setAttribute('inputmode', 'numeric');
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
                    img.src = img.dataset.src;
                    img.classList.remove('lazy');
                    imageObserver.unobserve(img);
                }
            });
        });
        
        document.querySelectorAll('img.lazy').forEach(img => imageObserver.observe(img));
    }
}

/**
 * Debounce para redimensionamento de tela
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
 * Handle responsivo de gráficos
 */
const handleResizeChart = debounce(() => {
    if (calculoAtual && window.innerWidth <= 768) {
        atualizarGraficos();
    }
}, 500);

// ==========================================
// NOTIFICAÇÕES MOBILE
// ==========================================

/**
 * Mostrar notificação toast
 */
function mostrarToast(mensagem, tipo = 'info', duracao = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${tipo}`;
    toast.textContent = mensagem;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 10px;
        right: 10px;
        padding: 15px;
        border-radius: 8px;
        background: ${tipo === 'success' ? '#10b981' : tipo === 'error' ? '#ef4444' : '#0ea5e9'};
        color: white;
        z-index: 9999;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        animation: slideUp 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideDown 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, duracao);
}

// ==========================================
// STORAGE OTIMIZADO
// ==========================================

/**
 * Verificar espaço de storage disponível
 */
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

/**
 * Limpar storage antigo (manter apenas últimos 10 cálculos)
 */
function limparStorageAntigo() {
    try {
        const historico = JSON.parse(localStorage.getItem('historico_calculos')) || [];
        
        if (historico.length > 10) {
            const historicoLimitado = historico.slice(0, 10);
            localStorage.setItem('historico_calculos', JSON.stringify(historicoLimitado));
        }
    } catch (e) {
        console.error('Erro ao limpar storage:', e);
    }
}

// ==========================================
// INICIALIZAÇÃO MOBILE
// ==========================================

/**
 * Inicializa todas as funcionalidades mobile
 */
function inicializarMobile() {
    if (ehMobile()) {
        // Menu mobile
        inicializarMenuMobile();
        
        // Otimizações de input
        otimizarInputsMobile();
        
        // Orientação
        detectarOrientacao();
        lidarMudancaOrientacao();
        
        // Lazy loading
        inicializarLazyLoading();
        
        // Resize handler
        window.addEventListener('resize', handleResizeChart);
        
        // Storage
        limparStorageAntigo();
        
        // Notificação se storage não disponível
        if (!verificarStorageDisponivel()) {
            console.warn('LocalStorage não disponível no dispositivo');
        }
    }
}

// ==========================================
// ADICIONAIS AO SCRIPT.JS
// ======================================== 

// Chamar inicialização mobile quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    inicializarMobile();
});

// Atualizar notificações ao salvar (mobile)
(function() {
    const salvarCalculoOriginal = window.salvarCalculo;
    
    window.salvarCalculo = function() {
        if (!calculoAtual) {
            mostrarToast('Faça um cálculo primeiro!', 'error');
            return;
        }
        
        const id = Date.now();
        const calculo = {
            id,
            ...calculoAtual
        };
        
        historico.unshift(calculo);
        localStorage.setItem('historico_calculos', JSON.stringify(historico));
        
        mostrarToast('✓ Cálculo salvo com sucesso!', 'success');
        exibirHistorico();
    };
})();

// ==========================================
// ANIMAÇÕES CSS
// ======================================== 

const style = document.createElement('style');
style.textContent = `
    @keyframes slideUp {
        from {
            transform: translateY(100px);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }
    
    @keyframes slideDown {
        from {
            transform: translateY(0);
            opacity: 1;
        }
        to {
            transform: translateY(100px);
            opacity: 0;
        }
    }
    
    @keyframes fadeIn {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }
    
    .nav-links.active {
        animation: fadeIn 0.3s ease;
    }
`;
document.head.appendChild(style);
