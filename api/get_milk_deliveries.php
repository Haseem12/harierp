
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

    // --- Fetch Milk Deliveries ---
    // The supplierName is already denormalized in the milk_deliveries table, so a join is not strictly necessary for this list view.
    // This improves performance for fetching the main list.
    $sql = "SELECT id, deliveryId, deliveryDate, supplierId, supplierName, quantityLtrs, temperature, fatPercentage, status, notes, createdAt, updatedAt 
            FROM milk_deliveries
            ORDER BY deliveryDate DESC, createdAt DESC";
            
    $result = $conn->query($sql);

    if (!$result) {
        throw new Exception("Query failed: " . $conn->error);
    }

    $deliveries = [];
    while ($row = $result->fetch_assoc()) {
        // Ensure numeric types are correctly cast
        $row['quantityLtrs'] = isset($row['quantityLtrs']) ? (float)$row['quantityLtrs'] : 0;
        $row['temperature'] = isset($row['temperature']) ? (float)$row['temperature'] : null;
        $row['fatPercentage'] = isset($row['fatPercentage']) ? (float)$row['fatPercentage'] : null;
        $deliveries[] = $row;
    }
    
    http_response_code(200);
    echo json_encode(["success" => true, "data" => $deliveries]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "An error occurred: " . $e->getMessage()]);
} finally {
    if (isset($conn)) {
        $conn->close();
    }
}
?>
