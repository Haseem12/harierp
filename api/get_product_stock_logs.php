
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
    $filter_type = isset($_GET['type']) ? $_GET['type'] : null;

    $sql = "SELECT id, logNumber, productId, productName, quantityAdjusted, adjustmentType, adjustmentDate, notes, previousStock, newStock, recordedBy, createdAt, updatedAt FROM product_stock_adjustment_logs";
    
    if ($filter_type) {
        $sql .= " WHERE adjustmentType = ?";
    }
    
    $sql .= " ORDER BY adjustmentDate DESC, createdAt DESC";

    $stmt = $conn->prepare($sql);

    if ($filter_type) {
        $stmt->bind_param("s", $filter_type);
    }

    $stmt->execute();
    $result = $stmt->get_result();

    if (!$result) {
        throw new Exception("Query failed: " . $conn->error);
    }

    $logs = [];
    while ($row = $result->fetch_assoc()) {
        $row['previousStock'] = isset($row['previousStock']) ? (float)$row['previousStock'] : 0;
        $row['newStock'] = isset($row['newStock']) ? (float)$row['newStock'] : 0;
        $row['quantityAdjusted'] = isset($row['quantityAdjusted']) ? (float)$row['quantityAdjusted'] : 0;
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
