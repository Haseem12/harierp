<?php
header("Access-Control-Allow-Origin: *"); // For development. Restrict in production.
header("Content-Type: application/json; charset=UTF-8");

// --- Database Connection ---
$servername = "localhost";
$username = "your_db_username";
$password = "your_db_password";
$dbname = "your_db_name";

$conn = new mysqli($servername, $username, $password, $dbname);
if ($conn->connect_error) {
    error_log("Connection failed: " . $conn->connect_error);
    echo json_encode(["success" => false, "message" => "Database connection error."]);
    exit;
}
// --- End Database Connection ---

$logId = isset($_GET['id']) ? $conn->real_escape_string($_GET['id']) : null;

if (!$logId) {
    echo json_encode(["success" => false, "message" => "Log ID is required."]);
    exit;
}

$sql = "SELECT id, logNumber, productId, productName, quantityAdjusted, adjustmentType, adjustmentDate, notes, previousStock, newStock, recordedBy, createdAt, updatedAt 
        FROM product_stock_adjustment_logs 
        WHERE id = ?";

$stmt = $conn->prepare($sql);
if (!$stmt) {
    error_log("Prepare failed: (" . $conn->errno . ") " . $conn->error);
    echo json_encode(["success" => false, "message" => "Failed to prepare SQL statement."]);
    exit;
}

$stmt->bind_param("s", $logId);
if (!$stmt->execute()) {
    error_log("Execute failed: (" . $stmt->errno . ") " . $stmt->error);
    echo json_encode(["success" => false, "message" => "Failed to execute SQL statement."]);
    exit;
}

$result = $stmt->get_result();
if ($result->num_rows > 0) {
    $logEntry = $result->fetch_assoc();
    // Convert date strings to a format JS can easily parse if needed, or ensure they are standard ISO 8601
    // MySQL DATETIME format 'YYYY-MM-DD HH:MM:SS' is generally fine for JS new Date()
    echo json_encode(["success" => true, "data" => $logEntry]);
} else {
    echo json_encode(["success" => false, "message" => "Log entry not found."]);
}

$stmt->close();
$conn->close();
?>
