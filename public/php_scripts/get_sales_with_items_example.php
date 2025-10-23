
<?php
header("Access-Control-Allow-Origin: *"); // Allow requests from any origin (adjust for production)
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

// Database credentials (replace with your actual credentials)
$servername = "localhost";
$username = "your_db_username";
$password = "your_db_password";
$dbname = "your_db_name";

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Connection failed: " . $conn->connect_error
    ]);
    exit();
}

$sales_data = [];
$error_message = null;

try {
    // Fetch all sales from the 'sales' table
    // Adjust columns as per your 'sales' table structure
    $sql_sales = "SELECT id, saleDate, customerId, customerName, customerEmail, customerAddress, customerPriceLevel, subTotal, discountAmount, taxAmount, totalAmount, paymentMethod, status, notes, createdAt, updatedAt, invoiceId FROM sales ORDER BY saleDate DESC";
    $result_sales = $conn->query($sql_sales);

    if ($result_sales) {
        while ($sale_row = $result_sales->fetch_assoc()) {
            $sale_id = $sale_row['id'];
            $sale_items = [];

            // Fetch items for the current sale from 'sale_items' table
            $sql_items = "SELECT id, productId, productName, quantity, unitPrice FROM sale_items WHERE sale_id = ?";
            $stmt_items = $conn->prepare($sql_items);
            if (!$stmt_items) {
                 throw new Exception("Prepare statement failed (items): " . $conn->error);
            }
            $stmt_items->bind_param("s", $sale_id);
            $stmt_items->execute();
            $result_items = $stmt_items->get_result();

            if ($result_items) {
                while ($item_row = $result_items->fetch_assoc()) {
                    $quantity = (float)($item_row['quantity'] ?? 0);
                    $unitPrice = (float)($item_row['unitPrice'] ?? 0);
                    $sale_items[] = [
                        "id" => $item_row['id'],
                        "productId" => $item_row['productId'],
                        "productName" => $item_row['productName'],
                        "quantity" => $quantity,
                        "unitPrice" => $unitPrice,
                        "totalPrice" => $quantity * $unitPrice // Calculate totalPrice
                        // unitOfMeasure can be joined from products table if needed
                    ];
                }
            } else {
                 throw new Exception("Query failed (items): " . $stmt_items->error);
            }
            $stmt_items->close();

            // Construct the customer object for the sale
            // This assumes customerId and customerName are directly in the sales table.
            // If customer details are in a separate table, you'd join or do another lookup.
            $customer_details = [
                "id" => $sale_row['customerId'] ?? null,
                "name" => $sale_row['customerName'] ?? 'N/A',
                // Add other customer fields if they are part of your Sale['customer'] type
                // e.g., "email" => $sale_row['customerEmail'] ?? null,
                // "address" => $sale_row['customerAddress'] ?? null,
                "priceLevel" => $sale_row['customerPriceLevel'] ?? null
            ];
            
            $sales_data[] = [
                "id" => $sale_row['id'],
                "invoiceId" => $sale_row['invoiceId'] ?? null,
                "saleDate" => $sale_row['saleDate'], // Ensure this is a DATETIME/TIMESTAMP format parsable by JS new Date()
                "customer" => $customer_details,
                "items" => $sale_items,
                "subTotal" => (float)($sale_row['subTotal'] ?? 0),
                "discountAmount" => isset($sale_row['discountAmount']) ? (float)$sale_row['discountAmount'] : null,
                "taxAmount" => (float)($sale_row['taxAmount'] ?? 0),
                "totalAmount" => (float)($sale_row['totalAmount'] ?? 0),
                "paymentMethod" => $sale_row['paymentMethod'],
                "status" => $sale_row['status'],
                "notes" => $sale_row['notes'] ?? null,
                "createdAt" => $sale_row['createdAt'],
                "updatedAt" => $sale_row['updatedAt'] ?? null
            ];
        }
        $result_sales->free();
    } else {
        throw new Exception("Query failed (sales): " . $conn->error);
    }

    echo json_encode([
        "success" => true,
        "data" => $sales_data
        // You can add pagination info here if needed
        // "pagination" => [ "total" => count($sales_data), "page" => 1, "limit" => count($sales_data) ]
    ]);

} catch (Exception $e) {
    $error_message = $e->getMessage();
    http_response_code(500); // Internal Server Error
    echo json_encode([
        "success" => false,
        "message" => "An error occurred: " . $error_message
    ]);
}

$conn->close();
?>
