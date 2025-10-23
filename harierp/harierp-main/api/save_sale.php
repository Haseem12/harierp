<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

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

$transaction_started = false;
try {
    $conn->begin_transaction();
    $transaction_started = true;
    
    $data = json_decode(file_get_contents("php://input"));
    
    // --- Validation ---
    if (
        !isset($data->customerId) || !isset($data->saleDate) || !isset($data->items) || !is_array($data->items) || empty($data->items) ||
        !isset($data->totalAmount)
    ) {
        http_response_code(400);
        throw new Exception("Incomplete sale data. Customer, date, items, and total amount are required.");
    }
    
    // The `id` column is an auto-incrementing integer, so we don't provide it.
    // We will retrieve it after the insert.
    $customerId = $data->customerId;
    $saleDate = $data->saleDate;
    
    // Get denormalized customer data from frontend payload
    $customerName = $data->customerName ?? 'N/A';
    $customerEmail = $data->customerEmail ?? '';
    $customerAddress = $data->customerAddress ?? '';
    $customerPriceLevel = $data->customerPriceLevel ?? 'DEFAULT';

    $subTotal = (float)($data->subTotal ?? 0);
    $discountAmount = (float)($data->discountAmount ?? 0);
    $taxAmount = (float)($data->taxAmount ?? 0);
    $totalAmount = (float)($data->totalAmount ?? 0);
    $paymentMethod = $data->paymentMethod ?? 'Cash';
    $status = $data->status ?? 'Completed';
    $notes = $data->notes ?? '';
    $createdAt = date('Y-m-d H:i:s');
    
    // --- 1. Insert into sales table without the ID ---
    $stmt_sale = $conn->prepare(
        "INSERT INTO sales (customerId, customerName, customerEmail, customerAddress, customerPriceLevel, saleDate, subTotal, discountAmount, taxAmount, totalAmount, paymentMethod, status, notes, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    if (!$stmt_sale) throw new Exception("Prepare statement for sale failed: " . $conn->error);
    
    // Bind parameters, note `id` and `updatedAt` are removed from the INSERT
    $stmt_sale->bind_param("ssssssddddssss", $customerId, $customerName, $customerEmail, $customerAddress, $customerPriceLevel, $saleDate, $subTotal, $discountAmount, $taxAmount, $totalAmount, $paymentMethod, $status, $notes, $createdAt);
    
    if (!$stmt_sale->execute()) {
        throw new Exception("Failed to save sale record: " . $stmt_sale->error);
    }
    
    // Get the newly created integer ID from the `sales` table
    $saleId = $conn->insert_id;
    $stmt_sale->close();
    
    // --- 2. Insert sale items and deduct stock ---
    $stmt_sale_item = $conn->prepare(
        "INSERT INTO sale_items (sale_id, productId, productName, quantity, unitPrice, totalPrice) VALUES (?, ?, ?, ?, ?, ?)"
    );
    if (!$stmt_sale_item) throw new Exception("Prepare statement for sale items failed: " . $conn->error);
    
    $stmt_update_stock = $conn->prepare("UPDATE products SET stock = stock - ? WHERE id = ?");
    if (!$stmt_update_stock) throw new Exception("Prepare statement for stock update failed: " . $conn->error);
    
    $stmt_log_stock = $conn->prepare(
      "INSERT INTO product_stock_adjustment_logs (id, logNumber, productId, productName, quantityAdjusted, adjustmentType, adjustmentDate, previousStock, newStock) VALUES (?, ?, ?, ?, ?, 'SALE_DEDUCTION', ?, ?, ?)"
    );
    if (!$stmt_log_stock) throw new Exception("Prepare statement for stock log failed: " . $conn->error);

    foreach ($data->items as $item) {
        if (!isset($item->productId) || !isset($item->quantity) || !isset($item->unitPrice)) {
            throw new Exception("Incomplete item data in sale.");
        }
        
        $productId = $item->productId;
        $quantity = (float)$item->quantity;
        $unitPrice = (float)$item->unitPrice;
        $totalPrice = $quantity * $unitPrice;
        $productName = $item->productName ?? 'N/A';
        
        // Insert sale item, using the integer $saleId
        $stmt_sale_item->bind_param("isdddd", $saleId, $productId, $productName, $quantity, $unitPrice, $totalPrice);
        if (!$stmt_sale_item->execute()) throw new Exception("Failed to save sale item '{$productName}': " . $stmt_sale_item->error);
        
        // Deduct stock and log it
        $product_details_res = $conn->query("SELECT stock FROM products WHERE id = '{$productId}' FOR UPDATE");
        if ($product_details_res->num_rows === 0) {
            throw new Exception("Product '{$productName}' not found for stock deduction.");
        }
        $product_row = $product_details_res->fetch_assoc();
        $previousStock = (float)$product_row['stock'];

        if ($previousStock < $quantity) {
            throw new Exception("Insufficient stock for product '{$productName}'. Required: {$quantity}, Available: {$previousStock}.");
        }

        $stmt_update_stock->bind_param("ds", $quantity, $productId);
        if (!$stmt_update_stock->execute()) throw new Exception("Failed to update stock for '{$productName}': " . $stmt_update_stock->error);

        $newStock = $previousStock - $quantity;
        $log_id = "log_sale_" . uniqid();
        $logNumber = "SALE-" . $saleId;
        // Use a negative number for the quantityAdjusted field in logs for deductions
        $adjusted_quantity_for_log = -$quantity;
        $stmt_log_stock->bind_param("ssssdsdd", $log_id, $logNumber, $productId, $productName, $adjusted_quantity_for_log, $saleDate, $previousStock, $newStock);
        if (!$stmt_log_stock->execute()) throw new Exception("Failed to log stock deduction for '{$productName}': " . $stmt_log_stock->error);
    }
    
    $stmt_sale_item->close();
    $stmt_update_stock->close();
    $stmt_log_stock->close();
    
    $conn->commit();
    http_response_code(201); // 201 Created
    echo json_encode(["success" => true, "message" => "Sale recorded successfully.", "saleId" => $saleId]);
    
} catch (Exception $e) {
    if ($transaction_started) {
        $conn->rollback();
    }
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Sale processing failed: " . $e->getMessage()]);
} finally {
    if (isset($conn)) {
        $conn->close();
    }
}
?>