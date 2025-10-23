<?php
// Set CORS headers to allow requests from your frontend domain
header("Access-Control-Allow-Origin: *"); // Replace * with your frontend URL in production
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

// Handle OPTIONS request for preflight
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

header("Content-Type: application/json; charset=UTF-8");

// --- Database Connection ---
$servername = "localhost"; // Replace with your server name
$username = "root";        // Replace with your database username
$password = "";            // Replace with your database password
$dbname = "sajfoods";      // Replace with your database name

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Database connection failed: " . $conn->connect_error]);
    exit();
}

// --- Get POST data ---
$data = json_decode(file_get_contents("php://input"));

if (!$data || !isset($data->items) || !is_array($data->items) || empty($data->items)) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Invalid input: 'items' array is required and cannot be empty."]);
    exit();
}

$batchLogNumber = $data->batchLogNumber ?? "BATCH_" . uniqid();
$processedItems = 0;
$errors = [];

// --- Start Database Transaction ---
$conn->begin_transaction();

try {
    foreach ($data->items as $item) {
        // Validate each item
        if (!isset($item->productId) || !isset($item->productName) || !isset($item->quantityAdjusted) ||
            !isset($item->adjustmentType) || !isset($item->adjustmentDate) ||
            !isset($item->previousStock) || !isset($item->newStock) || !isset($item->logNumber)) {
            $errors[] = ["item" => ($item->productName ?? 'Unknown item'), "error" => "Missing required fields for an item."];
            continue; // Skip this item, or choose to rollback entire transaction
        }

        $productId = $item->productId;
        $productName = $item->productName;
        $quantityAdjusted = (float) $item->quantityAdjusted;
        $adjustmentType = $item->adjustmentType; // Should be 'ADDITION' for this form
        $adjustmentDate = $item->adjustmentDate; // Expected: YYYY-MM-DD HH:MM:SS
        $notes = $item->notes ?? null;
        $previousStock = (float) $item->previousStock;
        $newStock = (float) $item->newStock; // This should be previousStock + quantityAdjusted
        $logNumber = $item->logNumber; // Unique log number for this specific item within the batch
        $createdAt = $item->createdAt ?? date("Y-m-d H:i:s");
        $recordedBy = null; // Placeholder for user ID if you implement authentication

        // 1. Insert into product_stock_adjustment_logs
        // Assuming your table is named 'product_stock_adjustment_logs' and matches the frontend type
        // (id is auto-increment or you generate it. If generating, add it here)
        $log_id_db = "psal_" . uniqid("", true); // Generate a unique ID for the log entry itself

        $stmtLog = $conn->prepare("INSERT INTO product_stock_adjustment_logs (id, logNumber, productId, productName, quantityAdjusted, adjustmentType, adjustmentDate, notes, previousStock, newStock, recordedBy, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        if (!$stmtLog) {
            $errors[] = ["item" => $productName, "error" => "Log statement prepare failed: " . $conn->error];
            continue;
        }
        // Types: s (id), s (logNumber), s (productId), s (productName), d (quantityAdjusted), s (adjustmentType), s (adjustmentDate), s (notes), d (previousStock), d (newStock), s (recordedBy), s (createdAt)
        $stmtLog->bind_param("ssssdssssdss", $log_id_db, $logNumber, $productId, $productName, $quantityAdjusted, $adjustmentType, $adjustmentDate, $notes, $previousStock, $newStock, $recordedBy, $createdAt);
        
        if (!$stmtLog->execute()) {
            $errors[] = ["item" => $productName, "error" => "Failed to record usage log: " . $stmtLog->error];
            $stmtLog->close();
            continue;
        }
        $stmtLog->close();

        // 2. Update product stock in the 'products' table
        // It's crucial that this operation is consistent with what previousStock and newStock imply.
        // For an 'ADDITION', newStock = previousStock + quantityAdjusted.
        // So, we directly set the stock to newStock.
        $stmtUpdateStock = $conn->prepare("UPDATE products SET stock = ? WHERE id = ?");
        if (!$stmtUpdateStock) {
            $errors[] = ["item" => $productName, "error" => "Stock update statement prepare failed: " . $conn->error];
            continue;
        }
        // Types: d (stock), s (id)
        $stmtUpdateStock->bind_param("ds", $newStock, $productId);
        
        if (!$stmtUpdateStock->execute()) {
            $errors[] = ["item" => $productName, "error" => "Failed to update product stock: " . $stmtUpdateStock->error];
            $stmtUpdateStock->close();
            continue;
        }
        if ($stmtUpdateStock->affected_rows === 0) {
            // This means the product ID was not found, which is an issue.
            $errors[] = ["item" => $productName, "error" => "Product ID " . $productId . " not found for stock update."];
            $stmtUpdateStock->close();
            continue;
        }
        $stmtUpdateStock->close();

        $processedItems++;
    }

    if (!empty($errors)) {
        // If there were errors for any item, rollback the entire transaction
        $conn->rollback();
        http_response_code(400); // Bad Request, as some items failed
        echo json_encode([
            "success" => false,
            "message" => "Batch stock adjustment failed for some items. Transaction rolled back.",
            "batchLogNumber" => $batchLogNumber,
            "processedItems" => $processedItems,
            "totalItemsInRequest" => count($data->items),
            "errors" => $errors
        ]);
    } else {
        // All items processed successfully
        $conn->commit();
        echo json_encode([
            "success" => true,
            "message" => "Batch stock adjustment processed successfully.",
            "batchLogNumber" => $batchLogNumber,
            "processedItems" => $processedItems
        ]);
    }

} catch (Exception $e) {
    $conn->rollback();
    http_response_code(500);
    error_log("Batch Stock Adjustment Exception: " . $e->getMessage());
    echo json_encode([
        "success" => false,
        "message" => "An unexpected error occurred: " . $e->getMessage(),
        "errors" => [["item" => "System", "error" => $e->getMessage()]]
    ]);
}

$conn->close();
?>
