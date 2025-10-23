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
    $data = json_decode(file_get_contents("php://input"));

    // Basic Validation
    if (
        !isset($data->name) || empty(trim($data->name)) ||
        !isset($data->category) || empty(trim($data->category)) ||
        !isset($data->sku) || empty(trim($data->sku)) ||
        !isset($data->unitOfMeasure) || empty(trim($data->unitOfMeasure)) ||
        !isset($data->stock) || !is_numeric($data->stock) ||
        !isset($data->costPrice) || !is_numeric($data->costPrice)
    ) {
        http_response_code(400);
        throw new Exception("Incomplete or invalid raw material data provided.");
    }

    $id = isset($data->id) && !empty(trim($data->id)) ? trim($data->id) : 'raw_' . uniqid();
    $name = trim($data->name);
    $description = isset($data->description) ? trim($data->description) : '';
    $category = trim($data->category);
    $sku = trim($data->sku);
    $unitOfMeasure = trim($data->unitOfMeasure);
    $litres = isset($data->litres) && is_numeric($data->litres) ? (float)$data->litres : null;
    $stock = (float)$data->stock;
    $costPrice = (float)$data->costPrice;
    $lowStockThreshold = isset($data->lowStockThreshold) && is_numeric($data->lowStockThreshold) ? (float)$data->lowStockThreshold : 0;
    $imageUrl = isset($data->imageUrl) ? trim($data->imageUrl) : '';
    $supplierId = isset($data->supplierId) && !empty(trim($data->supplierId)) ? trim($data->supplierId) : null;
    $updatedAt = date('Y-m-d H:i:s');

    if (isset($data->id) && !empty(trim($data->id))) {
        // --- Update Existing Raw Material ---
        $stmt = $conn->prepare("UPDATE raw_materials SET name=?, description=?, category=?, sku=?, unitOfMeasure=?, litres=?, stock=?, costPrice=?, lowStockThreshold=?, imageUrl=?, supplierId=?, updatedAt=? WHERE id=?");
        $stmt->bind_param("sssssddisssss", $name, $description, $category, $sku, $unitOfMeasure, $litres, $stock, $costPrice, $lowStockThreshold, $imageUrl, $supplierId, $updatedAt, $id);

        if ($stmt->execute()) {
            http_response_code(200);
            echo json_encode(["success" => true, "message" => "Raw material updated successfully.", "id" => $id]);
        } else {
            throw new Exception("Failed to update raw material: " . $stmt->error);
        }
    } else {
        // --- Insert New Raw Material ---
        $createdAt = isset($data->createdAt) ? $data->createdAt : date('Y-m-d H:i:s');
        $stmt = $conn->prepare("INSERT INTO raw_materials (id, name, description, category, sku, unitOfMeasure, litres, stock, costPrice, lowStockThreshold, imageUrl, supplierId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("sssssddisdssss", $id, $name, $description, $category, $sku, $unitOfMeasure, $litres, $stock, $costPrice, $lowStockThreshold, $imageUrl, $supplierId, $createdAt, $updatedAt);
        
        if ($stmt->execute()) {
            http_response_code(201); // 201 Created
            echo json_encode(["success" => true, "message" => "Raw material added successfully.", "id" => $id]);
        } else {
            // Check for duplicate SKU
            if ($conn->errno == 1062) { // 1062 is the MySQL error number for duplicate entry
                throw new Exception("Failed to add raw material: A material with SKU '{$sku}' already exists.");
            }
            throw new Exception("Failed to add raw material: " . $stmt->error);
        }
    }

    $stmt->close();

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
} finally {
    if (isset($conn)) {
        $conn->close();
    }
}
?>