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

    // --- Fetch Products ---
    $sql = "SELECT id, name, description, price, costPrice, priceTiers, productCategory, alternateUnits, pcsPerUnit, unitOfMeasure, litres, sku, stock, lowStockThreshold, imageUrl, createdAt, updatedAt FROM products ORDER BY name ASC";
    $result = $conn->query($sql);

    if (!$result) {
        throw new Exception("Query failed: " . $conn->error);
    }

    $products = [];
    while ($row = $result->fetch_assoc()) {
        // Ensure numeric types are correctly cast and ID is a string for frontend consistency
        $row['id'] = isset($row['id']) ? (string)$row['id'] : '';
        $row['price'] = isset($row['price']) ? (float)$row['price'] : 0;
        $row['costPrice'] = isset($row['costPrice']) ? (float)$row['costPrice'] : 0;
        $row['stock'] = isset($row['stock']) ? (float)$row['stock'] : 0;
        $row['lowStockThreshold'] = isset($row['lowStockThreshold']) ? (float)$row['lowStockThreshold'] : 0;
        $row['litres'] = isset($row['litres']) ? (float)$row['litres'] : null;
        $row['pcsPerUnit'] = isset($row['pcsPerUnit']) ? (int)$row['pcsPerUnit'] : 0;
        
        // Frontend expects priceTiers as a JSON array, not a string. Decode it here.
        // If it's already null, an invalid JSON string, or "0", default to an empty array.
        if (isset($row['priceTiers']) && is_string($row['priceTiers']) && $row['priceTiers'] !== '0' && trim($row['priceTiers']) !== '') {
            $decoded_tiers = json_decode($row['priceTiers'], true);
            // json_decode returns null on error. Check if the result is an array.
            $row['priceTiers'] = is_array($decoded_tiers) ? $decoded_tiers : [];
        } else {
            $row['priceTiers'] = [];
        }

        $products[] = $row;
    }
    
    // Standardized successful response structure
    http_response_code(200);
    echo json_encode(["success" => true, "data" => $products]);

} catch (Exception $e) {
    http_response_code(500);
    // Standardized error response structure
    echo json_encode(["success" => false, "message" => "An error occurred: " . $e->getMessage()]);
} finally {
    if (isset($conn)) {
        $conn->close();
    }
}
?>
