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
        !isset($data->customerId) || !isset($data->issueDate) || !isset($data->dueDate) ||
        !isset($data->items) || !is_array($data->items) || empty($data->items) ||
        !isset($data->totalAmount)
    ) {
        http_response_code(400);
        throw new Exception("Incomplete invoice data. Customer, dates, items, and total amount are required.");
    }
    
    $isUpdate = isset($data->id) && !empty($data->id);
    $invoiceId = $isUpdate ? (int)$data->id : null;
    $invoiceNumber = $data->invoiceNumber ?? "INV-" . date("Ymd");

    // Get customer data from the payload
    $customerId = $data->customerId;
    $customerName = $data->customerName ?? 'N/A';
    $customerAddress = $data->customerAddress ?? '';
    $customerEmail = $data->customerEmail ?? '';
    $customerPriceLevel = $data->customerPriceLevel ?? 'DEFAULT';

    // Get company data from the payload
    $companyName = $data->companyDetails->name ?? 'Hari Industries Limited';
    $companyAddress = $data->companyDetails->address ?? 'N/A';
    $companyPhone = $data->companyDetails->phone ?? '';
    $companyEmail = $data->companyDetails->email ?? '';
    $companyLogoUrl = $data->companyDetails->logoUrl ?? '';

    $issueDate = $data->issueDate;
    $dueDate = $data->dueDate;
    $subTotal = (float)($data->subTotal ?? 0);
    $discountAmount = (float)($data->discountAmount ?? 0);
    $taxAmount = (float)($data->taxAmount ?? 0);
    $totalAmount = (float)($data->totalAmount ?? 0);
    $status = $data->status ?? 'Draft';
    $notes = $data->notes ?? '';
    $saleId = $data->saleId ?? null;
    $updatedAt = date('Y-m-d H:i:s');
    
    // --- 1. Insert or Update Invoice ---
    if ($isUpdate) {
        $stmt_invoice = $conn->prepare(
            "UPDATE invoices SET invoiceNumber=?, customerId=?, issueDate=?, dueDate=?, subTotal=?, discountAmount=?, taxAmount=?, totalAmount=?, status=?, notes=?, customerName=?, customerAddress=?, customerEmail=?, customerPriceLevel=?, companyName=?, companyAddress=?, companyPhone=?, companyEmail=?, companyLogoUrl=?, updatedAt=? WHERE id=?"
        );
        if (!$stmt_invoice) throw new Exception("Prepare statement for invoice update failed: " . $conn->error);
        $stmt_invoice->bind_param("ssssddddssssssssssssi", $invoiceNumber, $customerId, $issueDate, $dueDate, $subTotal, $discountAmount, $taxAmount, $totalAmount, $status, $notes, $customerName, $customerAddress, $customerEmail, $customerPriceLevel, $companyName, $companyAddress, $companyPhone, $companyEmail, $companyLogoUrl, $updatedAt, $invoiceId);
    } else {
        $createdAt = date('Y-m-d H:i:s');
        $stmt_invoice = $conn->prepare(
            "INSERT INTO invoices (invoiceNumber, saleId, customerId, issueDate, dueDate, subTotal, discountAmount, taxAmount, totalAmount, status, notes, customerName, customerAddress, customerEmail, customerPriceLevel, companyName, companyAddress, companyPhone, companyEmail, companyLogoUrl, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        );
        if (!$stmt_invoice) throw new Exception("Prepare statement for new invoice failed: " . $conn->error);
        $stmt_invoice->bind_param("sisssddddsssssssssssss", $invoiceNumber, $saleId, $customerId, $issueDate, $dueDate, $subTotal, $discountAmount, $taxAmount, $totalAmount, $status, $notes, $customerName, $customerAddress, $customerEmail, $customerPriceLevel, $companyName, $companyAddress, $companyPhone, $companyEmail, $companyLogoUrl, $createdAt, $updatedAt);
    }

    if (!$stmt_invoice->execute()) {
        throw new Exception("Failed to save invoice record: " . $stmt_invoice->error);
    }
    
    if (!$isUpdate) {
        $invoiceId = $conn->insert_id; // Get the auto-incremented integer ID
        $invoiceNumber = $invoiceNumber . "-" . $invoiceId;
        $stmt_update_inv_num = $conn->prepare("UPDATE invoices SET invoiceNumber = ? WHERE id = ?");
        $stmt_update_inv_num->bind_param("si", $invoiceNumber, $invoiceId);
        $stmt_update_inv_num->execute();
        $stmt_update_inv_num->close();
    }
    $stmt_invoice->close();
    
    // --- 2. Handle Invoice Items ---
    if ($isUpdate) {
        $stmt_delete_items = $conn->prepare("DELETE FROM invoice_items WHERE invoiceId = ?");
        $stmt_delete_items->bind_param("i", $invoiceId);
        $stmt_delete_items->execute();
        $stmt_delete_items->close();
    }

    $stmt_invoice_item = $conn->prepare(
        "INSERT INTO invoice_items (invoiceId, productId, productName, quantity, unitPrice, totalPrice, unitOfMeasure) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    if (!$stmt_invoice_item) throw new Exception("Prepare statement for invoice items failed: " . $conn->error);
    
    foreach ($data->items as $item) {
        if (!isset($item->productId) || !isset($item->quantity) || !isset($item->unitPrice)) {
            throw new Exception("Incomplete item data in invoice.");
        }
        
        $productId = $item->productId;
        $quantity = (float)$item->quantity;
        $unitPrice = (float)$item->unitPrice;
        $totalPrice = $quantity * $unitPrice;
        $productName = $item->productName ?? 'N/A';
        $unitOfMeasure = $item->unitOfMeasure ?? 'PCS';
        
        $stmt_invoice_item->bind_param("isidds", $invoiceId, $productId, $productName, $quantity, $unitPrice, $totalPrice, $unitOfMeasure);
        if (!$stmt_invoice_item->execute()) throw new Exception("Failed to save invoice item '{$productName}': " . $stmt_invoice_item->error);
    }
    
    $stmt_invoice_item->close();

    // If this invoice is being generated from a sale, update the sale record with the new invoice ID
    if ($saleId && !$isUpdate) {
        $stmt_update_sale = $conn->prepare("UPDATE sales SET invoiceId = ? WHERE id = ?");
        if (!$stmt_update_sale) throw new Exception("Prepare statement for updating sale failed: " . $conn->error);
        $stmt_update_sale->bind_param("ii", $invoiceId, $saleId);
        $stmt_update_sale->execute();
        $stmt_update_sale->close();
    }
    
    $conn->commit();
    http_response_code($isUpdate ? 200 : 201);
    echo json_encode(["success" => true, "message" => "Invoice " . ($isUpdate ? "updated" : "created") . " successfully.", "id" => $invoiceId, "invoiceNumber" => $invoiceNumber]);
    
} catch (Exception $e) {
    if ($conn->autocommit) {
        $conn->rollback();
    }
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Invoice processing failed: " . $e->getMessage()]);
} finally {
    if (isset($conn)) {
        $conn->close();
    }
}
?>
    