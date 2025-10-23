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
    $sql = "SELECT id, invoiceId, saleDate, customerId, customerName, customerEmail, customerAddress, customerPriceLevel, subTotal, discountAmount, taxAmount, totalAmount, paymentMethod, status, notes, createdAt FROM sales ORDER BY saleDate DESC";
    
    $result = $conn->query($sql);

    if (!$result) {
        throw new Exception("Query failed: " . $conn->error);
    }

    $sales = [];
    while ($row = $result->fetch_assoc()) {
        // Construct the nested customer object for frontend compatibility
        $row['customer'] = [
            'id' => $row['customerId'],
            'name' => $row['customerName'],
            'email' => $row['customerEmail'],
            'address' => $row['customerAddress'],
            'priceLevel' => $row['customerPriceLevel'],
        ];

        // Fetch sale items associated with this sale
        $saleId = (int)$row['id'];
        $items_sql = "SELECT productId, productName, quantity, unitPrice, totalPrice, unitOfMeasure FROM sale_items WHERE sale_id = ?";
        $stmt_items = $conn->prepare($items_sql);
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

        $row['items'] = $items;
        
        // Unset the flat customer fields if they are not needed at the top level
        unset($row['customerId'], $row['customerName'], $row['customerEmail'], $row['customerAddress'], $row['customerPriceLevel']);
        
        $sales[] = $row;
    }

    http_response_code(200);
    echo json_encode(["success" => true, "data" => $sales]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "An error occurred: " . $e->getMessage()]);
} finally {
    if (isset($conn)) {
        $conn->close();
    }
}
?>
    