<?php
header("Access-Control-Allow-Origin: *"); // For development. Restrict in production.
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

// Handle OPTIONS request (pre-flight)
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

// --- Database Connection (replace with your actual connection details) ---
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
// --- End Database Connection ---

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->id) || empty(trim($data->id))) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Log ID is required."]);
    exit();
}

$logId = trim($data->id);

$conn->begin_transaction();

try {
    // 1. Fetch the log entry to get details for stock reversal
    $stmtFetchLog = $conn->prepare("SELECT productId, quantityAdjusted, adjustmentType FROM product_stock_adjustment_logs WHERE id = ?");
    if (!$stmtFetchLog) {
        throw new Exception("Prepare statement failed (fetch log): " . $conn->error);
    }
    $stmtFetchLog->bind_param("s", $logId);
    $stmtFetchLog->execute();
    $resultLog = $stmtFetchLog->get_result();
    $logEntry = $resultLog->fetch_assoc();
    $stmtFetchLog->close();

    if (!$logEntry) {
        throw new Exception("Log entry not found with ID: " . htmlspecialchars($logId));
    }

    $productId = $logEntry['productId'];
    $quantityAdjusted = (float)$logEntry['quantityAdjusted'];
    $adjustmentType = $logEntry['adjustmentType'];

    // 2. Reverse the stock adjustment on the product
    // Determine if the original adjustment was an addition or subtraction
    $stockChangeToReverse = 0;
    if ($adjustmentType === 'ADDITION' || $adjustmentType === 'MANUAL_CORRECTION_ADD' || $adjustmentType === 'INITIAL_STOCK') {
        $stockChangeToReverse = -$quantityAdjusted; // To reverse, subtract the amount
    } elseif ($adjustmentType === 'MANUAL_CORRECTION_SUBTRACT') {
        $stockChangeToReverse = $quantityAdjusted; // To reverse a subtraction, add the amount back
    } else {
        // If other adjustment types exist that don't simply add/subtract, more logic is needed
        // For now, assume only these types affect stock in a reversible way
        // Or if it was 'USAGE', for example, deleting the usage log might mean adding stock back
    }

    if ($stockChangeToReverse !== 0) {
        $stmtUpdateStock = $conn->prepare("UPDATE products SET stock = stock + ? WHERE id = ?");
        if (!$stmtUpdateStock) {
            throw new Exception("Prepare statement failed (update stock): " . $conn->error);
        }
        $stmtUpdateStock->bind_param("ds", $stockChangeToReverse, $productId); // 'd' for double/decimal
        if (!$stmtUpdateStock->execute()) {
            throw new Exception("Failed to update product stock: " . $stmtUpdateStock->error);
        }
        if ($stmtUpdateStock->affected_rows === 0) {
            // This might mean the product ID was invalid or stock didn't change.
            // Depending on strictness, you might throw an error or log a warning.
            error_log("Warning: Stock update for product ID " . htmlspecialchars($productId) . " affected 0 rows during log deletion.");
        }
        $stmtUpdateStock->close();
    }


    // 3. Delete the log entry
    $stmtDeleteLog = $conn->prepare("DELETE FROM product_stock_adjustment_logs WHERE id = ?");
    if (!$stmtDeleteLog) {
        throw new Exception("Prepare statement failed (delete log): " . $conn->error);
    }
    $stmtDeleteLog->bind_param("s", $logId);
    if (!$stmtDeleteLog->execute()) {
        throw new Exception("Failed to delete log entry: " . $stmtDeleteLog->error);
    }
    $stmtDeleteLog->close();

    $conn->commit();
    echo json_encode(["success" => true, "message" => "Stock adjustment log deleted and stock reversed successfully."]);

} catch (Exception $e) {
    $conn->rollback();
    http_response_code(500);
    error_log("Delete Stock Log Failed: " . $e->getMessage());
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}

$conn->close();
?>
