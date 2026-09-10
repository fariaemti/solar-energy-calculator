<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Configurações e Constantes
define('POTENCIA_PAINEL', 0.4);       // kW
define('EFICIENCIA_SISTEMA', 0.85);  // 85%
define('HORAS_PICO_SOLAR', 5);       // horas/dia
define('DEGRADACAO_ANUAL', 0.5);     // % ao ano
define('CO2_POR_KWH', 0.475);        // kg
define('MANUTENCAO_ANUAL', 0.005);    // % do investimento

$irradiacaoSolar = [
    'norte' => 4.5,
    'nordeste' => 5.2,
    'centro-oeste' => 5.5,
    'sudeste' => 4.8,
    'sul' => 4.3
];

// Captura a rota
$rota = $_GET['rota'] ?? '';
$metodo = $_SERVER['REQUEST_METHOD'];

// Roteamento
switch ($rota) {
    case 'calcular':
        if ($metodo === 'POST') {
            $dados = json_decode(file_get_contents('php://input'), true);
            $resultado = calcularEconomiaSolar($dados, $irradiacaoSolar);
            echo json_encode(['status' => 'success', 'data' => $resultado]);
        } else {
            http_response_code(405);
            echo json_encode(['status' => 'error', 'message' => 'Método não permitido']);
        }
        break;

    case 'salvar':
        if ($metodo === 'POST') {
            $dados = json_decode(file_get_contents('php://input'), true);
            // Lógica para persistir no banco SQLite ou arquivo local
            echo json_encode(['status' => 'success', 'message' => 'Cálculo salvo com sucesso', 'id' => $dados['id'] ?? time()]);
        } else {
            http_response_code(405);
            echo json_encode(['status' => 'error', 'message' => 'Método não permitido']);
        }
        break;

    case 'historico':
        if ($metodo === 'GET') {
            // Retorna o histórico de cálculos salvos
            echo json_encode([]);
        } else {
            http_response_code(405);
            echo json_encode(['status' => 'error', 'message' => 'Método não permitido']);
        }
        break;

    case 'obter':
        if ($metodo === 'GET') {
            $id = $_GET['id'] ?? null;
            echo json_encode(['status' => 'success', 'data' => null]);
        } else {
            http_response_code(405);
            echo json_encode(['status' => 'error', 'message' => 'Método não permitido']);
        }
        break;

    case 'deletar':
        if ($metodo === 'DELETE') {
            $dados = json_decode(file_get_contents('php://input'), true);
            echo json_encode(['status' => 'success', 'message' => 'Cálculo removido']);
        } else {
            http_response_code(405);
            echo json_encode(['status' => 'error', 'message' => 'Método não permitido']);
        }
        break;

    default:
        http_response_code(404);
        echo json_encode(['status' => 'error', 'message' => 'Rota não encontrada']);
        break;
}

// Functions de Cálculo
function calcularEconomiaSolar($dados, $irradiacaoSolar) {
    $consumoMensal = (float)($dados['consumoMensal'] ?? 0);
    $tarifaEnergia = (float)($dados['tarifaEnergia'] ?? 0);
    $regiao = $dados['regiao'] ?? 'sudeste';
    $custoPainel = (float)($dados['custoPainel'] ?? 0);
    $anos = (int)($dados['anos'] ?? 25);

    $consumoAnual = $consumoMensal * 12;
    $custoAnualConvencional = $consumoAnual * $tarifaEnergia;
    $irradiacao = $irradiacaoSolar[$regiao] ?? 5.0;

    $consumoDiario = $consumoMensal / 30;
    $potenciaNecessaria = $consumoDiario / ($irradiacao * EFICIENCIA_SISTEMA);
    $numPaineis = (int)ceil($potenciaNecessaria / POTENCIA_PAINEL);
    $investimentoInicial = $numPaineis * $custoPainel;

    $producaoSolarAnual = $numPaineis * POTENCIA_PAINEL * HORAS_PICO_SOLAR * 365 * EFICIENCIA_SISTEMA;
    $economiaAnual = min($consumoAnual, $producaoSolarAnual) * $tarifaEnergia;
    $paybackTime = $economiaAnual > 0 ? $investimentoInicial / $economiaAnual : 0;
    $roiAnual = $investimentoInicial > 0 ? ($economiaAnual / $investimentoInicial) * 100 : 0;
    $co2EvitadoAnual = ($producaoSolarAnual * CO2_POR_KWH) / 1000;

    $simulacaoAnual = gerarSimulacaoAnual(
        $consumoAnual,
        $investimentoInicial,
        $anos,
        $producaoSolarAnual,
        $tarifaEnergia
    );

    $economiaTotal = end($simulacaoAnual)['economiaAcumulada'] ?? 0;

    return array_merge($dados, [
        'consumoAnual' => round($consumoAnual, 2),
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
        'timestamp' => date('d/m/Y H:i:s')
    ]);
}

function gerarSimulacaoAnual($consumoAnual, $investimento, $anos, $producaoSolar, $tarifaEnergia) {
    $simulacao = [];
    $economiaAcumulada = -$investimento;

    for ($ano = 1; $ano <= $anos; $ano++) {
        $degradacao = 1 - (DEGRADACAO_ANUAL / 100) * ($ano - 1);
        $producaoAnoAtual = $producaoSolar * $degradacao;
        
        // Uso da tarifa real repassada por parâmetro
        $custoConvencionalAno = $consumoAnual * $tarifaEnergia;
        $economiaAnoAtual = min($consumoAnual, $producaoAnoAtual) * $tarifaEnergia;
        $manutencao = $investimento * MANUTENCAO_ANUAL;

        $economiaAcumulada += $economiaAnoAtual - $manutencao;

        $simulacao[] = [
            'ano' => $ano,
            'custoConvencional' => round($custoConvencionalAno, 2),
            'producaoSolar' => round($producaoAnoAtual, 2),
            'economiaAnual' => round($economiaAnoAtual, 2),
            'manutencao' => round($manutencao, 2),
            'economiaAcumulada' => round($economiaAcumulada, 2),
            'lucroLiquido' => round($economiaAcumulada, 2)
        ];
    }

    return $simulacao;
}
