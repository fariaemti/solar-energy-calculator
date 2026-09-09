<?php
/**
 * SOLAR ENERGY CALCULATOR - Database Configuration
 * Configuração de banco de dados SQLite para armazenamento de cálculos
 */

// ==========================================
// CONFIGURAÇÕES
// ==========================================

// Diretório de dados
define('DATA_DIR', __DIR__ . '/data');
define('DB_FILE', DATA_DIR . '/calculos.db');

// Criar diretório se não existir
if (!file_exists(DATA_DIR)) {
    mkdir(DATA_DIR, 0755, true);
}

// ==========================================
// CONEXÃO COM BANCO DE DADOS
// ==========================================

try {
    // Conectar ou criar banco de dados SQLite
    $db = new PDO('sqlite:' . DB_FILE);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Inicializar banco de dados
    inicializarBancoDados($db);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'sucesso' => false,
        'mensagem' => 'Erro ao conectar ao banco de dados: ' . $e->getMessage()
    ]);
    exit;
}

// ==========================================
// FUNÇÕES DE BANCO DE DADOS
// ==========================================

/**
 * Inicializa o banco de dados criando tabelas se não existirem
 */
function inicializarBancoDados($db) {
    // Tabela de cálculos salvos
    $db->exec("
        CREATE TABLE IF NOT EXISTS calculos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_id TEXT NOT NULL,
            consumo_mensal REAL,
            tarifa_energia REAL,
            num_pessoas TEXT,
            tipo_residencia TEXT,
            area_disponivel REAL,
            regiao TEXT,
            custo_painel REAL,
            anos_analise INTEGER,
            num_paineis INTEGER,
            investimento_inicial REAL,
            economia_anual REAL,
            payback_time REAL,
            roi_anual REAL,
            economia_total REAL,
            co2_evitado REAL,
            producao_solar_anual REAL,
            dados_simulacao TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ");
    
    // Tabela de usuários
    $db->exec("
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_id TEXT UNIQUE NOT NULL,
            nome TEXT,
            email TEXT UNIQUE,
            criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ");
    
    // Tabela de exportações
    $db->exec("
        CREATE TABLE IF NOT EXISTS exportacoes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            calculo_id INTEGER,
            tipo_exportacao TEXT,
            arquivo_path TEXT,
            criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (calculo_id) REFERENCES calculos(id)
        )
    ");
}

/**
 * Obtém ou cria um usuário
 */
function obterOuCriarUsuario($db, $usuario_id, $nome = null, $email = null) {
    try {
        // Verificar se usuário já existe
        $stmt = $db->prepare("SELECT id FROM usuarios WHERE usuario_id = ?");
        $stmt->execute([$usuario_id]);
        $usuario = $stmt->fetch();
        
        if ($usuario) {
            return $usuario['id'];
        }
        
        // Criar novo usuário
        $stmt = $db->prepare("
            INSERT INTO usuarios (usuario_id, nome, email)
            VALUES (?, ?, ?)
        ");
        $stmt->execute([$usuario_id, $nome, $email]);
        
        return $db->lastInsertId();
        
    } catch (PDOException $e) {
        error_log("Erro ao gerenciar usuário: " . $e->getMessage());
        return false;
    }
}

/**
 * Salva um cálculo no banco de dados
 */
function salvarCalculo($db, $usuario_id, $dados) {
    try {
        $stmt = $db->prepare("
            INSERT INTO calculos (
                usuario_id,
                consumo_mensal,
                tarifa_energia,
                num_pessoas,
                tipo_residencia,
                area_disponivel,
                regiao,
                custo_painel,
                anos_analise,
                num_paineis,
                investimento_inicial,
                economia_anual,
                payback_time,
                roi_anual,
                economia_total,
                co2_evitado,
                producao_solar_anual,
                dados_simulacao
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $usuario_id,
            $dados['consumoMensal'] ?? null,
            $dados['tarifaEnergia'] ?? null,
            $dados['numPessoas'] ?? null,
            $dados['tipoResidencia'] ?? null,
            $dados['areaDisponivel'] ?? null,
            $dados['regiao'] ?? null,
            $dados['custoPainel'] ?? null,
            $dados['anos'] ?? 25,
            $dados['numPaineis'] ?? null,
            $dados['investimentoInicial'] ?? null,
            $dados['economiaAnual'] ?? null,
            $dados['paybackTime'] ?? null,
            $dados['roiAnual'] ?? null,
            $dados['economiaTotal'] ?? null,
            $dados['co2EvitadoAnual'] ?? null,
            $dados['producaoSolarAnual'] ?? null,
            json_encode($dados['simulacaoAnual'] ?? [])
        ]);
        
        return $db->lastInsertId();
        
    } catch (PDOException $e) {
        error_log("Erro ao salvar cálculo: " . $e->getMessage());
        return false;
    }
}

/**
 * Obtém todos os cálculos de um usuário
 */
function obterCalculosUsuario($db, $usuario_id) {
    try {
        $stmt = $db->prepare("
            SELECT * FROM calculos 
            WHERE usuario_id = ? 
            ORDER BY timestamp DESC
        ");
        $stmt->execute([$usuario_id]);
        
        $calculos = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Decodificar dados de simulação
        foreach ($calculos as &$calculo) {
            $calculo['dados_simulacao'] = json_decode($calculo['dados_simulacao'], true);
        }
        
        return $calculos;
        
    } catch (PDOException $e) {
        error_log("Erro ao obter cálculos: " . $e->getMessage());
        return [];
    }
}

/**
 * Obtém um cálculo específico
 */
function obterCalculo($db, $calculo_id) {
    try {
        $stmt = $db->prepare("SELECT * FROM calculos WHERE id = ?");
        $stmt->execute([$calculo_id]);
        
        $calculo = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($calculo) {
            $calculo['dados_simulacao'] = json_decode($calculo['dados_simulacao'], true);
        }
        
        return $calculo;
        
    } catch (PDOException $e) {
        error_log("Erro ao obter cálculo: " . $e->getMessage());
        return null;
    }
}

/**
 * Deleta um cálculo
 */
function deletarCalculo($db, $calculo_id, $usuario_id) {
    try {
        // Verificar se o usuário é o proprietário
        $stmt = $db->prepare("SELECT usuario_id FROM calculos WHERE id = ?");
        $stmt->execute([$calculo_id]);
        $calculo = $stmt->fetch();
        
        if (!$calculo || $calculo['usuario_id'] !== $usuario_id) {
            return false;
        }
        
        // Deletar exportações associadas
        $stmt = $db->prepare("DELETE FROM exportacoes WHERE calculo_id = ?");
        $stmt->execute([$calculo_id]);
        
        // Deletar cálculo
        $stmt = $db->prepare("DELETE FROM calculos WHERE id = ?");
        $stmt->execute([$calculo_id]);
        
        return true;
        
    } catch (PDOException $e) {
        error_log("Erro ao deletar cálculo: " . $e->getMessage());
        return false;
    }
}

/**
 * Atualiza um cálculo existente
 */
function atualizarCalculo($db, $calculo_id, $usuario_id, $dados) {
    try {
        // Verificar se o usuário é o proprietário
        $stmt = $db->prepare("SELECT usuario_id FROM calculos WHERE id = ?");
        $stmt->execute([$calculo_id]);
        $calculo = $stmt->fetch();
        
        if (!$calculo || $calculo['usuario_id'] !== $usuario_id) {
            return false;
        }
        
        $stmt = $db->prepare("
            UPDATE calculos SET
                consumo_mensal = ?,
                tarifa_energia = ?,
                num_pessoas = ?,
                tipo_residencia = ?,
                area_disponivel = ?,
                regiao = ?,
                custo_painel = ?,
                anos_analise = ?,
                num_paineis = ?,
                investimento_inicial = ?,
                economia_anual = ?,
                payback_time = ?,
                roi_anual = ?,
                economia_total = ?,
                co2_evitado = ?,
                producao_solar_anual = ?,
                dados_simulacao = ?
            WHERE id = ?
        ");
        
        $stmt->execute([
            $dados['consumoMensal'] ?? null,
            $dados['tarifaEnergia'] ?? null,
            $dados['numPessoas'] ?? null,
            $dados['tipoResidencia'] ?? null,
            $dados['areaDisponivel'] ?? null,
            $dados['regiao'] ?? null,
            $dados['custoPainel'] ?? null,
            $dados['anos'] ?? 25,
            $dados['numPaineis'] ?? null,
            $dados['investimentoInicial'] ?? null,
            $dados['economiaAnual'] ?? null,
            $dados['paybackTime'] ?? null,
            $dados['roiAnual'] ?? null,
            $dados['economiaTotal'] ?? null,
            $dados['co2EvitadoAnual'] ?? null,
            $dados['producaoSolarAnual'] ?? null,
            json_encode($dados['simulacaoAnual'] ?? []),
            $calculo_id
        ]);
        
        return true;
        
    } catch (PDOException $e) {
        error_log("Erro ao atualizar cálculo: " . $e->getMessage());
        return false;
    }
}

/**
 * Registra uma exportação
 */
function registrarExportacao($db, $calculo_id, $tipo, $arquivo_path) {
    try {
        $stmt = $db->prepare("
            INSERT INTO exportacoes (calculo_id, tipo_exportacao, arquivo_path)
            VALUES (?, ?, ?)
        ");
        $stmt->execute([$calculo_id, $tipo, $arquivo_path]);
        
        return true;
        
    } catch (PDOException $e) {
        error_log("Erro ao registrar exportação: " . $e->getMessage());
        return false;
    }
}

/**
 * Obtém estatísticas de um usuário
 */
function obterEstatisticasUsuario($db, $usuario_id) {
    try {
        $stmt = $db->prepare("
            SELECT 
                COUNT(*) as total_calculos,
                AVG(economia_anual) as economia_media,
                SUM(economia_total) as economia_total_acumulada,
                AVG(payback_time) as payback_medio,
                SUM(co2_evitado) as co2_evitado_total
            FROM calculos 
            WHERE usuario_id = ?
        ");
        $stmt->execute([$usuario_id]);
        
        return $stmt->fetch(PDO::FETCH_ASSOC);
        
    } catch (PDOException $e) {
        error_log("Erro ao obter estatísticas: " . $e->getMessage());
        return null;
    }
}

?>
