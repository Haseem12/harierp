<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$servername = "localhost";
$username = "sajfood1_busa";
$password = "Haseem1234@";
$dbname = "sajfood1_busa-app";

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Database connection failed: " . $conn->connect_error]);
    exit();
}

try {
    $conn->begin_transaction();

    $data = json_decode(file_get_contents("php://input"));

    if (
        !isset($data->id) || empty(trim($data->id)) ||
        !isset($data->quantityAdjusted) || !is_numeric($data->quantityAdjusted)
    ) {
        http_response_code(400);
        throw new Exception("Incomplete data provided. Log ID and quantity are required.");
    }
    
    $logId = trim($data->id);
    $quantityAdjusted = (float)$data->quantityAdjusted;
    $notes = isset($data->notes) ? trim($data->notes) : '';
    $updatedAt = date('Y-m-d H:i:s');

    // 1. Get the product ID from the log entry and lock the row to prevent race conditions
    $stmt_get_log = $conn->prepare("SELECT productId, adjustmentType FROM product_stock_adjustment_logs WHERE id = ? FOR UPDATE");
    $stmt_get_log->bind_param("s", $logId);
    $stmt_get_log->execute();
    $result_log = $stmt_get_log->get_result();

    if ($result_log->num_rows === 0) {
        throw new Exception("Log entry with ID '{$logId}' not found.");
    }
    $log = $result_log->fetch_assoc();
    $productId = $log['productId'];

    // Check if it's already approved
    if ($log['adjustmentType'] !== 'PENDING_APPROVAL') {
        throw new Exception("This submission has already been processed and is no longer pending approval.");
    }

    $stmt_get_log->close();

    // 2. Update the stock in the products table
    $stmt_update_stock = $conn->prepare("UPDATE products SET stock = stock + ? WHERE id = ?");
    $stmt_update_stock->bind_param("ds", $quantityAdjusted, $productId);
    if (!$stmt_update_stock->execute()) {
        throw new Exception("Failed to update product stock: " . $stmt_update_stock->error);
    }
    if ($stmt_update_stock->affected_rows === 0) {
        throw new Exception("Product with ID '{$productId}' not found in the products table.");
    }
    $stmt_update_stock->close();

    // 3. Update the log entry status
    // Note: We are setting adjustmentType to 'PRODUCTION_YIELD' to reflect its origin
    $stmt_update_log = $conn->prepare("UPDATE product_stock_adjustment_logs SET adjustmentType = 'PRODUCTION_YIELD', notes = ?, updatedAt = ? WHERE id = ?");
    $stmt_update_log->bind_param("sss", $notes, $updatedAt, $logId);
    if (!$stmt_update_log->execute()) {
        throw new Exception("Failed to update log entry status: " . $stmt_update_log->error);
    }
    $stmt_update_log->close();

    $conn->commit();
    http_response_code(200);
    echo json_encode(["success" => true, "message" => "Stock submission approved and inventory updated successfully."]);

} catch (Exception $e) {
    if ($conn->autocommit) {
        $conn->rollback();
    }
    http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
} finally {
    if (isset($conn)) {
        $conn->close();
    }
}
?>