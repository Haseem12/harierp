
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

    // --- Fetch Individual Production Batch Usage Logs ---
    // A production batch usage is identified by its usageNumber starting with 'PROD-'
    // in the raw_material_usage_logs table. We fetch individual log entries.
    $sql = "SELECT 
                id,
                usageNumber,
                rawMaterialId,
                rawMaterialName,
                quantityUsed,
                unitOfMeasure,
                department,
                usageDate,
                notes,
                recordedBy,
                createdAt,
                updatedAt,
                SUBSTRING_INDEX(usageNumber, '-', 2) AS batchId
            FROM raw_material_usage_logs 
            WHERE usageNumber LIKE 'PROD-%' 
            ORDER BY usageDate DESC, createdAt DESC";
            
    $result = $conn->query($sql);

    if (!$result) {
        throw new Exception("Query failed: " . $conn->error);
    }

    $batches = [];
    while ($row = $result->fetch_assoc()) {
        $batches[] = $row;
    }

    http_response_code(200);
    echo json_encode(["success" => true, "data" => $batches]);

} catch (Exception $e) {
    http_response_code(500);
    // Use a more structured error response
    echo json_encode([
        "success" => false, 
        "message" => "An error occurred while fetching production batches.",
        "error" => $e->getMessage()
    ]);
} finally {
    if (isset($conn)) {
        $conn->close();
    }
}
?>
