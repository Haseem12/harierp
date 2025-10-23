<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

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
    $conn->begin_transaction();

    $data = json_decode(file_get_contents("php://input"));

    if (!isset($data->items) || !is_array($data->items) || empty($data->items)) {
        http_response_code(400);
        throw new Exception("No items provided for stock adjustment.");
    }
    
    $log_ids = [];

    // Use a single statement for getting product details
    $stmt_get_product = $conn->prepare("SELECT name, stock FROM products WHERE id = ? FOR UPDATE");
    $stmt_update_stock = $conn->prepare("UPDATE products SET stock = stock + ? WHERE id = ?");
    $stmt_log = $conn->prepare(
        "INSERT INTO product_stock_adjustment_logs (id, logNumber, productId, productName, quantityAdjusted, adjustmentType, adjustmentDate, notes, previousStock, newStock, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())"
    );

    foreach ($data->items as $item) {
        // Validation for each item
        if (
            !isset($item->productId) || empty(trim($item->productId)) ||
            !isset($item->quantityAdjusted) || !is_numeric($item->quantityAdjusted) ||
            !isset($item->adjustmentType) || empty(trim($item->adjustmentType)) ||
            !isset($item->adjustmentDate) || empty(trim($item->adjustmentDate))
        ) {
            throw new Exception("Incomplete or invalid item data in the batch. Required: productId, quantityAdjusted, adjustmentType, adjustmentDate.");
        }

        $productId = trim($item->productId);
        $quantityAdjusted = (float)$item->quantityAdjusted;
        $adjustmentType = trim($item->adjustmentType);

        // Fetch product details (name and current stock)
        $stmt_get_product->bind_param("s", $productId);
        $stmt_get_product->execute();
        $result = $stmt_get_product->get_result();

        if ($result->num_rows === 0) {
            throw new Exception("Product with ID '{$productId}' not found.");
        }
        $product = $result->fetch_assoc();
        $productName = $product['name']; // Correctly get the name
        $previousStock = (float)$product['stock'];
        $result->close();


        // If this is a pending submission, we DO NOT update stock.
        // The approval script will handle the stock update.
        if ($adjustmentType !== 'PENDING_APPROVAL') {
             // Optional: Check for sufficient stock if it's a deduction
            if ($quantityAdjusted < 0 && $previousStock < abs($quantityAdjusted)) {
                throw new Exception("Insufficient stock for product '{$productName}'. Required: " . abs($quantityAdjusted) . ", Available: {$previousStock}.");
            }
            
            // Update stock in products table
            $stmt_update_stock->bind_param("ds", $quantityAdjusted, $productId);
            if (!$stmt_update_stock->execute()) {
                throw new Exception("Failed to update stock for product '{$productName}': " . $stmt_update_stock->error);
            }
             $newStock = $previousStock + $quantityAdjusted;
        } else {
            // For pending items, we just record the intended change without altering current stock
            // The `previousStock` should reflect the stock at the time of submission
            $newStock = $previousStock + $quantityAdjusted; // The projected new stock
        }
       
        // Insert a record into the adjustment log table
        $log_id = "log_" . uniqid();
        $logNumber = isset($item->logNumber) ? trim($item->logNumber) : 'LOG-' . uniqid();
        $adjustmentDate = $item->adjustmentDate;
        $notes = isset($item->notes) ? trim($item->notes) : '';

        $stmt_log->bind_param(
            "ssssdsssdd", 
            $log_id, $logNumber, $productId, $productName, $quantityAdjusted, 
            $adjustmentType, $adjustmentDate, $notes, $previousStock, $newStock
        );
        if (!$stmt_log->execute()) {
            throw new Exception("Failed to log stock adjustment: " . $stmt_log->error);
        }
        $log_ids[] = $log_id;
    }
    
    $stmt_get_product->close();
    $stmt_update_stock->close();
    $stmt_log->close();
    
    $conn->commit();
    http_response_code(200);
    echo json_encode(["success" => true, "message" => "Batch stock adjustment processed successfully.", "log_ids" => $log_ids]);

} catch (Exception $e) {
    // Check if a transaction was started before trying to roll back
    if ($conn && !$conn->autocommit) {
       $conn->rollback();
    }
    // Ensure response code is appropriate for an error
    if (http_response_code() === 200) {
        http_response_code(500);
    }
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
} finally {
    if (isset($conn)) {
        $conn->close();
    }
}
?>
