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

    // --- Fetch Raw Materials with Supplier Name ---
    // Join with ledger_accounts to get the supplier's name for general suppliers
    $sql = "SELECT 
                rm.id, 
                rm.name, 
                rm.description, 
                rm.category, 
                rm.sku, 
                rm.unitOfMeasure, 
                rm.litres, 
                rm.stock, 
                rm.costPrice, 
                rm.lowStockThreshold, 
                rm.imageUrl, 
                rm.supplierId, 
                la.name AS supplierName, -- Get the name from the ledger_accounts table
                rm.createdAt, 
                rm.updatedAt 
            FROM raw_materials rm
            LEFT JOIN ledger_accounts la ON rm.supplierId = la.id -- LEFT JOIN to include materials without a supplier
            ORDER BY rm.name ASC";

    $result = $conn->query($sql);

    if (!$result) {
        throw new Exception("Query failed: " . $conn->error);
    }

    $materials = [];
    while ($row = $result->fetch_assoc()) {
        // Ensure numeric types are correctly cast
        $row['stock'] = isset($row['stock']) ? (float)$row['stock'] : 0;
        $row['costPrice'] = isset($row['costPrice']) ? (float)$row['costPrice'] : 0;
        $row['lowStockThreshold'] = isset($row['lowStockThreshold']) ? (float)$row['lowStockThreshold'] : 0;
        $row['litres'] = isset($row['litres']) ? (float)$row['litres'] : null;
        $materials[] = $row;
    }

    http_response_code(200);
    echo json_encode(["success" => true, "data" => $materials]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "An error occurred: " . $e->getMessage()]);
} finally {
    if (isset($conn)) {
        $conn->close();
    }
}
?>
