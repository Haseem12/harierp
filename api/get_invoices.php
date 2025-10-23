<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

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
    $sql = "SELECT id, saleId, invoiceNumber, issueDate, dueDate, customerId, customerName, customerEmail, customerAddress, customerPriceLevel, subTotal, discountAmount, taxAmount, totalAmount, status, notes, companyName, companyAddress, companyPhone, companyEmail, companyLogoUrl, createdAt, updatedAt FROM invoices ORDER BY issueDate DESC";
    
    $result = $conn->query($sql);

    if (!$result) {
        throw new Exception("Query failed: " . $conn->error);
    }

    $invoices = [];
    while ($row = $result->fetch_assoc()) {
        // Construct the nested customer and companyDetails objects
        $row['customer'] = [
            'id' => $row['customerId'],
            'name' => $row['customerName'],
            'email' => $row['customerEmail'],
            'address' => $row['customerAddress'],
            'priceLevel' => $row['customerPriceLevel'],
        ];

        $row['companyDetails'] = [
            'name' => $row['companyName'],
            'address' => $row['companyAddress'],
            'phone' => $row['companyPhone'],
            'email' => $row['companyEmail'],
            'logoUrl' => $row['companyLogoUrl'],
        ];
        
        // Fetch invoice items
        $invoiceId = $row['id'];
        $items_sql = "SELECT productId, productName, quantity, unitPrice, totalPrice, unitOfMeasure FROM invoice_items WHERE invoiceId = ?";
        $stmt_items = $conn->prepare($items_sql);
        $stmt_items->bind_param("s", $invoiceId);
        $stmt_items->execute();
        $items_result = $stmt_items->get_result();
        
        $items = [];
        while ($item_row = $items_result->fetch_assoc()) {
            $items[] = $item_row;
        }
        $stmt_items->close();

        $row['items'] = $items;
        
        // Unset the flat fields that have been nested
        unset($row['customerId'], $row['customerName'], $row['customerEmail'], $row['customerAddress'], $row['customerPriceLevel']);
        unset($row['companyName'], $row['companyAddress'], $row['companyPhone'], $row['companyEmail'], $row['companyLogoUrl']);

        $invoices[] = $row;
    }

    http_response_code(200);
    echo json_encode(["success" => true, "data" => $invoices]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "An error occurred: " . $e->getMessage()]);
} finally {
    if (isset($conn)) {
        $conn->close();
    }
}
?>
