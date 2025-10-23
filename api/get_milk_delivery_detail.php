
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

    // --- Get ID from query parameter ---
    $delivery_id = isset($_GET['id']) ? $_GET['id'] : null;

    if (!$delivery_id) {
        http_response_code(400); // Bad Request
        throw new Exception("Milk delivery ID is required.");
    }

    // --- Fetch Specific Milk Delivery ---
    $stmt = $conn->prepare("SELECT id, deliveryId, deliveryDate, supplierId, supplierName, quantityLtrs, temperature, fatPercentage, status, notes, createdAt, updatedAt 
                            FROM milk_deliveries
                            WHERE id = ?");
    if (!$stmt) {
        throw new Exception("Prepare statement failed: " . $conn->error);
    }

    $stmt->bind_param("s", $delivery_id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $delivery = $result->fetch_assoc();
        // Ensure numeric types are correctly cast
        $delivery['quantityLtrs'] = isset($delivery['quantityLtrs']) ? (float)$delivery['quantityLtrs'] : 0;
        $delivery['temperature'] = isset($delivery['temperature']) ? (float)$delivery['temperature'] : null;
        $delivery['fatPercentage'] = isset($delivery['fatPercentage']) ? (float)$delivery['fatPercentage'] : null;
        
        http_response_code(200);
        echo json_encode(["success" => true, "data" => $delivery]);
    } else {
        http_response_code(404);
        echo json_encode(["success" => false, "message" => "Milk delivery with ID '{$delivery_id}' not found."]);
    }

    $stmt->close();

} catch (Exception $e) {
    // Check if status code has already been set, otherwise default to 500
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
