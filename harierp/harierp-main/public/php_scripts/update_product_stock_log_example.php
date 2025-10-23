<?php
header("Access-Control-Allow-Origin: *"); // For development. Restrict in production.
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

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

$data = json_decode(file_get_contents("php://input"));

if (!$data || !isset($data->id) || !isset($data->productId) || !isset($data->quantityAdjusted) || !isset($data->adjustmentType) || !isset($data->adjustmentDate) || !isset($data->originalQuantity)) {
    echo json_encode(["success" => false, "message" => "Invalid input data. Required fields: id, productId, quantityAdjusted, originalQuantity, adjustmentType, adjustmentDate."]);
    exit;
}

$logId = $conn->real_escape_string($data->id);
$productId = $conn->real_escape_string($data->productId);
$newQuantityAdjusted = (float)$data->quantityAdjusted; // The new quantity for this log entry
$originalQuantityAdjusted = (float)$data->originalQuantity; // The quantity from the log entry *before* this edit
$newAdjustmentType = $conn->real_escape_string($data->adjustmentType);
$newAdjustmentDate = $conn->real_escape_string($data->adjustmentDate);
$newNotes = isset($data->notes) ? $conn->real_escape_string($data->notes) : null;
$logNumber = isset($data->logNumber) ? $conn->real_escape_string($data->logNumber) : null; // Assuming logNumber might be updated too

// Prevent editing of sales-related logs directly (these should be managed via credit notes or sale cancellations)
if ($newAdjustmentType === 'SALE_DEDUCTION' || $newAdjustmentType === 'RETURN_ADDITION') {
    $stmtFetchOriginal = $conn->prepare("SELECT adjustmentType FROM product_stock_adjustment_logs WHERE id = ?");
    $stmtFetchOriginal->bind_param("s", $logId);
    $stmtFetchOriginal->execute();
    $resultOriginal = $stmtFetchOriginal->get_result();
    if ($resultOriginal->num_rows > 0) {
        $originalLog = $resultOriginal->fetch_assoc();
        if ($originalLog['adjustmentType'] === 'SALE_DEDUCTION' || $originalLog['adjustmentType'] === 'RETURN_ADDITION') {
             echo json_encode(["success" => false, "message" => "Sales-related stock adjustments (SALE_DEDUCTION, RETURN_ADDITION) cannot be directly edited. Please manage via sales or credit note processes."]);
             $stmtFetchOriginal->close();
             $conn->close();
             exit;
        }
    }
    $stmtFetchOriginal->close();
}


$conn->begin_transaction();

try {
    // 1. Fetch the original log entry to get its previousStock and current newStock (which is the stock level *after* its original effect)
    $stmtFetchLog = $conn->prepare("SELECT previousStock, newStock, quantityAdjusted AS currentLogQuantity FROM product_stock_adjustment_logs WHERE id = ?");
    if (!$stmtFetchLog) throw new Exception("Prepare failed (fetch log): " . $conn->error);
    $stmtFetchLog->bind_param("s", $logId);
    $stmtFetchLog->execute();
    $resultLog = $stmtFetchLog->get_result();
    if ($resultLog->num_rows === 0) {
        throw new Exception("Original log entry not found with ID: " . $logId);
    }
    $originalLogData = $resultLog->fetch_assoc();
    $stmtFetchLog->close();
    
    $currentLogQuantity = (float)$originalLogData['currentLogQuantity']; // The quantity this log *currently* represents

    // 2. Calculate the net change to apply to the product's stock
    // The change is: (new_adjusted_quantity_for_log) - (current_adjusted_quantity_of_log_in_db)
    $stockChangeDifference = $newQuantityAdjusted - $currentLogQuantity;

    // 3. Fetch current product stock FOR UPDATE to lock the row
    $stmtFetchProduct = $conn->prepare("SELECT stock, name FROM products WHERE id = ? FOR UPDATE");
    if (!$stmtFetchProduct) throw new Exception("Prepare failed (fetch product): " . $conn->error);
    $stmtFetchProduct->bind_param("s", $productId);
    $stmtFetchProduct->execute();
    $resultProduct = $stmtFetchProduct->get_result();
    if ($resultProduct->num_rows === 0) {
        throw new Exception("Product not found with ID: " . $productId);
    }
    $productData = $resultProduct->fetch_assoc();
    $currentProductStock = (float)$productData['stock'];
    $productName = $productData['name']; // For the updated log entry
    $stmtFetchProduct->close();

    // 4. Calculate the new product stock after applying the difference
    $finalProductStock = $currentProductStock + $stockChangeDifference;
    if ($finalProductStock < 0) {
        // Optional: prevent stock from going negative if business rule requires
        // throw new Exception("Stock cannot go below zero for product " . htmlspecialchars($productName));
    }

    // 5. Update the product's stock
    $stmtUpdateProductStock = $conn->prepare("UPDATE products SET stock = ? WHERE id = ?");
    if (!$stmtUpdateProductStock) throw new Exception("Prepare failed (update product stock): " . $conn->error);
    $stmtUpdateProductStock->bind_param("ds", $finalProductStock, $productId);
    if (!$stmtUpdateProductStock->execute()) {
        throw new Exception("Failed to update product stock: " . $stmtUpdateProductStock->error);
    }
    $stmtUpdateProductStock->close();

    // 6. Update the stock log entry
    // The 'previousStock' for the log entry remains what it was when the log was *originally* created.
    // The 'newStock' for the log entry becomes its original previousStock + its *new* quantityAdjusted.
    $logPreviousStock = (float)$originalLogData['previousStock'];
    $logNewStockAfterEdit = $logPreviousStock + $newQuantityAdjusted;

    $stmtUpdateLog = $conn->prepare("UPDATE product_stock_adjustment_logs SET 
        logNumber = ?, productName = ?, quantityAdjusted = ?, adjustmentType = ?, adjustmentDate = ?, notes = ?, 
        newStock = ?, -- This is the newStock field of the log entry itself
        updatedAt = NOW() 
        WHERE id = ?");
    if (!$stmtUpdateLog) throw new Exception("Prepare failed (update log): " . $conn->error);
    
    $effectiveLogNumber = $logNumber ?? $originalLogData['logNumber']; // Use original logNumber if not provided in update

    $stmtUpdateLog->bind_param("ssdsdsds", 
        $effectiveLogNumber, $productName, $newQuantityAdjusted, $newAdjustmentType, 
        $newAdjustmentDate, $newNotes, $logNewStockAfterEdit, $logId
    );

    if (!$stmtUpdateLog->execute()) {
        throw new Exception("Failed to update stock log entry: " . $stmtUpdateLog->error);
    }
    $stmtUpdateLog->close();

    $conn->commit();
    echo json_encode(["success" => true, "message" => "Stock log entry updated and product stock adjusted successfully."]);

} catch (Exception $e) {
    $conn->rollback();
    error_log("Update Stock Log Failed: " . $e->getMessage() . " - Input: " . json_encode($data));
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}

$conn->close();
?>
