
<?php
header("Access-Control-Allow-Origin: *"); // Allow requests from any origin
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

// Database connection details (replace with your actual credentials)
$servername = "localhost";
$username = "your_db_username";
$password = "your_db_password";
$dbname = "your_db_name";

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Connection failed: " . $conn->connect_error]);
    exit();
}

// SQL to fetch products - adjust your query as needed
$sql = "SELECT id, name, description, price, costPrice, priceTiers, productCategory, alternateUnits, pcsPerUnit, unitOfMeasure, litres, sku, stock, lowStockThreshold, imageUrl, createdAt, updatedAt FROM products ORDER BY name ASC";
$result = $conn->query($sql);

$products = [];

if ($result) {
    while ($row = $result->fetch_assoc()) {
        // Format priceTiers
        $priceTiersRaw = $row['priceTiers'];
        if ($priceTiersRaw === "0" || empty($priceTiersRaw)) {
            $row['priceTiers'] = [];
        } else {
            $decodedTiers = json_decode($priceTiersRaw, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decodedTiers)) {
                // Ensure each tier has priceLevel and price
                $validTiers = [];
                foreach ($decodedTiers as $tier) {
                    if (isset($tier['priceLevel']) && isset($tier['price'])) {
                        $validTiers[] = [
                            'priceLevel' => (string)$tier['priceLevel'],
                            'price' => (float)$tier['price']
                        ];
                    }
                }
                $row['priceTiers'] = $validTiers;
            } else {
                // If it's not valid JSON or not an array, default to empty
                $row['priceTiers'] = [];
            }
        }

        // Format unitOfMeasure
        if ($row['unitOfMeasure'] === "0" || empty($row['unitOfMeasure'])) {
            $row['unitOfMeasure'] = "PCS"; // Default to PCS or null
        }
        
        // Validate unitOfMeasure against a predefined list (optional but good practice)
        $validUnits = ['PCS', 'Litres', 'KG', 'Grams', 'Pack', 'Sachet', 'Unit', 'Carton', 'Bag', 'Other'];
        if (!in_array($row['unitOfMeasure'], $validUnits)) {
            $row['unitOfMeasure'] = "PCS"; // Fallback if invalid
        }


        // Format date fields (createdAt, updatedAt)
        // Convert "0000-00-00 00:00:00" to null or a default valid date for JSON
        if ($row['createdAt'] === "0000-00-00 00:00:00" || empty($row['createdAt'])) {
            $row['createdAt'] = null; 
        }
        if ($row['updatedAt'] === "0000-00-00 00:00:00" || empty($row['updatedAt'])) {
            $row['updatedAt'] = null;
        }

        // Ensure numeric fields are numbers
        $row['price'] = isset($row['price']) ? (float)$row['price'] : 0;
        $row['costPrice'] = isset($row['costPrice']) ? (float)$row['costPrice'] : 0;
        $row['stock'] = isset($row['stock']) ? (int)$row['stock'] : 0;
        $row['lowStockThreshold'] = isset($row['lowStockThreshold']) ? (int)$row['lowStockThreshold'] : 0;
        $row['pcsPerUnit'] = isset($row['pcsPerUnit']) ? (int)$row['pcsPerUnit'] : 0;
        $row['litres'] = isset($row['litres']) ? (float)$row['litres'] : 0;
        
        // Ensure other string fields are strings or null
        $row['name'] = isset($row['name']) ? (string)$row['name'] : 'Unnamed Product';
        $row['description'] = isset($row['description']) ? (string)$row['description'] : null;
        $row['productCategory'] = isset($row['productCategory']) ? (string)$row['productCategory'] : 'Other Finished Good';
        $row['alternateUnits'] = isset($row['alternateUnits']) ? (string)$row['alternateUnits'] : null;
        $row['sku'] = isset($row['sku']) ? (string)$row['sku'] : 'N/A';
        $row['imageUrl'] = isset($row['imageUrl']) ? (string)$row['imageUrl'] : null;


        $products[] = $row;
    }
    echo json_encode(["success" => true, "data" => $products]);
} else {
    echo json_encode(["success" => false, "message" => "Error fetching products: " . $conn->error]);
}

$conn->close();
?>
    