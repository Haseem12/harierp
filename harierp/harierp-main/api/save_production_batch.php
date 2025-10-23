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

// --- Main Logic within a Transaction ---
try {
    $data = json_decode(file_get_contents("php://input"));

    if (
        !isset($data->batchId) ||
        !isset($data->productionDate) ||
        !isset($data->consumedItems) || !is_array($data->consumedItems) || empty($data->consumedItems)
    ) {
        http_response_code(400);
        throw new Exception("Incomplete production batch data provided. Missing batchId, productionDate, or consumedItems.");
    }
    
    $conn->begin_transaction();

    $batchId = trim($data->batchId);
    $notes = isset($data->notes) ? trim($data->notes) : '';
    $productionDate = $data->productionDate;

    // 1. Process Consumed Raw Materials
    $stmt_check_raw_stock = $conn->prepare("SELECT stock, name, unitOfMeasure FROM raw_materials WHERE id = ? FOR UPDATE");
    $stmt_update_raw_stock = $conn->prepare("UPDATE raw_materials SET stock = stock - ? WHERE id = ?");
    $stmt_log_usage = $conn->prepare(
        "INSERT INTO raw_material_usage_logs (id, usageNumber, rawMaterialId, rawMaterialName, quantityUsed, unitOfMeasure, department, usageDate, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())"
    );

    foreach ($data->consumedItems as $item) {
        if (!isset($item->materialId) || !isset($item->quantityUsed) || !is_numeric($item->quantityUsed) || $item->quantityUsed <= 0) {
            throw new Exception("Invalid item data in consumedItems array. Each item must have a materialId and a positive quantityUsed.");
        }
        $materialId = $item->materialId;
        $quantityUsed = (float)$item->quantityUsed;

        // Check for sufficient stock
        $stmt_check_raw_stock->bind_param("s", $materialId);
        $stmt_check_raw_stock->execute();
        $result = $stmt_check_raw_stock->get_result();
        if ($result->num_rows === 0) {
            throw new Exception("Raw material with ID '{$materialId}' not found.");
        }
        $material = $result->fetch_assoc();
        if ($material['stock'] < $quantityUsed) {
            throw new Exception("Insufficient stock for material '{$material['name']}'. Required: {$quantityUsed}, Available: {$material['stock']}.");
        }
        $result->close();

        // Deduct stock
        $stmt_update_raw_stock->bind_param("ds", $quantityUsed, $materialId);
        $stmt_update_raw_stock->execute();
        if ($stmt_update_raw_stock->affected_rows === 0) {
            throw new Exception("Failed to update stock for material '{$material['name']}'.");
        }
        
        // Log the usage
        $log_id = "usage_" . uniqid();
        $usageNumber = "PROD-{$batchId}-{$materialId}";
        $department = 'Production';
        $log_notes = "Consumed for production batch {$batchId}. " . $notes;
        $stmt_log_usage->bind_param("ssssdssss", $log_id, $usageNumber, $materialId, $material['name'], $quantityUsed, $material['unitOfMeasure'], $department, $productionDate, $log_notes);
        $stmt_log_usage->execute();
    }
    
    $stmt_check_raw_stock->close();
    $stmt_update_raw_stock->close();
    $stmt_log_usage->close();

    // If everything was successful, commit the transaction
    $conn->commit();
    http_response_code(200);
    echo json_encode(["success" => true, "message" => "Production batch processed successfully. Raw material stock levels updated.", "id" => $batchId]);

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