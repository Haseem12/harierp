<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

$servername = "localhost";
$username = "sajfood1_busa";
$password = "Haseem1234@";
$dbname = "sajfood1_busa-app";

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Database connection failed: " . $conn->connect_error]);
    exit();
}

try {
    $customerId = isset($_GET['customerId']) ? $_GET['customerId'] : null;

    $sql = "SELECT id, receiptNumber, receiptDate, ledgerAccountId, ledgerAccountName, amountReceived, paymentMethod, bankName, referenceNumber, notes, createdAt, updatedAt FROM receipts";

    if ($customerId) {
        $sql .= " WHERE ledgerAccountId = ?";
    }

    $sql .= " ORDER BY receiptDate DESC, createdAt DESC";

    $stmt = $conn->prepare($sql);

    if ($customerId) {
        $stmt->bind_param("s", $customerId);
    }
    
    $stmt->execute();
    $result = $stmt->get_result();

    if (!$result) {
        throw new Exception("Query failed: " . $conn->error);
    }

    $receipts = [];
    while ($row = $result->fetch_assoc()) {
        $receipts[] = $row;
    }
    
    $stmt->close();

    http_response_code(200);
    echo json_encode(["success" => true, "data" => $receipts]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "An error occurred: " . $e->getMessage()]);
} finally {
    if (isset($conn)) {
        $conn->close();
    }
}
?>
