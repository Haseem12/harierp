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

try {
    $conn->begin_transaction();

    $data = json_decode(file_get_contents("php://input"));

    if (
        !isset($data->rawMaterialId) || empty(trim($data->rawMaterialId)) ||
        !isset($data->quantityUsed) || !is_numeric($data->quantityUsed) || $data->quantityUsed <= 0 ||
        !isset($data->department) || empty(trim($data->department)) ||
        !isset($data->usageDate) || empty(trim($data->usageDate))
    ) {
        http_response_code(400);
        throw new Exception("Incomplete or invalid usage log data provided.");
    }

    $rawMaterialId = trim($data->rawMaterialId);
    $quantityUsed = (float)$data->quantityUsed;
    $department = trim($data->department);
    $usageDate = $data->usageDate;
    $usageNumber = isset($data->usageNumber) && !empty(trim($data->usageNumber)) ? trim($data->usageNumber) : 'USE-' . uniqid();
    $notes = isset($data->notes) ? trim($data->notes) : '';
    $recordedBy = isset($data->recordedBy) ? trim($data->recordedBy) : 'System';

    // 1. Check current stock and get material details, locking the row for update
    $stmt_check_stock = $conn->prepare("SELECT stock, name, unitOfMeasure FROM raw_materials WHERE id = ? FOR UPDATE");
    $stmt_check_stock->bind_param("s", $rawMaterialId);
    $stmt_check_stock->execute();
    $result = $stmt_check_stock->get_result();
    if ($result->num_rows === 0) {
        throw new Exception("Raw material with ID '{$rawMaterialId}' not found.");
    }
    $material = $result->fetch_assoc();
    $currentStock = (float)$material['stock'];
    $materialName = $material['name'];
    $unitOfMeasure = $material['unitOfMeasure'];
    $result->close();
    $stmt_check_stock->close();

    if ($currentStock < $quantityUsed) {
        throw new Exception("Insufficient stock for '{$materialName}'. Required: {$quantityUsed}, Available: {$currentStock}.");
    }

    // 2. Deduct stock from raw_materials table
    $stmt_update_stock = $conn->prepare("UPDATE raw_materials SET stock = stock - ? WHERE id = ?");
    $stmt_update_stock->bind_param("ds", $quantityUsed, $rawMaterialId);
    if (!$stmt_update_stock->execute()) {
        throw new Exception("Failed to update stock for '{$materialName}': " . $stmt_update_stock->error);
    }
    $stmt_update_stock->close();

    // 3. Insert a record into the usage log table
    $log_id = "usage_" . uniqid();
    $stmt_log_usage = $conn->prepare(
        "INSERT INTO raw_material_usage_logs (id, usageNumber, rawMaterialId, rawMaterialName, quantityUsed, unitOfMeasure, department, usageDate, notes, recordedBy, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())"
    );
    $stmt_log_usage->bind_param("ssssdsssss", $log_id, $usageNumber, $rawMaterialId, $materialName, $quantityUsed, $unitOfMeasure, $department, $usageDate, $notes, $recordedBy);
    if (!$stmt_log_usage->execute()) {
        throw new Exception("Failed to log material usage: " . $stmt_log_usage->error);
    }
    $stmt_log_usage->close();

    // If all steps were successful, commit the transaction
    $conn->commit();
    http_response_code(200);
    echo json_encode(["success" => true, "message" => "Material usage recorded and stock updated successfully.", "logId" => $log_id]);

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