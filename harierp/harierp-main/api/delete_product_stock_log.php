
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
$username = "your_db_username";
$password = "your_db_password";
$dbname = "your_db_name";

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Database connection failed: " . $conn->connect_error]);
    exit();
}

try {
    $conn->begin_transaction();
    
    $data = json_decode(file_get_contents("php://input"));

    if (!isset($data->id) || empty(trim($data->id))) {
        http_response_code(400);
        throw new Exception("Stock log ID is required for deletion.");
    }
    $logId = trim($data->id);

    // Get the log details before deleting to reverse stock changes
    $stmt_get_log = $conn->prepare("SELECT productId, quantityAdjusted, adjustmentType FROM product_stock_adjustment_logs WHERE id = ? FOR UPDATE");
    $stmt_get_log->bind_param("s", $logId);
    $stmt_get_log->execute();
    $result = $stmt_get_log->get_result();

    if ($result->num_rows === 0) {
        throw new Exception("Stock log entry with ID '{$logId}' not found.");
    }

    $log = $result->fetch_assoc();
    $productId = $log['productId'];
    $quantityAdjusted = (float)$log['quantityAdjusted'];
    $adjustmentType = $log['adjustmentType'];
    $stmt_get_log->close();

    // Prevent deletion of system-critical logs
    if ($adjustmentType === 'SALE_DEDUCTION' || $adjustmentType === 'RETURN_ADDITION') {
        throw new Exception("Cannot delete logs related to sales or returns from this endpoint.");
    }

    // Reverse the stock adjustment if it wasn't a PENDING_APPROVAL rejection
    if ($adjustmentType !== 'PENDING_APPROVAL') {
        $stmt_reverse_stock = $conn->prepare("UPDATE products SET stock = stock - ? WHERE id = ?");
        $stmt_reverse_stock->bind_param("ds", $quantityAdjusted, $productId);
        if (!$stmt_reverse_stock->execute()) {
            throw new Exception("Failed to reverse product stock: " . $stmt_reverse_stock->error);
        }
        $stmt_reverse_stock->close();
    }

    // Delete the log entry
    $stmt_delete_log = $conn->prepare("DELETE FROM product_stock_adjustment_logs WHERE id = ?");
    $stmt_delete_log->bind_param("s", $logId);
    if (!$stmt_delete_log->execute()) {
        throw new Exception("Failed to delete stock log entry: " . $stmt_delete_log->error);
    }
    $stmt_delete_log->close();
    
    $conn->commit();
    http_response_code(200);
    echo json_encode(["success" => true, "message" => "Stock log entry deleted and stock adjustment reversed successfully."]);

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
