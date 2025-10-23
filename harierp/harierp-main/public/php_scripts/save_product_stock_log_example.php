
<?php
// EXAMPLE PHP SCRIPT: save_product_stock_log.php
// --- IMPORTANT ---
// This is a conceptual outline. You MUST adapt it for your actual database schema,
// connection method, security practices (prepared statements are crucial), and error handling.

header("Access-Control-Allow-Origin: *"); // Adjust for production
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// --- Database Connection (replace with your actual connection logic) ---
$servername = "localhost";
$username = "your_db_user";
$password = "your_db_password";
$dbname = "your_db_name";

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Connection failed: " . $conn->connect_error]);
    exit();
}
// --- End Database Connection ---

$data = json_decode(file_get_contents("php://input"));

if (!$data) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Invalid JSON input."]);
    exit();
}

// --- Basic Validation (expand as needed) ---
if (
    !isset($data->logNumber) ||
    !isset($data->productId) ||
    !isset($data->productName) ||
    !isset($data->quantityAdjusted) || !is_numeric($data->quantityAdjusted) ||
    !isset($data->adjustmentType) ||
    !isset($data->adjustmentDate) || // Expected format 'YYYY-MM-DD HH:MM:SS' from client
    !isset($data->previousStock) || !is_numeric($data->previousStock) ||
    !isset($data->newStock) || !is_numeric($data->newStock) ||
    !isset($data->createdAt) // Expected format 'YYYY-MM-DD HH:MM:SS' from client
) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Missing required fields for stock log."]);
    exit();
}

$log_id = "psl_" . uniqid("", true); // Generate a unique ID for the log entry
$logNumber = $conn->real_escape_string($data->logNumber);
$productId = $conn->real_escape_string($data->productId);
$productName = $conn->real_escape_string($data->productName);
$quantityAdjusted = (float)$data->quantityAdjusted;
$adjustmentType = $conn->real_escape_string($data->adjustmentType);
$adjustmentDate = $conn->real_escape_string($data->adjustmentDate); // Ensure client sends in 'YYYY-MM-DD HH:MM:SS' or parse correctly
$notes = isset($data->notes) ? $conn->real_escape_string($data->notes) : null;
$previousStock = (float)$data->previousStock;
$newStock = (float)$data->newStock; // This should be products.stock + quantityAdjusted for 'ADDITION'
$recordedBy = isset($data->recordedBy) ? $conn->real_escape_string($data->recordedBy) : null; // Optional
$createdAt = $conn->real_escape_string($data->createdAt); // Client sends this
$updatedAt = $createdAt; // For new log, updatedAt is same as createdAt

// --- Database Transaction ---
$conn->begin_transaction();

try {
    // 1. Insert into product_stock_adjustment_logs table
    // Adjust column names and table name as per your schema
    $sql_log = "INSERT INTO product_stock_adjustment_logs (id, logNumber, productId, productName, quantityAdjusted, adjustmentType, adjustmentDate, notes, previousStock, newStock, recordedBy, createdAt, updatedAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

    $stmt_log = $conn->prepare($sql_log);
    if ($stmt_log === false) {
        throw new Exception("Prepare failed (log): " . $conn->error);
    }
    // Types: s (id), s (logNum), s (prodId), s (prodName), d (qtyAdj), s (adjType), s (adjDate), s (notes), d (prevStock), d (newStock), s (recBy), s (created), s (updated)
    $stmt_log->bind_param("ssssdssdiddss",
        $log_id, $logNumber, $productId, $productName, $quantityAdjusted,
        $adjustmentType, $adjustmentDate, $notes, $previousStock, $newStock,
        $recordedBy, $createdAt, $updatedAt
    );

    if (!$stmt_log->execute()) {
        throw new Exception("Execute failed (log): " . $stmt_log->error);
    }
    $stmt_log->close();

    // 2. Update stock in the products table
    // Ensure the product_id exists and the adjustmentType dictates the operation
    // For 'ADDITION', new_stock should be previous_stock + quantity_adjusted.
    // This logic assumes 'newStock' sent by client is correctly calculated (currentStock + quantityAdjusted).
    // It's safer to fetch current stock and update: stock = stock + quantityAdjusted
    
    // More robust: Fetch current stock first if newStock from client is not trusted
    // $sql_get_stock = "SELECT stock FROM products WHERE id = ? FOR UPDATE"; // FOR UPDATE to lock row
    // $stmt_get_stock = $conn->prepare($sql_get_stock);
    // $stmt_get_stock->bind_param("s", $productId);
    // $stmt_get_stock->execute();
    // $current_product_stock_result = $stmt_get_stock->get_result();
    // if ($current_product_stock_result->num_rows === 0) {
    //     throw new Exception("Product ID not found: " . $productId);
    // }
    // $current_product_stock_row = $current_product_stock_result->fetch_assoc();
    // $db_current_stock = (float)$current_product_stock_row['stock'];
    // $stmt_get_stock->close();
    // $calculated_new_stock = $db_current_stock + $quantityAdjusted; // This is the most reliable new stock

    $sql_update_product = "UPDATE products SET stock = ?, updatedAt = NOW() WHERE id = ?";
    $stmt_update_product = $conn->prepare($sql_update_product);
    if ($stmt_update_product === false) {
        throw new Exception("Prepare failed (product update): " . $conn->error);
    }
    // Bind params: d (newStock), s (productId)
    $stmt_update_product->bind_param("ds", $newStock, $productId); // Using newStock from client for simplicity here.

    if (!$stmt_update_product->execute()) {
        throw new Exception("Execute failed (product update): " . $stmt_update_product->error);
    }
    $stmt_update_product->close();

    // Commit transaction
    $conn->commit();
    http_response_code(201); // Created
    echo json_encode(["success" => true, "message" => "Stock adjustment logged and product stock updated successfully.", "id" => $log_id]);

} catch (Exception $e) {
    $conn->rollback();
    http_response_code(500);
    error_log("Stock Log Save Failed: " . $e->getMessage());
    echo json_encode(["success" => false, "message" => "Operation failed: " . $e->getMessage()]);
}

$conn->close();
?>
