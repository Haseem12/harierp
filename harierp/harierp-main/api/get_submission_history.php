
<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

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
    // Fetch logs that are either pending or were approved from production yield
    $sql = "SELECT id, logNumber, productId, productName, quantityAdjusted, adjustmentType, adjustmentDate, notes, updatedAt FROM product_stock_adjustment_logs WHERE adjustmentType = 'PENDING_APPROVAL' OR adjustmentType = 'PRODUCTION_YIELD' ORDER BY adjustmentDate DESC";

    $stmt = $conn->prepare($sql);
    $stmt->execute();
    $result = $stmt->get_result();

    if (!$result) {
        throw new Exception("Query failed: " . $conn->error);
    }

    $logs = [];
    while ($row = $result->fetch_assoc()) {
        $logs[] = $row;
    }
    
    $stmt->close();

    http_response_code(200);
    echo json_encode(["success" => true, "data" => $logs]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "An error occurred: " . $e->getMessage()]);
} finally {
    if (isset($conn)) {
        $conn->close();
    }
}
?>
