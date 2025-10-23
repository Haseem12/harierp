<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

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

$invoice_id = isset($_GET['id']) ? (int)$_GET['id'] : null;

if ($invoice_id === null) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Invoice ID is required."]);
    exit();
}

try {
    // Fetch the main invoice record
    $stmt_invoice = $conn->prepare("SELECT id, saleId, invoiceNumber, issueDate, dueDate, customerId, customerName, customerEmail, customerAddress, customerPriceLevel, subTotal, discountAmount, taxAmount, totalAmount, status, notes, companyName, companyAddress, companyPhone, companyEmail, companyLogoUrl, createdAt, updatedAt FROM invoices WHERE id = ?");
    if (!$stmt_invoice) {
        throw new Exception("Prepare statement for invoice failed: " . $conn->error);
    }
    $stmt_invoice->bind_param("i", $invoice_id);
    $stmt_invoice->execute();
    $result_invoice = $stmt_invoice->get_result();

    if ($result_invoice->num_rows === 0) {
        http_response_code(404);
        throw new Exception("Invoice with ID '{$invoice_id}' not found.");
    }
    
    $invoice = $result_invoice->fetch_assoc();
    $stmt_invoice->close();
    
    // Construct the nested customer and companyDetails objects
    $invoice['customer'] = [
        'id' => $invoice['customerId'],
        'name' => $invoice['customerName'],
        'email' => $invoice['customerEmail'],
        'address' => $invoice['customerAddress'],
        'priceLevel' => $invoice['customerPriceLevel'],
    ];

    $invoice['companyDetails'] = [
        'name' => $invoice['companyName'],
        'address' => $invoice['companyAddress'],
        'phone' => $invoice['companyPhone'],
        'email' => $invoice['companyEmail'],
        'logoUrl' => $invoice['companyLogoUrl'],
    ];

    // Fetch invoice items associated with this invoice
    $stmt_items = $conn->prepare("SELECT productId, productName, quantity, unitPrice, totalPrice, unitOfMeasure FROM invoice_items WHERE invoiceId = ?");
    if (!$stmt_items) {
        throw new Exception("Prepare statement for invoice items failed: " . $conn->error);
    }
    $stmt_items->bind_param("i", $invoice_id);
    $stmt_items->execute();
    $items_result = $stmt_items->get_result();
    
    $items = [];
    while ($item_row = $items_result->fetch_assoc()) {
        $items[] = $item_row;
    }
    $stmt_items->close();

    $invoice['items'] = $items;
    
    // Unset the flat fields that have been nested
    unset($invoice['customerId'], $invoice['customerName'], $invoice['customerEmail'], $invoice['customerAddress'], $invoice['customerPriceLevel']);
    unset($invoice['companyName'], $invoice['companyAddress'], $invoice['companyPhone'], $invoice['companyEmail'], $invoice['companyLogoUrl']);

    http_response_code(200);
    echo json_encode(["success" => true, "data" => $invoice]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "An error occurred while fetching invoice details: " . $e->getMessage()]);
} finally {
    if (isset($conn)) {
        $conn->close();
    }
}
?>
    