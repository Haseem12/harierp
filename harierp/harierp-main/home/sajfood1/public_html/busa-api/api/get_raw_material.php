<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

// --- Database Connection ---
$servername = "localhost";
$username = "sajfood1_busa";
$password = "Haseem1234@";
$dbname = "sajfood1_busa-app";

try {
    $conn = new mysqli($servername, $username, $password, $dbname);

    if ($conn->connect_error) {
        throw new Exception("Database connection failed: " . $conn->connect_error);
    }

    // --- Get ID from query parameter ---
    $material_id = isset($_GET['id']) ? $_GET['id'] : null;

    if (!$material_id) {
        http_response_code(400); // Bad Request
        throw new Exception("Raw Material ID is required.");
    }

    // --- Fetch Specific Raw Material with Supplier Name ---
    $stmt = $conn->prepare("SELECT 
                                rm.id, rm.name, rm.description, rm.category, rm.sku, 
                                rm.unitOfMeasure, rm.litres, rm.stock, rm.costPrice, 
                                rm.lowStockThreshold, rm.imageUrl, rm.supplierId, 
                                la.name AS supplierName, 
                                rm.createdAt, rm.updatedAt 
                            FROM raw_materials rm
                            LEFT JOIN ledger_accounts la ON rm.supplierId = la.id
                            WHERE rm.id = ?");
    if (!$stmt) {
        throw new Exception("Prepare statement failed: " . $conn->error);
    }

    $stmt->bind_param("s", $material_id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $material = $result->fetch_assoc();
        // Ensure numeric types are correctly cast
        $material['stock'] = isset($material['stock']) ? (float)$material['stock'] : 0;
        $material['costPrice'] = isset($material['costPrice']) ? (float)$material['costPrice'] : 0;
        $material['lowStockThreshold'] = isset($material['lowStockThreshold']) ? (float)$material['lowStockThreshold'] : 0;
        $material['litres'] = isset($material['litres']) ? (float)$material['litres'] : null;
        
        http_response_code(200);
        echo json_encode(["success" => true, "data" => $material]);
    } else {
        http_response_code(404);
        echo json_encode(["success" => false, "message" => "Raw Material with ID '{$material_id}' not found."]);
    }

    $stmt->close();

} catch (Exception $e) {
    if (http_response_code() === 200) {
        http_response_code(500);
    }
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
} finally {
    if (isset($conn)) {
        $conn->close();
    }
}
?>
