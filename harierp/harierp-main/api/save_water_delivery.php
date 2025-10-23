
<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// --- Database Connection ---
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

// --- Main Logic ---
try {
    $data = json_decode(file_get_contents("php://input"));

    // Basic validation
    if (
        !isset($data->deliveryId) || empty(trim($data->deliveryId)) ||
        !isset($data->deliveryDate) || empty(trim($data->deliveryDate)) ||
        !isset($data->supplierId) || empty(trim($data->supplierId)) ||
        !isset($data->quantityLtrs) || !is_numeric($data->quantityLtrs) || $data->quantityLtrs <= 0
    ) {
        http_response_code(400);
        throw new Exception("Incomplete or invalid water delivery data provided. Supplier, date, and quantity are required.");
    }
    
    $conn->begin_transaction();

    // --- Define Payload ---
    $id = "water_" . uniqid();
    $deliveryId = trim($data->deliveryId);
    $deliveryDate = $data->deliveryDate;
    $supplierId = trim($data->supplierId);
    $supplierName = isset($data->supplierName) ? trim($data->supplierName) : null;
    $quantityLtrs = (float)$data->quantityLtrs;
    $temperature = isset($data->temperature) && is_numeric($data->temperature) ? (float)$data->temperature : null;
    $phLevel = isset($data->fatPercentage) && is_numeric($data->fatPercentage) ? (float)$data->fatPercentage : null; // Re-using fatPercentage for pH
    $notes = isset($data->notes) ? trim($data->notes) : '';
    $createdAt = date('Y-m-d H:i:s');

    // IMPORTANT: The system identifies the raw water tank by the SKU 'RAW-WATER-TANK-001'.
    $water_material_sku = 'RAW-WATER-TANK-001';

    // 1. Log the delivery for record-keeping
    $stmt_log = $conn->prepare(
        "INSERT INTO milk_deliveries (id, deliveryId, deliveryDate, supplierId, supplierName, quantityLtrs, temperature, fatPercentage, status, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Accepted', ?, ?, ?)"
    );
    // Note: fatPercentage column is used for pH Level
    $stmt_log->bind_param("sssssddisss", $id, $deliveryId, $deliveryDate, $supplierId, $supplierName, $quantityLtrs, $temperature, $phLevel, $notes, $createdAt, $createdAt);

    if (!$stmt_log->execute()) {
        throw new Exception("Failed to log water delivery: " . $stmt_log->error);
    }
    $stmt_log->close();

    // 2. Update the stock in the raw_materials table using SKU
    $stmt_update_stock = $conn->prepare("UPDATE raw_materials SET stock = stock + ? WHERE sku = ?");
    $stmt_update_stock->bind_param("ds", $quantityLtrs, $water_material_sku);
    
    if (!$stmt_update_stock->execute()) {
        throw new Exception("Failed to update raw water tank stock: " . $stmt_update_stock->error);
    }
    if ($stmt_update_stock->affected_rows === 0) {
        throw new Exception("Raw water tank material with SKU '{$water_material_sku}' not found. Please ensure this item exists in the `raw_materials` table.");
    }
    $stmt_update_stock->close();

    // If all successful, commit the transaction
    $conn->commit();
    http_response_code(200);
    echo json_encode(["success" => true, "message" => "Water delivery recorded and stock updated successfully.", "id" => $id]);

} catch (Exception $e) {
    if ($conn->autocommit) { // Check if transaction was started
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
