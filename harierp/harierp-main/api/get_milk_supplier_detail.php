
<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

// --- Database Connection ---
$servername = "localhost";
$username = "your_db_username";
$password = "your_db_password";
$dbname = "your_db_name";

try {
    $conn = new mysqli($servername, $username, $password, $dbname);

    if ($conn->connect_error) {
        throw new Exception("Database connection failed: " . $conn->connect_error);
    }

    // --- Get ID from query parameter ---
    $supplier_id = isset($_GET['id']) ? $_GET['id'] : null;

    if (!$supplier_id) {
        http_response_code(400); // Bad Request
        throw new Exception("Supplier ID is required.");
    }

    // --- Fetch Specific Milk Supplier ---
    // Select all columns as per your schema
    $stmt = $conn->prepare("SELECT 
                                id, supplier_type, name, code, phone, address, 
                                bank_details, registration_number, chairman_name, 
                                secretary_name, member_count, created_at, updated_at 
                            FROM milk_suppliers
                            WHERE id = ?");
    if (!$stmt) {
        throw new Exception("Prepare statement failed: " . $conn->error);
    }

    $stmt->bind_param("s", $supplier_id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $supplier = $result->fetch_assoc();
        // Ensure numeric types are correctly cast
        $supplier['member_count'] = isset($supplier['member_count']) ? (int)$supplier['member_count'] : null;
        
        http_response_code(200);
        echo json_encode(["success" => true, "data" => $supplier]);
    } else {
        http_response_code(404);
        echo json_encode(["success" => false, "message" => "Supplier with ID '{$supplier_id}' not found."]);
    }

    $stmt->close();

} catch (Exception $e) {
    // Check if status code has already been set, otherwise default to 500
    if (http_response_code() === 200) {
        http_response_code(500);
    }
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
} finally {
    if (isset($conn)) {
        $conn->close();
    }
}
?>
