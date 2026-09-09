/* ========================================
   SOLAR ENERGY CALCULATOR - JavaScript
   Cálculos de economia energética e gerenciamento de dados
   ======================================== */

// ==========================================
// CONSTANTES E CONFIGURAÇÕES
// ==========================================

// Constantes de cálculo
const CONSTANTES = {
    // Potência média de um painel solar em kW
    POTENCIA_PAINEL: 0.4,
    
    // Eficiência do sistema (inversor, cabos, etc)
    EFICIENCIA_SISTEMA: 0.85,
    
    // Horas de pico solar por dia (média anual Brasil)
    HORAS_PICO_SOLAR: 5,
    
    // Fator de degradação dos painéis por ano (%)
    DEGRADACAO_ANUAL: 0.5,
    
    // Emissão de CO2 por kWh de energia convencional (kg)
    CO2_POR_KWH: 0.475,
    
    // Manutenção anual (% do investimento inicial)
    MANUTENCAO_ANUAL: 0.005
};

// Dados de irradiação solar por região
const IRRADIACAO_SOLAR = {
    norte: 4.5,
    nordeste: 5.2,
    'centro-oeste': 5.5,
    sudeste: 4.8,
    sul: 4.3
};

// ==========================================
// VARIÁVEIS GLOBAIS
// ==========================================

let calculoAtual = null;
let chartCustos = null;
let chartAcumulado = null;
let chartConsumo = null;
let chartMensal = null;
let historico = [];

// ==========================================
// INICIALIZAÇÃO
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    inicializarEventos();
    carregarHistorico();
    aplicarTemaSalvo();
});

// ==========================================
// EVENTOS
// ==========================================

function inicializarEventos() {
    // Formulário de cálculo
    const form = document.getElementById('calculadorForm');
    form.addEventListener('submit', handleCalcular);
    form.addEventListener('reset', handleLimpar);
    
    // Tema escuro/claro
    const themeBtn = document.getElementById('themeBtn');
    themeBtn.addEventListener('click', toggleTema);
    
    // Botões de ação
    document.getElementById('exportPDFBtn')?.addEventListener('click', exportarPDF);
    document.getElementById('salvarCalculoBtn')?.addEventListener('click', salvarCalculo);
    document.getElementById('compartilharBtn')?.addEventListener('click', compartilhar);
    
    // Validação em tempo real
    document.getElementById('consumoMensal').addEventListener('input', atualizarPreview);
    document.getElementById('tarifaEnergia').addEventListener('input', atualizarPreview);
}

// ==========================================
// CÁLCULOS PRINCIPAIS
// ==========================================

/**
 * Realiza o cálculo completo de economia solar
 */
function calcularEconomiaSolar(dados) {
    // Consumo anual
    const consumoAnual = dados.consumoMensal * 12;
    
    // Custo anual com energia convencional
    const custoAnualConvencional = consumoAnual * dados.tarifaEnergia;
    
    // Obter irradiação solar da região
    const irradiacao = IRRADIACAO_SOLAR[dados.regiao] || 5.0;
    
    // Cálculo da potência necessária de painéis
    // Fórmula: Consumo (kWh/dia) / (Irradiação * Eficiência)
    const consumoDiario = dados.consumoMensal / 30;
    const potenciaNecessaria = consumoDiario / (irradiacao * CONSTANTES.EFICIENCIA_SISTEMA);
    
    // Número de painéis necessários
    const numPaineis = Math.ceil(potenciaNecessaria / CONSTANTES.POTENCIA_PAINEL);
    
    // Investimento inicial
    const investimentoInicial = numPaineis * dados.custoPainel;
    
    // Produção solar anual (kWh)
    const producaoSolarAnual = numPaineis * CONSTANTES.POTENCIA_PAINEL * 
                               CONSTANTES.HORAS_PICO_SOLAR * 365 * 
                               CONSTANTES.EFICIENCIA_SISTEMA;
    
    // Economia anual (assumindo que gera 100% do consumo)
    const economiaAnual = Math.min(consumoAnual, producaoSolarAnual) * dados.tarifaEnergia;
    
    // Tempo de payback (em anos)
    const paybackTime = investimentoInicial / economiaAnual;
    
    // ROI anual (%)
    const roiAnual = (economiaAnual / investimentoInicial) * 100;
    
    // CO2 evitado por ano (ton)
    const co2EvitadoAnual = (producaoSolarAnual * CONSTANTES.CO2_POR_KWH) / 1000;
    
    // Simulação anual
    const simulacaoAnual = gerarSimulacaoAnual(
        consumoAnual,
        economiaAnual,
        investimentoInicial,
        dados.anos,
        producaoSolarAnual,
        numPaineis,
        dados.custoPainel
    );
    
    // Economia total no período
    const economiaTotal = simulacaoAnual[simulacaoAnual.length - 1].economiaAcumulada;
    
    return {
        // Entrada
        consumoMensal: dados.consumoMensal,
        consumoAnual,
        tarifaEnergia: dados.tarifaEnergia,
        regiao: dados.regiao,
        irradiacao,
        areaDisponivel: dados.areaDisponivel,
        
        // Cálculos
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
        
        // Simulação
        simulacaoAnual,
        timestamp: new Date().toLocaleString('pt-BR')
    };
}

/**
 * Gera simulação anual de custos e economia
 */
function gerarSimulacaoAnual(consumoAnual, economiaAnual, investimento, anos, producaoSolar, numPaineis, custoPainel) {
    const simulacao = [];
    let economiaAcumulada = -investimento;
    
    for (let ano = 1; ano <= anos; ano++) {
        // Degradação dos painéis
        const degradacao = 1 - (CONSTANTES.DEGRADACAO_ANUAL / 100) * (ano - 1);
        const producaoAnoAtual = producaoSolar * degradacao;
        
        // Custos e economia
        const custoConvencionalAno = consumoAnual * 0.85; // Tarifa aumenta ~1.5% ao ano (simplificado)
        const economiaAnoAtual = Math.min(consumoAnual, producaoAnoAtual) * 0.85;
        const manutencao = investimento * CONSTANTES.MANUTENCAO_ANUAL;
        
        // Economia acumulada
        economiaAcumulada += economiaAnoAtual - manutencao;
        
        simulacao.push({
            ano,
            custoConvencional: parseFloat(custoConvencionalAno.toFixed(2)),
            producaoSolar: parseFloat(producaoAnoAtual.toFixed(2)),
            economiaAnual: parseFloat(economiaAnoAtual.toFixed(2)),
            manutencao: parseFloat(manutencao.toFixed(2)),
            economiaAcumulada: parseFloat(economiaAcumulada.toFixed(2)),
            lucroLiquido: parseFloat((economiaAcumulada).toFixed(2))
        });
    }
    
    return simulacao;
}

// ==========================================
// HANDLERS DE EVENTOS
// ==========================================

/**
 * Handler do submit do formulário
 */
function handleCalcular(e) {
    e.preventDefault();
    
    // Coletar dados do formulário
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
    
    // Validar dados
    if (!validarDados(dados)) {
        return;
    }
    
    // Calcular
    calculoAtual = calcularEconomiaSolar(dados);
    
    // Exibir resultados
    exibirResultados();
    
    // Scroll para resultados
    setTimeout(() => {
        document.getElementById('resultados').scrollIntoView({ behavior: 'smooth' });
    }, 100);
}

/**
 * Handler do reset do formulário
 */
function handleLimpar() {
    // Limpar exibição de resultados
    document.getElementById('resultados').style.display = 'none';
    calculoAtual = null;
    
    // Limpar cards de resultados rápidos
    document.getElementById('consumoAnualDisplay').textContent = '-';
    document.getElementById('custoAnualDisplay').textContent = '-';
    document.getElementById('numPaineisDisplay').textContent = '-';
    document.getElementById('economiaAnualDisplay').textContent = '-';
}

/**
 * Atualiza preview dos resultados enquanto digita
 */
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

/**
 * Exibe os resultados do cálculo
 */
function exibirResultados() {
    const calc = calculoAtual;
    
    // Atualizar cards de resultados rápidos
    document.getElementById('consumoAnualDisplay').textContent = formatarNumero(calc.consumoAnual);
    document.getElementById('custoAnualDisplay').textContent = formatarMoeda(calc.custoAnualConvencional);
    document.getElementById('numPaineisDisplay').textContent = calc.numPaineis;
    document.getElementById('economiaAnualDisplay').textContent = formatarMoeda(calc.economiaAnual);
    
    // Atualizar dashboard de métricas
    document.getElementById('investimentoInicial').textContent = formatarMoeda(calc.investimentoInicial);
    document.getElementById('economia1Ano').textContent = formatarMoeda(calc.economiaAnual);
    document.getElementById('roiAnual').textContent = calc.roiAnual.toFixed(2) + '%';
    document.getElementById('paybackTime').textContent = calc.paybackTime.toFixed(1) + ' anos';
    document.getElementById('economiaTotal').textContent = formatarMoeda(calc.economiaTotal);
    document.getElementById('co2Evitado').textContent = calc.co2EvitadoAnual.toFixed(2) + ' ton';
    
    // Atualizar tabela de simulação
    preencherTabelaSimulacao(calc.simulacaoAnual);
    
    // Atualizar gráficos
    atualizarGraficos();
    
    // Mostrar seção de resultados
    document.getElementById('resultados').style.display = 'block';
}

/**
 * Preenche a tabela de simulação anual
 */
function preencherTabelaSimulacao(simulacao) {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';
    
    simulacao.forEach(ano => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>Ano ${ano.ano}</strong></td>
            <td>${formatarMoeda(ano.custoConvencional)}</td>
            <td>${formatarNumero(ano.producaoSolar)} kWh</td>
            <td class="highlight">${formatarMoeda(ano.economiaAnual)}</td>
            <td class="highlight"><strong>${formatarMoeda(ano.economiaAcumulada)}</strong></td>
            <td class="${ano.lucroLiquido > 0 ? 'positive' : 'negative'}">
                ${formatarMoeda(ano.lucroLiquido)}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// ==========================================
// GRÁFICOS
// ==========================================

/**
 * Atualiza todos os gráficos
 */
function atualizarGraficos() {
    const calc = calculoAtual;
    
    // Gráfico de custos anuais (Convencional vs Solar)
    criarGraficoCustos(calc);
    
    // Gráfico de acumulado ao longo dos anos
    criarGraficoAcumulado(calc);
    
    // Gráfico de consumo vs produção
    criarGraficoConsumo(calc);
    
    // Gráfico mensal do primeiro ano
    criarGraficoMensal(calc);
}

/**
 * Cria gráfico de comparativo de custos anuais
 */
function criarGraficoCustos(calc) {
    const ctx = document.getElementById('chartCustos')?.getContext('2d');
    if (!ctx) return;
    
    if (chartCustos) chartCustos.destroy();
    
    const anos = calc.simulacaoAnual.slice(0, 10).map(s => `Ano ${s.ano}`);
    const custosConvencional = calc.simulacaoAnual.slice(0, 10).map(s => s.custoConvencional);
    const economia = calc.simulacaoAnual.slice(0, 10).map(s => s.economiaAnual);
    
    chartCustos = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: anos,
            datasets: [
                {
                    label: 'Custo Convencional',
                    data: custosConvencional,
                    backgroundColor: '#ef4444',
                    borderRadius: 6
                },
                {
                    label: 'Economia com Solar',
                    data: economia,
                    backgroundColor: '#10b981',
                    borderRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: true, position: 'top' }
            },
            scales: {
                y: { beginAtZero: true, ticks: { callback: value => 'R$ ' + formatarNumero(value) } }
            }
        }
    });
}

/**
 * Cria gráfico de acumulado ao longo dos anos
 */
function criarGraficoAcumulado(calc) {
    const ctx = document.getElementById('chartAcumulado')?.getContext('2d');
    if (!ctx) return;
    
    if (chartAcumulado) chartAcumulado.destroy();
    
    const anos = calc.simulacaoAnual.map(s => `Ano ${s.ano}`);
    const acumulado = calc.simulacaoAnual.map(s => s.economiaAcumulada);
    
    // Encontrar ponto de payback
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
                pointBackgroundColor: acumulado.map((v, i) => 
                    i === paybackIndex ? '#fbbf24' : '#10b981'
                ),
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: true, position: 'top' }
            },
            scales: {
                y: {
                    ticks: { callback: value => 'R$ ' + formatarNumero(value) },
                    beginAtZero: true
                }
            }
        }
    });
}

/**
 * Cria gráfico de consumo vs produção solar
 */
function criarGraficoConsumo(calc) {
    const ctx = document.getElementById('chartConsumo')?.getContext('2d');
    if (!ctx) return;
    
    if (chartConsumo) chartConsumo.destroy();
    
    chartConsumo = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Produção Solar', 'Déficit/Compra de Energia'],
            datasets: [{
                data: [
                    calc.producaoSolarAnual,
                    Math.max(0, calc.consumoAnual - calc.producaoSolarAnual)
                ],
                backgroundColor: ['#10b981', '#fbbf24'],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: true, position: 'bottom' }
            }
        }
    });
}

/**
 * Cria gráfico mensal do primeiro ano
 */
function criarGraficoMensal(calc) {
    const ctx = document.getElementById('chartMensal')?.getContext('2d');
    if (!ctx) return;
    
    if (chartMensal) chartMensal.destroy();
    
    const consumoMensal = calc.consumoAnual / 12;
    const producaoMensal = calc.producaoSolarAnual / 12;
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    chartMensal = new Chart(ctx, {
        type: 'line',
        data: {
            labels: meses,
            datasets: [
                {
                    label: 'Consumo Mensal',
                    data: Array(12).fill(consumoMensal),
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderWidth: 2,
                    tension: 0.4
                },
                {
                    label: 'Produção Solar',
                    data: Array(12).fill(producaoMensal),
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 2,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: true, position: 'top' }
            },
            scales: {
                y: {
                    ticks: { callback: value => formatarNumero(value) + ' kWh' },
                    beginAtZero: true
                }
            }
        }
    });
}

// ==========================================
// ARMAZENAMENTO E HISTÓRICO
// ==========================================

/**
 * Salva o cálculo atual no histórico
 */
function salvarCalculo() {
    if (!calculoAtual) {
        alert('Faça um cálculo primeiro!');
        return;
    }
    
    const id = Date.now();
    const calculo = {
        id,
        ...calculoAtual
    };
    
    historico.unshift(calculo);
    localStorage.setItem('historico_calculos', JSON.stringify(historico));
    
    alert('Cálculo salvo com sucesso!');
    exibirHistorico();
}

/**
 * Carrega o histórico do localStorage
 */
function carregarHistorico() {
    const dados = localStorage.getItem('historico_calculos');
    historico = dados ? JSON.parse(dados) : [];
    exibirHistorico();
}

/**
 * Exibe o histórico na página
 */
function exibirHistorico() {
    const container = document.getElementById('historicoContainer');
    
    if (historico.length === 0) {
        container.innerHTML = '<p class="text-center">Nenhum cálculo salvo ainda</p>';
        return;
    }
    
    container.innerHTML = historico.map(calc => `
        <div class="historico-item">
            <div class="historico-header">
                <h4>${calc.numPaineis} painéis</h4>
                <span class="historico-date">${calc.timestamp}</span>
            </div>
            <div class="historico-body">
                <div class="historico-row">
                    <span class="historico-label">Consumo Anual:</span>
                    <span class="historico-value">${formatarNumero(calc.consumoAnual)} kWh</span>
                </div>
                <div class="historico-row">
                    <span class="historico-label">Economia Anual:</span>
                    <span class="historico-value">${formatarMoeda(calc.economiaAnual)}</span>
                </div>
                <div class="historico-row">
                    <span class="historico-label">Payback:</span>
                    <span class="historico-value">${calc.paybackTime.toFixed(1)} anos</span>
                </div>
            </div>
            <div class="historico-actions">
                <button onclick="carregarCalculoDoHistorico(${calc.id})">Carregar</button>
                <button onclick="deletarCalculoDoHistorico(${calc.id})">Deletar</button>
            </div>
        </div>
    `).join('');
}

/**
 * Carrega um cálculo do histórico
 */
function carregarCalculoDoHistorico(id) {
    const calculo = historico.find(c => c.id === id);
    if (!calculo) return;
    
    // Preencher formulário
    document.getElementById('consumoMensal').value = calculo.consumoMensal;
    document.getElementById('tarifaEnergia').value = calculo.tarifaEnergia;
    document.getElementById('numPessoas').value = calculo.numPessoas;
    document.getElementById('tipoResidencia').value = calculo.tipoResidencia;
    document.getElementById('areaDisponivel').value = calculo.areaDisponivel;
    document.getElementById('regiao').value = calculo.regiao;
    document.getElementById('custoPainel').value = calculo.custoPainel;
    document.getElementById('anos').value = calculo.anos;
    
    calculoAtual = calculo;
    exibirResultados();
    
    // Scroll para o topo
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Deleta um cálculo do histórico
 */
function deletarCalculoDoHistorico(id) {
    if (confirm('Tem certeza que deseja deletar este cálculo?')) {
        historico = historico.filter(c => c.id !== id);
        localStorage.setItem('historico_calculos', JSON.stringify(historico));
        exibirHistorico();
    }
}

// ==========================================
// TEMA ESCURO/CLARO
// ==========================================

/**
 * Alterna entre tema claro e escuro
 */
function toggleTema() {
    const html = document.documentElement;
    const isDark = html.classList.toggle('dark-mode');
    
    localStorage.setItem('tema', isDark ? 'dark' : 'light');
    
    // Atualizar ícone do botão
    const icon = document.getElementById('themeBtn').querySelector('i');
    icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
    
    // Recriar gráficos com novo tema
    if (calculoAtual) {
        atualizarGraficos();
    }
}

/**
 * Aplica o tema salvo ao carregar a página
 */
function aplicarTemaSalvo() {
    const tema = localStorage.getItem('tema') || 'light';
    const html = document.documentElement;
    const icon = document.getElementById('themeBtn').querySelector('i');
    
    if (tema === 'dark') {
        html.classList.add('dark-mode');
        icon.className = 'fas fa-sun';
    } else {
        html.classList.remove('dark-mode');
        icon.className = 'fas fa-moon';
    }
}

// ==========================================
// EXPORTAÇÃO E COMPARTILHAMENTO
// ==========================================

/**
 * Exporta relatório em PDF
 */
function exportarPDF() {
    if (!calculoAtual) {
        alert('Faça um cálculo primeiro!');
        return;
    }
    
    const calc = calculoAtual;
    
    // Criar conteúdo do PDF
    let conteudo = `
RELATÓRIO DE SIMULAÇÃO DE ECONOMIA SOLAR
=========================================

DATA: ${calc.timestamp}

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
- Economia Total (25 anos): R$ ${formatarNumero(calc.economiaTotal)}
- CO₂ Evitado por Ano: ${calc.co2EvitadoAnual} ton

SIMULAÇÃO ANUAL (Primeiros 5 anos):
${calc.simulacaoAnual.slice(0, 5).map(s => `
Ano ${s.ano}:
  - Custo Convencional: R$ ${formatarNumero(s.custoConvencional)}
  - Produção Solar: ${formatarNumero(s.producaoSolar)} kWh
  - Economia Anual: R$ ${formatarNumero(s.economiaAnual)}
  - Economia Acumulada: R$ ${formatarNumero(s.economiaAcumulada)}
`).join('')}

Gerado por SolarCalc
    `;
    
    // Criar blob e download
    const blob = new Blob([conteudo], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-solar-${Date.now()}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
}

/**
 * Compartilha o cálculo
 */
function compartilhar() {
    if (!calculoAtual) {
        alert('Faça um cálculo primeiro!');
        return;
    }
    
    const calc = calculoAtual;
    const texto = `
Simulei minha economia com energia solar! 🌞

📊 Resultados:
- ${calc.numPaineis} painéis solares
- R$ ${formatarNumero(calc.investimentoInicial)} de investimento
- R$ ${formatarNumero(calc.economiaAnual)}/ano de economia
- Payback em ${calc.paybackTime} anos

Calcule a sua economia em: ${window.location.href}
    `;
    
    if (navigator.share) {
        navigator.share({
            title: 'Calculador de Economia Solar',
            text: texto,
            url: window.location.href
        });
    } else {
        // Fallback: copiar para clipboard
        navigator.clipboard.writeText(texto);
        alert('Texto copiado para a área de transferência!');
    }
}

// ==========================================
// VALIDAÇÃO
// ==========================================

/**
 * Valida os dados do formulário
 */
function validarDados(dados) {
    const erros = [];
    
    if (dados.consumoMensal < 50 || dados.consumoMensal > 5000) {
        erros.push('Consumo mensal deve estar entre 50 e 5000 kWh');
    }
    
    if (dados.tarifaEnergia < 0.10 || dados.tarifaEnergia > 2.00) {
        erros.push('Tarifa deve estar entre R$ 0.10 e R$ 2.00');
    }
    
    if (!dados.numPessoas) {
        erros.push('Selecione o número de pessoas');
    }
    
    if (!dados.tipoResidencia) {
        erros.push('Selecione o tipo de residência');
    }
    
    if (dados.areaDisponivel < 5 || dados.areaDisponivel > 500) {
        erros.push('Área disponível deve estar entre 5 e 500 m²');
    }
    
    if (!dados.regiao) {
        erros.push('Selecione a região');
    }
    
    if (erros.length > 0) {
        alert('Erros encontrados:\n\n' + erros.join('\n'));
        return false;
    }
    
    return true;
}

// ==========================================
// FUNÇÕES UTILITÁRIAS
// ==========================================

/**
 * Formata número com separadores
 */
function formatarNumero(num) {
    return parseFloat(num).toLocaleString('pt-BR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
}

/**
 * Formata número como moeda
 */
function formatarMoeda(valor) {
    return parseFloat(valor).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}
