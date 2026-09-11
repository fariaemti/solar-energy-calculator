/* ========================================
   CALCULADORA DO EMTI - JavaScript
   Cálculos de economia energética e gerenciamento de dados
   ======================================== */

// ==========================================
// CONSTANTES E CONFIGURAÇÕES
// ==========================================

const CONSTANTES = {
    POTENCIA_PAINEL: 0.4,       // Potência média em kW
    EFICIENCIA_SISTEMA: 0.85,  // Eficiência global (inversor, cabos)
    HORAS_PICO_SOLAR: 5,       // Horas de pico solar por dia
    DEGRADACAO_ANUAL: 0.5,     // Degradação dos painéis por ano (%)
    CO2_POR_KWH: 0.475,        // Emissão de CO2 por kWh (kg)
    MANUTENCAO_ANUAL: 0.005    // Manutenção (% do investimento inicial)
};

const IRRADIACAO_SOLAR = {
    norte: 4.5,
    nordeste: 5.2,
    'centro-oeste': 5.5,
    sudeste: 4.8,
    sul: 4.3
};

// Configuração da rota base para o backend
const API_URL = 'process.php';

// ==========================================
// VARIÁVEIS GLOBAIS
// ==========================================

let calculoAtual = null;
let chartCustos = null;
let chartAcumulado = null;
let chartConsumo = null;
let chartMensal = null;

// ==========================================
// INICIALIZAÇÃO
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    inicializarEventos();
    aplicarTemaSalvo();
    inicializarMobile();
});

// ==========================================
// EVENTOS
// ==========================================

function inicializarEventos() {
    const form = document.getElementById('calculadorForm');
    if (form) {
        form.addEventListener('submit', handleCalcular);
        form.addEventListener('reset', handleLimpar);
    }
    
    const themeBtn = document.getElementById('themeBtn');
    if (themeBtn) {
        themeBtn.addEventListener('click', toggleTema);
    }
    
    document.getElementById('exportPDFBtn')?.addEventListener('click', exportarPDF);
    document.getElementById('compartilharBtn')?.addEventListener('click', compartilhar);
    
    document.getElementById('consumoMensal')?.addEventListener('input', atualizarPreview);
    document.getElementById('tarifaEnergia')?.addEventListener('input', atualizarPreview);
}

// ==========================================
// CÁLCULOS PRINCIPAIS
// ==========================================

function calcularEconomiaSolar(dados) {
    const consumoAnual = dados.consumoMensal * 12;
    const custoAnualConvencional = consumoAnual * dados.tarifaEnergia;
    const irradiacao = IRRADIACAO_SOLAR[dados.regiao] || 5.0;
    
    const consumoDiario = dados.consumoMensal / 30;
    const potenciaNecessaria = consumoDiario / (irradiacao * CONSTANTES.EFICIENCIA_SISTEMA);
    const numPaineis = Math.ceil(potenciaNecessaria / CONSTANTES.POTENCIA_PAINEL);
    const investimentoInicial = numPaineis * dados.custoPainel;
    
    const producaoSolarAnual = numPaineis * CONSTANTES.POTENCIA_PAINEL * 
                               CONSTANTES.HORAS_PICO_SOLAR * 365 * 
                               CONSTANTES.EFICIENCIA_SISTEMA;
    
    const economiaAnual = Math.min(consumoAnual, producaoSolarAnual) * dados.tarifaEnergia;
    const paybackTime = investimentoInicial / economiaAnual;
    const roiAnual = (economiaAnual / investimentoInicial) * 100;
    const co2EvitadoAnual = (producaoSolarAnual * CONSTANTES.CO2_POR_KWH) / 1000;
    
    const simulacaoAnual = gerarSimulacaoAnual(
        consumoAnual,
        investimentoInicial,
        dados.anos,
        producaoSolarAnual,
        dados.tarifaEnergia
    );
    
    const economiaTotal = simulacaoAnual[simulacaoAnual.length - 1].economiaAcumulada;
    
    return {
        ...dados,
        consumoAnual,
        irradiacao,
        potenciaNecessaria: parseFloat(potenciaNecessaria.toFixed(2)),
        numPaineis,
        investimentoInicial,
        producaoSolarAnual: parseFloat(producaoSolarAnual.toFixed(2)),
        custoAnualConvencional: parseFloat(custoAnualConvencional.toFixed(2)),
        economiaAnual: parseFloat(economiaAnual.toFixed(2)),
        paybackTime: parseFloat(paybackTime.toFixed(2)),
        roiAnual: parseFloat(roiAnual.toFixed(2)),
        co2EvitadoAnual: parseFloat(co2EvitadoAnual.toFixed(2)),
        economiaTotal: parseFloat(economiaTotal.toFixed(2)),
        simulacaoAnual,
        timestamp: new Date().toLocaleString('pt-BR')
    };
}

function gerarSimulacaoAnual(consumoAnual, investimento, anos, producaoSolar, tarifaEnergia) {
    const simulacao = [];
    let economiaAcumulada = -investimento;
    
    for (let ano = 1; ano <= anos; ano++) {
        const degradacao = 1 - (CONSTANTES.DEGRADACAO_ANUAL / 100) * (ano - 1);
        const producaoAnoAtual = producaoSolar * degradacao;
        const custoConvencionalAno = consumoAnual * tarifaEnergia;
        const economiaAnoAtual = Math.min(consumoAnual, producaoAnoAtual) * tarifaEnergia;
        const manutencao = investimento * CONSTANTES.MANUTENCAO_ANUAL;
        
        economiaAcumulada += economiaAnoAtual - manutencao;
        
        simulacao.push({
            ano,
            custoConvencional: parseFloat(custoConvencionalAno.toFixed(2)),
            producaoSolar: parseFloat(producaoAnoAtual.toFixed(2)),
            economiaAnual: parseFloat(economiaAnoAtual.toFixed(2)),
            manutencao: parseFloat(manutencao.toFixed(2)),
            economiaAcumulada: parseFloat(economiaAcumulada.toFixed(2)),
            lucroLiquido: parseFloat(economiaAcumulada.toFixed(2))
        });
    }
    
    return simulacao;
}

// ==========================================
// HANDLERS DE EVENTOS
// ==========================================

async function handleCalcular(e) {
    e.preventDefault();
    
    const dados = {
        consumoMensal: parseFloat(document.getElementById('consumoMensal').value),
        tarifaEnergia: parseFloat(document.getElementById('tarifaEnergia').value),
        numPessoas: document.getElementById('numPessoas').value,
        tipoResidencia: document.getElementById('tipoResidencia').value,
        areaDisponivel: parseFloat(document.getElementById('areaDisponivel').value),
        regiao: document.getElementById('regiao').value,
        custoPainel: parseFloat(document.getElementById('custoPainel').value),
        anos: parseInt(document.getElementById('anos').value)
    };
    
    if (!validarDados(dados)) return;
    
    try {
        const response = await fetch(`${API_URL}?rota=calcular`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });
        
        if (response.ok) {
            const result = await response.json();
            calculoAtual = result.data || result;
        } else {
            calculoAtual = calcularEconomiaSolar(dados);
        }
    } catch (err) {
        calculoAtual = calcularEconomiaSolar(dados);
    }

    exibirResultados();
    
    setTimeout(() => {
        const resultadosSection = document.getElementById('resultados');
        if (resultadosSection) {
            resultadosSection.scrollIntoView({ behavior: 'smooth' });
        }
    }, 300);
}

function handleLimpar() {
    const resultadosSection = document.getElementById('resultados');
    if (resultadosSection) {
        resultadosSection.style.display = 'none';
    }
    calculoAtual = null;
    
    const elConsumo = document.getElementById('consumoAnualDisplay');
    const elCusto = document.getElementById('custoAnualDisplay');
    const elPaineis = document.getElementById('numPaineisDisplay');
    const elEconomia = document.getElementById('economiaAnualDisplay');

    if (elConsumo) elConsumo.textContent = '-';
    if (elCusto) elCusto.textContent = '-';
    if (elPaineis) elPaineis.textContent = '-';
    if (elEconomia) elEconomia.textContent = '-';
}

function atualizarPreview() {
    const consumo = parseFloat(document.getElementById('consumoMensal').value) || 0;
    const tarifa = parseFloat(document.getElementById('tarifaEnergia').value) || 0;
    
    if (consumo > 0 && tarifa > 0) {
        const consumoAnual = consumo * 12;
        const custoAnual = consumoAnual * tarifa;
        
        document.getElementById('consumoAnualDisplay').textContent = formatarNumero(consumoAnual);
        document.getElementById('custoAnualDisplay').textContent = formatarMoeda(custoAnual);
    }
}

// ==========================================
// EXIBIÇÃO DE RESULTADOS
// ==========================================

function exibirResultados() {
    if (!calculoAtual) return;
    
    const calc = calculoAtual;
    
    document.getElementById('consumoAnualDisplay').textContent = formatarNumero(calc.consumoAnual);
    document.getElementById('custoAnualDisplay').textContent = formatarMoeda(calc.custoAnualConvencional);
    document.getElementById('numPaineisDisplay').textContent = calc.numPaineis;
    document.getElementById('economiaAnualDisplay').textContent = formatarMoeda(calc.economiaAnual);
    
    document.getElementById('investimentoInicial').textContent = formatarMoeda(calc.investimentoInicial);
    document.getElementById('economia1Ano').textContent = formatarMoeda(calc.economiaAnual);
    document.getElementById('roiAnual').textContent = Number(calc.roiAnual).toFixed(2) + '%';
    document.getElementById('paybackTime').textContent = Number(calc.paybackTime).toFixed(1) + ' anos';
    document.getElementById('economiaTotal').textContent = formatarMoeda(calc.economiaTotal);
    document.getElementById('co2Evitado').textContent = Number(calc.co2EvitadoAnual).toFixed(2) + ' ton';
    
    preencherTabelaSimulacao(calc.simulacaoAnual, calc.paybackTime);
    
    setTimeout(() => {
        atualizarGraficos();
    }, 100);
    
    const resultadosSection = document.getElementById('resultados');
    if (resultadosSection) {
        resultadosSection.style.display = 'block';
    }
}

function preencherTabelaSimulacao(simulacao, paybackTime) {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    const anoPayback = Math.ceil(paybackTime || 5);
    const anosTotal = simulacao.length;
    
    // Filtramos apenas os marcos temporais estratégicos
    const anosMarcos = [1, anoPayback, 10, 15, 20, anosTotal];
    const anosExibir = [...new Set(anosMarcos)].filter(a => a <= anosTotal).sort((a, b) => a - b);
    
    anosExibir.forEach(anoNum => {
        const dadosAno = simulacao.find(item => item.ano === anoNum);
        if (!dadosAno) return;

        let statusText = 'Amortização';
        let statusClass = 'negative';

        if (anoNum === anoPayback) {
            statusText = 'Payback Atingido 🎯';
            statusClass = 'positive';
        } else if (anoNum > anoPayback) {
            statusText = 'Lucro Líquido 💚';
            statusClass = 'positive';
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>Ano ${dadosAno.ano}</strong></td>
            <td>${formatarMoeda(dadosAno.custoConvencional)}</td>
            <td>${formatarNumero(dadosAno.producaoSolar)} kWh</td>
            <td class="highlight">${formatarMoeda(dadosAno.economiaAnual)}</td>
            <td class="${dadosAno.economiaAcumulada >= 0 ? 'highlight positive' : 'negative'}">
                <strong>${formatarMoeda(dadosAno.economiaAcumulada)}</strong>
            </td>
            <td class="${statusClass}">${statusText}</td>
        `;
        tbody.appendChild(tr);
    });
}

// ==========================================
// GRÁFICOS
// ==========================================

function atualizarGraficos() {
    if (!calculoAtual) return;
    
    const calc = calculoAtual;
    
    if (chartCustos) chartCustos.destroy();
    if (chartAcumulado) chartAcumulado.destroy();
    if (chartConsumo) chartConsumo.destroy();
    if (chartMensal) chartMensal.destroy();
    
    criarGraficoCustos(calc);
    criarGraficoAcumulado(calc);
    criarGraficoConsumo(calc);
    criarGraficoMensal(calc);
}

function criarGraficoCustos(calc) {
    const ctx = document.getElementById('chartCustos')?.getContext('2d');
    if (!ctx) return;
    
    const anos = calc.simulacaoAnual.slice(0, 10).map(s => `Ano ${s.ano}`);
    const custosConvencional = calc.simulacaoAnual.slice(0, 10).map(s => s.custoConvencional);
    const economia = calc.simulacaoAnual.slice(0, 10).map(s => s.economiaAnual);
    
    chartCustos = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: anos,
            datasets: [
                { label: 'Custo Convencional', data: custosConvencional, backgroundColor: '#ef4444', borderRadius: 6 },
                { label: 'Economia com Solar', data: economia, backgroundColor: '#10b981', borderRadius: 6 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: true, position: 'top' } },
            scales: { y: { beginAtZero: true, ticks: { callback: value => 'R$ ' + formatarNumero(value) } } }
        }
    });
}

function criarGraficoAcumulado(calc) {
    const ctx = document.getElementById('chartAcumulado')?.getContext('2d');
    if (!ctx) return;
    
    const anos = calc.simulacaoAnual.map(s => `Ano ${s.ano}`);
    const acumulado = calc.simulacaoAnual.map(s => s.economiaAcumulada);
    const paybackIndex = acumulado.findIndex(v => v >= 0);
    
    chartAcumulado = new Chart(ctx, {
        type: 'line',
        data: {
            labels: anos,
            datasets: [{
                label: 'Economia Acumulada',
                data: acumulado,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: acumulado.map((v, i) => i === paybackIndex ? '#fbbf24' : '#10b981'),
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: true, position: 'top' } },
            scales: { y: { ticks: { callback: value => 'R$ ' + formatarNumero(value) }, beginAtZero: true } }
        }
    });
}

function criarGraficoConsumo(calc) {
    const ctx = document.getElementById('chartConsumo')?.getContext('2d');
    if (!ctx) return;
    
    chartConsumo = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Produção Solar', 'Déficit/Compra de Energia'],
            datasets: [{
                data: [calc.producaoSolarAnual, Math.max(0, calc.consumoAnual - calc.producaoSolarAnual)],
                backgroundColor: ['#10b981', '#fbbf24'],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: true, position: 'bottom' } }
        }
    });
}

function criarGraficoMensal(calc) {
    const ctx = document.getElementById('chartMensal')?.getContext('2d');
    if (!ctx) return;
    
    const consumoMensal = calc.consumoAnual / 12;
    const producaoMensal = calc.producaoSolarAnual / 12;
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    chartMensal = new Chart(ctx, {
        type: 'line',
        data: {
            labels: meses,
            datasets: [
                { label: 'Consumo Mensal', data: Array(12).fill(consumoMensal), borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderWidth: 2, tension: 0.4 },
                { label: 'Produção Solar', data: Array(12).fill(producaoMensal), borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderWidth: 2, tension: 0.4 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: true, position: 'top' } },
            scales: { y: { ticks: { callback: value => formatarNumero(value) + ' kWh' }, beginAtZero: true } }
        }
    });
}

// ==========================================
// TEMA ESCURO/CLARO
// ==========================================

function toggleTema() {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    
    const themeBtn = document.getElementById('themeBtn');
    if (themeBtn) {
        const icon = themeBtn.querySelector('.material-symbols-outlined');
        if (icon) {
            icon.textContent = isDark ? 'light_mode' : 'dark_mode';
        }
    }
    
    if (calculoAtual) {
        setTimeout(() => {
            atualizarGraficos();
        }, 100);
    }
}

function aplicarTemaSalvo() {
    const tema = localStorage.getItem('theme') || 'light';
    const themeBtn = document.getElementById('themeBtn');
    const icon = themeBtn ? themeBtn.querySelector('.material-symbols-outlined') : null;
    
    if (tema === 'dark') {
        document.body.classList.add('dark-mode');
        if (icon) icon.textContent = 'light_mode';
    } else {
        document.body.classList.remove('dark-mode');
        if (icon) icon.textContent = 'dark_mode';
    }
}

// ==========================================
// EXPORTAÇÃO E COMPARTILHAMENTO
// ==========================================

function exportarPDF() {
    if (!calculoAtual) {
        mostrarNotificacao('Faça um cálculo primeiro!', 'error');
        return;
    }
    
    const calc = calculoAtual;
    const anoPayback = Math.ceil(calc.paybackTime || 5);
    const anosTotal = calc.simulacaoAnual.length;
    const anosMarcos = [...new Set([1, anoPayback, 10, 15, 20, anosTotal])].filter(a => a <= anosTotal).sort((a, b) => a - b);
    
    let marcosTexto = '';
    anosMarcos.forEach(a => {
        const d = calc.simulacaoAnual.find(item => item.ano === a);
        if (d) {
            marcosTexto += `- Ano ${d.ano}: Produção ${formatarNumero(d.producaoSolar)} kWh | Economia Acumulada: R$ ${formatarNumero(d.economiaAcumulada)}\n`;
        }
    });

    let conteudo = `=========================================
RELATÓRIO DE SIMULAÇÃO DE ECONOMIA SOLAR
Projeto do 3º EMTI — Feira de 2026
=========================================

DATA: ${calc.timestamp || new Date().toLocaleString('pt-BR')}

DADOS DE ENTRADA:
- Consumo Mensal: ${calc.consumoMensal} kWh
- Tarifa de Energia: R$ ${calc.tarifaEnergia}/kWh
- Região: ${calc.regiao}
- Área Disponível: ${calc.areaDisponivel} m²

RESULTADOS DO CÁLCULO:
- Potência Necessária: ${calc.potenciaNecessaria} kW
- Número de Painéis: ${calc.numPaineis}
- Investimento Inicial: R$ ${formatarNumero(calc.investimentoInicial)}
- Produção Solar Anual: ${formatarNumero(calc.producaoSolarAnual)} kWh
- Economia Anual: R$ ${formatarNumero(calc.economiaAnual)}
- Tempo de Payback: ${calc.paybackTime} anos
- ROI Anual: ${calc.roiAnual}%
- Economia Total (${calc.anos} anos): R$ ${formatarNumero(calc.economiaTotal)}
- CO₂ Evitado por Ano: ${calc.co2EvitadoAnual} ton

MARCOS TEMPORAIS DE RETORNO:
${marcosTexto}`;
    
    const blob = new Blob([conteudo], { type: 'text/plain;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-solar-${Date.now()}.txt`;
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    mostrarNotificacao('Relatório exportado!', 'success');
}

function compartilhar() {
    if (!calculoAtual) {
        mostrarNotificacao('Faça um cálculo primeiro!', 'error');
        return;
    }
    
    const calc = calculoAtual;
    const texto = `Simulei minha economia com energia solar! 🌞\n\n- ${calc.numPaineis} painéis solares\n- R$ ${formatarNumero(calc.investimentoInicial)} de investimento\n- R$ ${formatarNumero(calc.economiaAnual)}/ano de economia\n- Payback em ${calc.paybackTime} anos\n\nCalcule a sua em: ${window.location.href}`;
    
    if (navigator.share) {
        navigator.share({
            title: 'Calculadora do EMTI - Economia Solar',
            text: texto,
            url: window.location.href
        });
    } else {
        navigator.clipboard.writeText(texto);
        mostrarNotificacao('Texto copiado para a área de transferência!', 'success');
    }
}

// ==========================================
// NOTIFICAÇÕES E VALIDAÇÕES
// ==========================================

function mostrarNotificacao(mensagem, tipo = 'info') {
    if (tipo === 'error') {
        console.error(mensagem);
    }
    alert(mensagem);
}

function validarDados(dados) {
    const erros = [];
    
    if (dados.consumoMensal < 50 || dados.consumoMensal > 5000) erros.push('Consumo mensal deve estar entre 50 e 5000 kWh');
    if (dados.tarifaEnergia < 0.10 || dados.tarifaEnergia > 2.00) erros.push('Tarifa deve estar entre R$ 0.10 e R$ 2.00');
    if (!dados.numPessoas) erros.push('Selecione o número de pessoas');
    if (!dados.tipoResidencia) erros.push('Selecione o tipo de residência');
    if (dados.areaDisponivel < 5 || dados.areaDisponivel > 500) erros.push('Área disponível deve estar entre 5 e 500 m²');
    if (!dados.regiao) erros.push('Selecione a região');
    
    if (erros.length > 0) {
        mostrarNotificacao('Erros encontrados:\n\n' + erros.join('\n'), 'error');
        return false;
    }
    
    return true;
}

function formatarNumero(num) {
    return parseFloat(num || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatarMoeda(valor) {
    return parseFloat(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ==========================================
// COMPATIBILIDADE MOBILE
// ==========================================

function inicializarMobile() {
    if (ehMobile()) {
        document.body.classList.add('mobile');
        otimizarInputsMobile();
    }
}

function ehMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function otimizarInputsMobile() {
    document.querySelectorAll('input, select, textarea').forEach(input => {
        input.style.fontSize = '16px';
    });
    
    document.getElementById('consumoMensal')?.setAttribute('inputmode', 'decimal');
    document.getElementById('tarifaEnergia')?.setAttribute('inputmode', 'decimal');
    document.getElementById('areaDisponivel')?.setAttribute('inputmode', 'decimal');
    document.getElementById('custoPainel')?.setAttribute('inputmode', 'decimal');
    document.getElementById('anos')?.setAttribute('inputmode', 'numeric');
}
