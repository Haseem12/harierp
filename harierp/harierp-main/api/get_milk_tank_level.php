<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

// --- Database Connection ---
$servername = "localhost";
$username = "your_db_username";
$password = "your_db_password";
$dbname = "your_db_name";

try {
    $conn = new mysqli($servername, $username, $password, $dbname);

    if ($conn->connect_error) {
        throw new Exception("Database connection failed: " . $conn->connect_error);
    }

    // --- Fetch Raw Water Tank Level ---
    // IMPORTANT: The system identifies the raw water tank by the SKU 'RAW-WATER-TANK-001'.
    // Ensure you have created a raw material item with this exact SKU.
    $water_material_sku = 'RAW-WATER-TANK-001';

    $stmt = $conn->prepare("SELECT stock FROM raw_materials WHERE sku = ?");
    if (!$stmt) {
        throw new Exception("Prepare statement failed: " . $conn->error);
    }

    $stmt->bind_param("s", $water_material_sku);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $row = $result->fetch_assoc();
        http_response_code(200);
        echo json_encode(["success" => true, "data" => ["tankLevelLtrs" => (float)$row['stock']]]);
    } else {
        http_response_code(404);
        echo json_encode(["success" => false, "message" => "Raw water tank material record not found (SKU: {$water_material_sku}). Please ensure this item exists in the `raw_materials` table."]);
    }

    $stmt->close();

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "An error occurred: " . $e->getMessage()]);
} finally {
    if (isset($conn)) {
        $conn->close();
    }
}
?>
