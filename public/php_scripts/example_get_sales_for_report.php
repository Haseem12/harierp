<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Database credentials - REPLACE WITH YOUR ACTUAL CREDENTIALS
$servername = "localhost";
$username = "your_db_username";
$password = "your_db_password";
$dbname = "your_db_name";

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Connection failed: " . $conn->connect_error]);
    exit();
}

$sales_data = [];

// Fetch all sales
// Ensure your 'sales' table has relevant fields like id, saleDate, customerName, etc.
// This example focuses on fields relevant to the Net Sales Report.
$sql_sales = "SELECT id, saleDate FROM sales ORDER BY saleDate DESC"; // Add other fields as needed by your frontend
$result_sales = $conn->query($sql_sales);

if ($result_sales) {
    while ($sale_row = $result_sales->fetch_assoc()) {
        $sale_id = $sale_row['id'];
        $current_sale = [
            "id" => $sale_id,
            "saleDate" => $sale_row['saleDate'], // Ensure this is a valid date format (YYYY-MM-DD or YYYY-MM-DD HH:MM:SS)
            // Add other sale-level fields your frontend might use (e.g., customerName, status)
            "items" => []
        ];

        // Fetch items for the current sale from 'sale_items' table
        // Assumes sale_items has sale_id, productName, quantity, unitPrice
        $stmt_items = $conn->prepare("SELECT productName, quantity, unitPrice FROM sale_items WHERE sale_id = ?");
        if ($stmt_items) {
            $stmt_items->bind_param("s", $sale_id);
            $stmt_items->execute();
            $result_items = $stmt_items->get_result();
            
            while ($item_row = $result_items->fetch_assoc()) {
                $current_sale["items"][] = [
                    "productName" => $item_row['productName'],
                    "quantity" => (float)$item_row['quantity'], // Ensure quantity is a number
                    "unitPrice" => (float)$item_row['unitPrice'] // For completeness, though not strictly needed by this report
                    // Add productId if available and needed for other parts
                ];
            }
            $stmt_items->close();
        } else {
            // Log error or handle, e.g., "Failed to prepare statement for sale items"
            error_log("Failed to prepare statement for sale items for sale_id: " . $sale_id . " - " . $conn->error);
        }
        $sales_data[] = $current_sale;
    }
    $result_sales->close();
    echo json_encode(["success" => true, "data" => $sales_data]);
} else {
    echo json_encode(["success" => false, "message" => "Error fetching sales: " . $conn->error]);
}

$conn->close();
?>
