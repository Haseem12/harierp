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
$username = "sajfood1_busa";
$password = "Haseem1234@";
$dbname = "sajfood1_busa-app";

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Database connection failed: " . $conn->connect_error]);
    exit();
}

try {
    $conn->begin_transaction();
    
    $data = json_decode(file_get_contents("php://input"));
    
    if (!isset($data->purchaseOrderId) || empty(trim($data->purchaseOrderId))) {
        http_response_code(400);
        throw new Exception("Purchase Order ID is required.");
    }
    
    $purchaseOrderId = trim($data->purchaseOrderId);

    // 1. Fetch PO and its items, and check status
    $stmt_get_po = $conn->prepare("SELECT status FROM purchase_orders WHERE id = ? FOR UPDATE");
    $stmt_get_po->bind_param("s", $purchaseOrderId);
    $stmt_get_po->execute();
    $po_result = $stmt_get_po->get_result();
    if ($po_result->num_rows === 0) {
        throw new Exception("Purchase Order with ID '{$purchaseOrderId}' not found.");
    }
    $po = $po_result->fetch_assoc();
    if ($po['status'] === 'Received') {
        throw new Exception("This Purchase Order has already been marked as received.");
    }
    $stmt_get_po->close();

    $stmt_get_items = $conn->prepare("SELECT productName, category, quantity, unitOfMeasure, unitCost FROM purchase_items WHERE purchaseOrderId = ?");
    $stmt_get_items->bind_param("s", $purchaseOrderId);
    $stmt_get_items->execute();
    $items_result = $stmt_get_items->get_result();
    
    $items = [];
    while ($item_row = $items_result->fetch_assoc()) {
        $items[] = $item_row;
    }
    $stmt_get_items->close();
    
    if (empty($items)) {
        throw new Exception("No items found for this Purchase Order.");
    }

    // 2. Process each item: find or create item in purch_items and update stock
    $stmt_find_item = $conn->prepare("SELECT id, stock FROM purchase_items WHERE name = ? OR sku = ?");
    $stmt_update_stock = $conn->prepare("UPDATE purchase_items SET stock = stock + ? WHERE id = ?");
    $stmt_create_item = $conn->prepare(
        "INSERT INTO purchase_items (id, name, sku, category, unitOfMeasure, costPrice, stock, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())"
    );

    foreach ($items as $item) {
        $productName = $item['productName'];
        $sku = 'SKU-' . strtoupper(substr(preg_replace('/[^a-zA-Z0-9]/', '', $productName), 0, 8)) . '-' . rand(100,999);
        $quantity = (float)$item['quantity'];
        
        $stmt_find_item->bind_param("ss", $productName, $sku);
        $stmt_find_item->execute();
        $item_result = $stmt_find_item->get_result();

        $itemId = null;
        if ($item_result->num_rows > 0) {
            // Item exists, update stock
            $db_item = $item_result->fetch_assoc();
            $itemId = $db_item['id'];
            $stmt_update_stock->bind_param("ds", $quantity, $itemId);
            if (!$stmt_update_stock->execute()) {
                throw new Exception("Failed to update stock for existing item '{$productName}'.");
            }
        } else {
            // Item does not exist, create it
            $itemId = 'purch_item_' . uniqid();
            $stmt_create_item->bind_param(
                "sssssdd",
                $itemId,
                $productName,
                $sku,
                $item['category'],
                $item['unitOfMeasure'],
                $item['unitCost'],
                $quantity
            );
            if (!$stmt_create_item->execute()) {
                throw new Exception("Failed to create new item '{$productName}'.");
            }
        }
        $item_result->close();
    }
    
    $stmt_find_item->close();
    $stmt_update_stock->close();
    $stmt_create_item->close();

    // 3. Update the Purchase Order status to 'Received'
    $stmt_update_po_status = $conn->prepare("UPDATE purchase_orders SET status = 'Received', updatedAt = NOW() WHERE id = ?");
    $stmt_update_po_status->bind_param("s", $purchaseOrderId);
    if (!$stmt_update_po_status->execute()) {
        throw new Exception("Failed to update Purchase Order status.");
    }
    $stmt_update_po_status->close();

    $conn->commit();
    http_response_code(200);
    echo json_encode(["success" => true, "message" => "Purchase Order items successfully received and stock updated."]);

} catch (Exception $e) {
    if ($conn->autocommit) {
        $conn->rollback();
    }
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "An error occurred: " . $e->getMessage()]);
} finally {
    if (isset($conn)) {
        $conn->close();
    }
}
?>