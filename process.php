<?php
/**
 * SOLAR ENERGY CALCULATOR - API Backend
 * Processa requisições de cálculo, salvamento e exportação
 */

// ==========================================
// HEADERS E SEGURANÇA
// ==========================================

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Tratar requisição preflight CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Prevenir cache
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

// ==========================================
// INCLUIR BANCO DE DADOS
// ==========================================

require_once 'database.php';

// ==========================================
// OBTER DADOS DA REQUISIÇÃO
// ==========================================

$metodo = $_SERVER['REQUEST_METHOD'];
$rota = isset($_GET['rota']) ? trim($_GET['rota']) : '';
$dados = [];

if ($metodo === 'POST' || $metodo === 'PUT') {
    $input = file_get_contents('php://input');
    $dados = json_decode($input, true) ?? [];
}

// Gerar ID de usuário único
$usuario_id = gerarUsuarioId();

// ==========================================
// ROTEAMENTO
// ==========================================

try {
    switch ($rota) {
        case 'calcular':
            responderCalculo($dados);
            break;
            
        case 'salvar':
            responderSalvar($db, $usuario_id, $dados);
            break;
            
        case 'historico':
            responderHistorico($db, $usuario_id);
            break;
            
        case 'obter':
            $id = isset($_GET['id']) ? filter_var($_GET['id'], FILTER_VALIDATE_INT) : null;
            responderObter($db, $usuario_id, $id);
            break;
            
        case 'deletar':
            responderDeletar($db, $usuario_id, $dados);
            break;
            
        case 'exportar-pdf':
            responderExportarPDF($db, $usuario_id, $dados);
            break;
            
        case 'exportar-csv':
            responderExportarCSV($db, $usuario_id, $dados);
            break;
            
        case 'estatisticas':
            responderEstatisticas($db, $usuario_id);
            break;
            
        case 'verificar-banco':
            responderVerificarBanco();
            break;
            
        default:
            http_response_code(404);
            echo json_encode([
                'sucesso' => false,
                'mensagem' => 'Rota não encontrada: ' . htmlspecialchars($rota)
            ]);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    error_log("Erro na API: " . $e->getMessage());
    echo json_encode([
        'sucesso' => false,
        'mensagem' => 'Erro no servidor: ' . $e->getMessage()
    ]);
}

// ==========================================
// FUNÇÕES DE RESPOSTA
// ==========================================

function responderCalculo($dados) {
    if (!isset($dados['consumoMensal'], $dados['tarifaEnergia'], $dados['regiao'])) {
        http_response_code(400);
        echo json_encode([
            'sucesso' => false,
            'mensagem' => 'Dados incompletos para cálculo'
        ]);
        return;
    }
    
    $calculo = calcularEconomiaSolar($dados);
    
    echo json_encode([
        'sucesso' => true,
        'mensagem' => 'Cálculo realizado com sucesso',
        'dados' => $calculo
    ]);
}

function responderSalvar($db, $usuario_id, $dados) {
    $usuario_db_id = obterOuCriarUsuario($db, $usuario_id, $dados['nome'] ?? null, $dados['email'] ?? null);
    
    if (!$usuario_db_id) {
        http_response_code(500);
        echo json_encode([
            'sucesso' => false,
            'mensagem' => 'Erro ao processar usuário'
        ]);
        return;
    }
    
    $calculo_id = salvarCalculo($db, $usuario_id, $dados);
    
    if (!$calculo_id) {
        http_response_code(500);
        echo json_encode([
            'sucesso' => false,
            'mensagem' => 'Erro ao salvar cálculo'
        ]);
        return;
    }
    
    echo json_encode([
        'sucesso' => true,
        'mensagem' => 'Cálculo salvo com sucesso',
        'calculo_id' => $calculo_id
    ]);
}

function responderHistorico($db, $usuario_id) {
    $calculos = obterCalculosUsuario($db, $usuario_id);
    
    echo json_encode([
        'sucesso' => true,
        'dados' => $calculos,
        'total' => count($calculos)
    ]);
}

function responderObter($db, $usuario_id, $calculo_id) {
    if (!$calculo_id) {
        http_response_code(400);
        echo json_encode([
            'sucesso' => false,
            'mensagem' => 'ID do cálculo inválido ou não fornecido'
        ]);
        return;
    }
    
    $calculo = obterCalculo($db, $calculo_id);
    
    if (!$calculo || $calculo['usuario_id'] !== $usuario_id) {
        http_response_code(404);
        echo json_encode([
            'sucesso' => false,
            'mensagem' => 'Cálculo não encontrado'
        ]);
        return;
    }
    
    echo json_encode([
        'sucesso' => true,
        'dados' => $calculo
    ]);
}

function responderDeletar($db, $usuario_id, $dados) {
    $calculo_id = $dados['calculo_id'] ?? null;
    
    if (!$calculo_id) {
        http_response_code(400);
        echo json_encode([
            'sucesso' => false,
            'mensagem' => 'ID do cálculo não fornecido'
        ]);
        return;
    }
    
    if (!deletarCalculo($db, $calculo_id, $usuario_id)) {
        http_response_code(403);
        echo json_encode([
            'sucesso' => false,
            'mensagem' => 'Não autorizado ou cálculo não encontrado'
        ]);
        return;
    }
    
    echo json_encode([
        'sucesso' => true,
        'mensagem' => 'Cálculo deletado com sucesso'
    ]);
}

function responderExportarPDF($db, $usuario_id, $dados) {
    $calculo_id = $dados['calculo_id'] ?? null;
    
    if (!$calculo_id) {
        http_response_code(400);
        echo json_encode([
            'sucesso' => false,
            'mensagem' => 'ID do cálculo não fornecido'
        ]);
        return;
    }
    
    $calculo = obterCalculo($db, $calculo_id);
    
    if (!$calculo || $calculo['usuario_id'] !== $usuario_id) {
        http_response_code(403);
        echo json_encode([
            'sucesso' => false,
            'mensagem' => 'Não autorizado'
        ]);
        return;
    }
    
    $conteudo = gerarConteudoPDF($calculo);
    
    header('Content-Type: text/plain; charset=utf-8');
    header('Content-Disposition: attachment; filename="relatorio_solar_' . $calculo_id . '.txt"');
    echo $conteudo;
    exit();
}

function responderExportarCSV($db, $usuario_id, $dados) {
    $calculo_id = $dados['calculo_id'] ?? null;
    
    if (!$calculo_id) {
        http_response_code(400);
        echo json_encode([
            'sucesso' => false,
            'mensagem' => 'ID do cálculo não fornecido'
        ]);
        return;
    }
    
    $calculo = obterCalculo($db, $calculo_id);
    
    if (!$calculo || $calculo['usuario_id'] !== $usuario_id) {
        http_response_code(403);
        echo json_encode([
            'sucesso' => false,
            'mensagem' => 'Não autorizado'
        ]);
        return;
    }
    
    $conteudo = gerarConteudoCSV($calculo);
    
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="relatorio_solar_' . $calculo_id . '.csv"');
    echo $conteudo;
    exit();
}

function responderEstatisticas($db, $usuario_id) {
    $stats = obterEstatisticasUsuario($db, $usuario_id);
    
    echo json_encode([
        'sucesso' => true,
        'dados' => $stats
    ]);
}

function responderVerificarBanco() {
    $dir = __DIR__ . '/data';
    $db_file = $dir . '/calculos.db';
    $existe = file_exists($db_file);
    $tamanho = $existe ? filesize($db_file) : 0;
    
    echo json_encode([
        'sucesso' => true,
        'banco_existe' => $existe,
        'tamanho_bytes' => $tamanho,
        'caminho' => $db_file,
        'diretorio_existe' => is_dir($dir),
        'diretorio_criavel' => is_writable(__DIR__)
    ]);
}

// ==========================================
// FUNÇÕES AUXILIARES DE CÁLCULO
// ==========================================

function calcularEconomiaSolar($dados) {
    $POTENCIA_PAINEL = 0.4;
    $EFICIENCIA_SISTEMA = 0.85;
    $HORAS_PICO_SOLAR = 5;
    $DEGRADACAO_ANUAL = 0.5;
    $CO2_POR_KWH = 0.475;
    $MANUTENCAO_ANUAL = 0.005;
    
    $irradiacao_solar = [
        'norte' => 4.5,
        'nordeste' => 5.2,
        'centro-oeste' => 5.5,
        'sudeste' => 4.8,
        'sul' => 4.3
    ];
    
    $consumoMensal = floatval($dados['consumoMensal']);
    $tarifaEnergia = floatval($dados['tarifaEnergia']);
    $regiao = $dados['regiao'] ?? 'sudeste';
    $custoPainel = floatval($dados['custoPainel'] ?? 2000);
    $anos = intval($dados['anos'] ?? 25);
    
    $consumoAnual = $consumoMensal * 12;
    $custoAnualConvencional = $consumoAnual * $tarifaEnergia;
    
    $irradiacao = $irradiacao_solar[$regiao] ?? 5.0;
    $consumoDiario = $consumoMensal / 30;
    $potenciaNecessaria = $consumoDiario / ($irradiacao * $EFICIENCIA_SISTEMA);
    
    $numPaineis = ceil($potenciaNecessaria / $POTENCIA_PAINEL);
    $investimentoInicial = $numPaineis * $custoPainel;
    
    $producaoSolarAnual = $numPaineis * $POTENCIA_PAINEL * $HORAS_PICO_SOLAR * 365 * $EFICIENCIA_SISTEMA;
    $economiaAnual = min($consumoAnual, $producaoSolarAnual) * $tarifaEnergia;
    
    $paybackTime = $economiaAnual > 0 ? $investimentoInicial / $economiaAnual : 0;
    $roiAnual = $investimentoInicial > 0 ? ($economiaAnual / $investimentoInicial) * 100 : 0;
    
    $co2EvitadoAnual = ($producaoSolarAnual * $CO2_POR_KWH) / 1000;
    
    $simulacaoAnual = [];
    $economiaAcumulada = -$investimentoInicial;
    
    for ($ano = 1; $ano <= $anos; $ano++) {
        $degradacao = 1 - ($DEGRADACAO_ANUAL / 100) * ($ano - 1);
        $producaoAnoAtual = $producaoSolarAnual * $degradacao;
        
        $custoConvencionalAno = $consumoAnual * $tarifaEnergia;
        $economiaAnoAtual = min($consumoAnual, $producaoAnoAtual) * $tarifaEnergia;
        $manutencao = $investimentoInicial * $MANUTENCAO_ANUAL;
        
        $economiaAcumulada += $economiaAnoAtual - $manutencao;
        
        $simulacaoAnual[] = [
            'ano' => $ano,
            'custoConvencional' => round($custoConvencionalAno, 2),
            'producaoSolar' => round($producaoAnoAtual, 2),
            'economiaAnual' => round($economiaAnoAtual, 2),
            'manutencao' => round($manutencao, 2),
            'economiaAcumulada' => round($economiaAcumulada, 2),
            'lucroLiquido' => round($economiaAcumulada, 2)
        ];
    }
    
    $economiaTotal = $simulacaoAnual[count($simulacaoAnual) - 1]['economiaAcumulada'];
    
    return [
        'consumoMensal' => $consumoMensal,
        'consumoAnual' => $consumoAnual,
        'tarifaEnergia' => $tarifaEnergia,
        'regiao' => $regiao,
        'irradiacao' => $irradiacao,
        'potenciaNecessaria' => round($potenciaNecessaria, 2),
        'numPaineis' => $numPaineis,
        'investimentoInicial' => round($investimentoInicial, 2),
        'producaoSolarAnual' => round($producaoSolarAnual, 2),
        'custoAnualConvencional' => round($custoAnualConvencional, 2),
        'economiaAnual' => round($economiaAnual, 2),
        'paybackTime' => round($paybackTime, 2),
        'roiAnual' => round($roiAnual, 2),
        'co2EvitadoAnual' => round($co2EvitadoAnual, 2),
        'economiaTotal' => round($economiaTotal, 2),
        'simulacaoAnual' => $simulacaoAnual,
        'timestamp' => date('Y-m-d H:i:s')
    ];
}

function gerarConteudoPDF($calculo) {
    $conteudo = "RELATÓRIO DE SIMULAÇÃO DE ECONOMIA SOLAR\n";
    $conteudo .= "=========================================\n\n";
    $conteudo .= "Data: " . date('d/m/Y H:i:s') . "\n\n";
    
    $conteudo .= "DADOS DE ENTRADA:\n";
    $conteudo .= "- Consumo Mensal: " . ($calculo['consumo_mensal'] ?? 0) . " kWh\n";
    $conteudo .= "- Tarifa de Energia: R$ " . ($calculo['tarifa_energia'] ?? 0) . "/kWh\n";
    $conteudo .= "- Região: " . ($calculo['regiao'] ?? 'N/A') . "\n\n";
    
    $conteudo .= "RESULTADOS:\n";
    $conteudo .= "- Número de Painéis: " . ($calculo['num_paineis'] ?? 0) . "\n";
    $conteudo .= "- Investimento Inicial: R$ " . number_format($calculo['investimento_inicial'] ?? 0, 2, ',', '.') . "\n";
    $conteudo .= "- Economia Anual: R$ " . number_format($calculo['economia_anual'] ?? 0, 2, ',', '.') . "\n";
    $conteudo .= "- Tempo de Payback: " . ($calculo['payback_time'] ?? 0) . " anos\n";
    $conteudo .= "- ROI Anual: " . ($calculo['roi_anual'] ?? 0) . "%\n";
    $conteudo .= "- Economia Total (25 anos): R$ " . number_format($calculo['economia_total'] ?? 0, 2, ',', '.') . "\n";
    $conteudo .= "- CO₂ Evitado/Ano: " . number_format($calculo['co2_evitado'] ?? 0, 2, ',', '.') . " ton\n";
    
    return $conteudo;
}

function gerarConteudoCSV($calculo) {
    $csv = "Ano,Custo Convencional,Produção Solar,Economia Anual,Economia Acumulada,Lucro Líquido\n";
    
    if (!empty($calculo['dados_simulacao'])) {
        $simulacao = is_array($calculo['dados_simulacao']) ? $calculo['dados_simulacao'] : json_decode($calculo['dados_simulacao'], true);
        
        if (is_array($simulacao)) {
            foreach ($simulacao as $linha) {
                $csv .= ($linha['ano'] ?? '') . ",";
                $csv .= ($linha['custoConvencional'] ?? 0) . ",";
                $csv .= ($linha['producaoSolar'] ?? 0) . ",";
                $csv .= ($linha['economiaAnual'] ?? 0) . ",";
                $csv .= ($linha['economiaAcumulada'] ?? 0) . ",";
                $csv .= ($linha['lucroLiquido'] ?? 0) . "\n";
            }
        }
    }
    
    return $csv;
}

function gerarUsuarioId() {
    if (!isset($_COOKIE['usuario_id'])) {
        $usuario_id = 'user_' . bin2hex(random_bytes(16));
        if (!headers_sent()) {
            setcookie('usuario_id', $usuario_id, time() + (365 * 24 * 60 * 60), '/', '', false, true);
        }
        return $usuario_id;
    }
    return $_COOKIE['usuario_id'];
}
