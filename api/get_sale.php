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

$saleId = isset($_GET['id']) ? (int)$_GET['id'] : null;

if ($saleId === null) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Sale ID is required."]);
    exit();
}

try {
    // Fetch the main sale record using all columns from your schema
    $stmt_sale = $conn->prepare("SELECT id, invoiceId, saleDate, customerId, customerName, customerEmail, customerAddress, customerPriceLevel, subTotal, discountAmount, taxAmount, totalAmount, paymentMethod, status, notes, createdAt, updatedAt FROM sales WHERE id = ?");
    if (!$stmt_sale) {
        throw new Exception("Prepare statement for sale failed: " . $conn->error);
    }
    $stmt_sale->bind_param("i", $saleId);
    $stmt_sale->execute();
    $result_sale = $stmt_sale->get_result();

    if ($result_sale->num_rows === 0) {
        http_response_code(404);
        throw new Exception("Sale with ID '{$saleId}' not found.");
    }
    
    $sale = $result_sale->fetch_assoc();
    $stmt_sale->close();
    
    // Construct the nested customer object for frontend compatibility
    $sale['customer'] = [
        'id' => $sale['customerId'],
        'name' => $sale['customerName'],
        'email' => $sale['customerEmail'],
        'address' => $sale['customerAddress'],
        'priceLevel' => $sale['customerPriceLevel'],
    ];

    // Fetch sale items associated with this sale
    $stmt_items = $conn->prepare("SELECT productId, productName, quantity, unitPrice, totalPrice, unitOfMeasure FROM sale_items WHERE sale_id = ?");
    if (!$stmt_items) {
        throw new Exception("Prepare statement for sale items failed: " . $conn->error);
    }
    $stmt_items->bind_param("i", $saleId);
    $stmt_items->execute();
    $items_result = $stmt_items->get_result();
    
    $items = [];
    while ($item_row = $items_result->fetch_assoc()) {
        $items[] = $item_row;
    }
    $stmt_items->close();

    $sale['items'] = $items;
    
    // Unset the flat customer fields as they are now nested
    unset($sale['customerId'], $sale['customerName'], $sale['customerEmail'], $sale['customerAddress'], $sale['customerPriceLevel']);

    http_response_code(200);
    echo json_encode(["success" => true, "data" => $sale]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "An error occurred while fetching sale details: " . $e->getMessage()]);
} finally {
    if (isset($conn)) {
        $conn->close();
    }
}
?>
    