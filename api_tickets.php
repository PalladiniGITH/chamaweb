<?php
session_start();
require_once 'inc/connect.php';

// Verificar se o usuário está autenticado
if (!isset($_SESSION['user_id'])) {
    // Retornar erro em formato JSON
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Não autorizado']);
    exit;
}

$user_id = $_SESSION['user_id'];
$role    = $_SESSION['role'];

// Preparar variáveis para consulta
$where   = [];
$params  = [];

// Se não for analista ou admin, filtra pelos próprios chamados
if ($role !== 'analista' && $role !== 'administrador') {
    $where[] = "user_id = :uid";
    $params['uid'] = $user_id;
}

// Filtros adicionais via GET (opcional)
$pesquisa = $_GET['pesquisa'] ?? '';
if (!empty($pesquisa)) {
    $where[] = "(titulo LIKE :pesq OR descricao LIKE :pesq)";
    $params['pesq'] = "%$pesquisa%";
}

$team_id = $_GET['team_id'] ?? '';
if ($role !== 'usuario' && !empty($team_id)) {
    $where[] = "assigned_team_id = :tid";
    $params['tid'] = $team_id;
}

// Montar SQL final
$sql = "SELECT id, titulo, estado, prioridade, tipo, data_abertura FROM tickets";
if (count($where) > 0) {
    $sql .= " WHERE " . implode(" AND ", $where);
}
$sql .= " ORDER BY data_abertura DESC";

// Executar a consulta
$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$tickets = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Retornar resultados como JSON
header('Content-Type: application/json');
echo json_encode($tickets);