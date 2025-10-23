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
    
    // --- Validation ---
    if (
        !isset($data->supplierId) || !isset($data->orderDate) || 
        !isset($data->items) || !is_array($data->items) || empty($data->items) ||
        !isset($data->totalCost)
    ) {
        http_response_code(400);
        throw new Exception("Incomplete PO data. Supplier, date, items, and total cost are required.");
    }
    
    $isUpdate = isset($data->id) && !empty($data->id);
    $poId = $isUpdate ? $data->id : 'po_' . uniqid();
    $poNumber = $data->poNumber ?? "PO-" . date("Ymd-His");

    // --- 1. Insert or Update Purchase Order ---
    if ($isUpdate) {
        $stmt_po = $conn->prepare(
            "UPDATE purchase_orders SET poNumber=?, orderDate=?, expectedDeliveryDate=?, supplierId=?, supplierName=?, subTotal=?, shippingCost=?, otherCharges=?, totalCost=?, status=?, notes=?, updatedAt=NOW() WHERE id=?"
        );
        $stmt_po->bind_param("sssssddddsss", 
            $poNumber, $data->orderDate, $data->expectedDeliveryDate, $data->supplierId, $data->supplierName,
            $data->subTotal, $data->shippingCost, $data->otherCharges, $data->totalCost, $data->status, $data->notes, $poId
        );
    } else {
        $stmt_po = $conn->prepare(
            "INSERT INTO purchase_orders (id, poNumber, orderDate, expectedDeliveryDate, supplierId, supplierName, subTotal, shippingCost, otherCharges, totalCost, status, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())"
        );
        $stmt_po->bind_param("ssssssddddss", 
            $poId, $poNumber, $data->orderDate, $data->expectedDeliveryDate, $data->supplierId, $data->supplierName,
            $data->subTotal, $data->shippingCost, $data->otherCharges, $data->totalCost, $data->status, $data->notes
        );
    }

    if (!$stmt_po->execute()) {
        throw new Exception("Failed to save purchase order record: " . $stmt_po->error);
    }
    $stmt_po->close();
    
    // --- 2. Handle Purchase Items ---
    if ($isUpdate) {
        $stmt_delete_items = $conn->prepare("DELETE FROM purchase_items WHERE purchaseOrderId = ?");
        $stmt_delete_items->bind_param("s", $poId);
        $stmt_delete_items->execute();
        $stmt_delete_items->close();
    }

    $stmt_po_item = $conn->prepare(
        "INSERT INTO purchase_items (id, purchaseOrderId, productName, category, quantity, unitOfMeasure, unitCost, totalCost) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    );
    
    foreach ($data->items as $item) {
        $itemId = 'pi_' . uniqid();
        $stmt_po_item->bind_param("ssssdsdd",
            $itemId, $poId, $item->productName, $item->category, $item->quantity, $item->unitOfMeasure, $item->unitCost, $item->totalCost
        );
        if (!$stmt_po_item->execute()) {
            throw new Exception("Failed to save PO item '{$item->productName}': " . $stmt_po_item->error);
        }
    }
    
    $stmt_po_item->close();
    
    $conn->commit();
    http_response_code($isUpdate ? 200 : 201);
    echo json_encode(["success" => true, "message" => "Purchase Order " . ($isUpdate ? "updated" : "created") . " successfully.", "id" => $poId, "poNumber" => $poNumber]);
    
} catch (Exception $e) {
    if ($conn->autocommit) {
        $conn->rollback();
    }
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "PO processing failed: " . $e->getMessage()]);
} finally {
    if (isset($conn)) {
        $conn->close();
    }
}
?>