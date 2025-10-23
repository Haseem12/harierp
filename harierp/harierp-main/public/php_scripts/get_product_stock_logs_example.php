
<?php
// EXAMPLE PHP SCRIPT: get_product_stock_logs.php
// --- IMPORTANT ---
// This is a conceptual outline. You MUST adapt it for your actual database schema,
// connection method, security practices, and error handling.

header("Access-Control-Allow-Origin: *"); // Adjust for production
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// --- Database Connection (replace with your actual connection logic) ---
$servername = "localhost";
$username = "your_db_user";
$password = "your_db_password";
$dbname = "your_db_name";

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Connection failed: " . $conn->connect_error]);
    exit();
}
// --- End Database Connection ---

$logs = [];
// Adjust column names and table name as per your schema
$sql = "SELECT id, logNumber, productId, productName, quantityAdjusted, adjustmentType, adjustmentDate, notes, previousStock, newStock, recordedBy, createdAt, updatedAt 
        FROM product_stock_adjustment_logs 
        ORDER BY adjustmentDate DESC, createdAt DESC";

$result = $conn->query($sql);

if ($result) {
    while ($row = $result->fetch_assoc()) {
        // Ensure numeric types are correct for JSON
        $row['quantityAdjusted'] = (float)$row['quantityAdjusted'];
        $row['previousStock'] = (float)$row['previousStock'];
        $row['newStock'] = (float)$row['newStock'];
        // Dates are usually fine as strings if they are in ISO 8601 format (YYYY-MM-DD HH:MM:SS)
        // The frontend will parse them with parseISO.
        $logs[] = $row;
    }
    echo json_encode(["success" => true, "data" => $logs]);
} else {
    http_response_code(500);
    error_log("Get Stock Logs Failed: " . $conn->error);
    echo json_encode(["success" => false, "message" => "Failed to retrieve stock logs: " . $conn->error]);
}

$conn->close();
?>
