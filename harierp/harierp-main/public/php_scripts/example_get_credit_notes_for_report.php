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

$credit_notes_data = [];

// Fetch all credit notes
// This example assumes 'items' is stored as a JSON string in the 'credit_notes' table.
// If items are in a separate 'credit_note_items' table, you'd query that table similarly to how sales items are fetched.
$sql_credit_notes = "SELECT id, creditNoteDate, reason, items FROM credit_notes ORDER BY creditNoteDate DESC";
$result_credit_notes = $conn->query($sql_credit_notes);

if ($result_credit_notes) {
    while ($cn_row = $result_credit_notes->fetch_assoc()) {
        $items_array = [];
        if (!empty($cn_row['items'])) {
            $decoded_items = json_decode($cn_row['items'], true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded_items)) {
                foreach ($decoded_items as $item) {
                    $items_array[] = [
                        "productName" => isset($item['productName']) ? $item['productName'] : 'Unknown Product',
                        "quantity" => isset($item['quantity']) ? (float)$item['quantity'] : 0, // Ensure quantity is a number
                        "unitPrice" => isset($item['unitPrice']) ? (float)$item['unitPrice'] : 0 // For completeness
                        // Add productId if available
                    ];
                }
            } else {
                // Log error if items string is not valid JSON or not an array
                error_log("Failed to decode items JSON for credit_note_id: " . $cn_row['id'] . ". JSON Error: " . json_last_error_msg() . ". Items string: " . $cn_row['items']);
            }
        }

        $credit_notes_data[] = [
            "id" => $cn_row['id'],
            "creditNoteDate" => $cn_row['creditNoteDate'], // Ensure this is a valid date format (YYYY-MM-DD or YYYY-MM-DD HH:MM:SS)
            "reason" => $cn_row['reason'],
            "items" => $items_array
            // Add other credit note-level fields your frontend might use
        ];
    }
    $result_credit_notes->close();
    echo json_encode(["success" => true, "data" => $credit_notes_data]);
} else {
    echo json_encode(["success" => false, "message" => "Error fetching credit notes: " . $conn->error]);
}

$conn->close();
?>
