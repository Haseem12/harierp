
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
    $data = json_decode(file_get_contents("php://input"));

    if (
        !isset($data->name) || empty(trim($data->name)) ||
        !isset($data->code) || empty(trim($data->code)) ||
        !isset($data->supplierType) || !in_array($data->supplierType, ['Cooperative', 'Individual'])
    ) {
        http_response_code(400);
        throw new Exception("Incomplete or invalid supplier data. Name, code, and type are required.");
    }
    
    $id = 'msup_' . uniqid();
    $name = trim($data->name);
    $code = trim($data->code);
    $supplierType = $data->supplierType;
    $phone = isset($data->phone) ? trim($data->phone) : null;
    $address = isset($data->address) ? trim($data->address) : null;
    $bankDetails = isset($data->bankDetails) ? trim($data->bankDetails) : null;
    $createdAt = date('Y-m-d H:i:s');
    
    // Cooperative-specific fields
    $registrationNumber = ($supplierType === 'Cooperative' && isset($data->registrationNumber)) ? trim($data->registrationNumber) : null;
    $chairmanName = ($supplierType === 'Cooperative' && isset($data->chairmanName)) ? trim($data->chairmanName) : null;
    $secretaryName = ($supplierType === 'Cooperative' && isset($data->secretaryName)) ? trim($data->secretaryName) : null;
    $memberCount = ($supplierType === 'Cooperative' && isset($data->memberCount) && is_numeric($data->memberCount)) ? (int)$data->memberCount : null;


    // Create table if it doesn't exist - Aligned with provided schema
    $create_table_sql = "CREATE TABLE IF NOT EXISTS milk_suppliers (
        id VARCHAR(50) PRIMARY KEY,
        supplier_type ENUM('Cooperative', 'Individual') NOT NULL,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(50) NOT NULL UNIQUE,
        phone VARCHAR(50) NULL,
        address TEXT NULL,
        bank_details TEXT NULL,
        registration_number VARCHAR(100) NULL,
        chairman_name VARCHAR(255) NULL,
        secretary_name VARCHAR(255) NULL,
        member_count INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );";

    if (!$conn->query($create_table_sql)) {
        throw new Exception("Failed to create milk_suppliers table: " . $conn->error);
    }
    
    $isUpdate = isset($data->id) && !empty($data->id);

    if ($isUpdate) {
        // UPDATE logic would go here
    } else {
        // INSERT new supplier
        $stmt = $conn->prepare("INSERT INTO milk_suppliers (id, supplier_type, name, code, phone, address, bank_details, registration_number, chairman_name, secretary_name, member_count, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        if (!$stmt) {
             throw new Exception("Prepare statement failed: " . $conn->error);
        }
        $stmt->bind_param("ssssssssssis", $id, $supplierType, $name, $code, $phone, $address, $bankDetails, $registrationNumber, $chairmanName, $secretaryName, $memberCount, $createdAt);
        
        if (!$stmt->execute()) {
            if ($conn->errno == 1062) { // Duplicate entry
                 throw new Exception("A supplier with this code already exists.");
            }
            throw new Exception("Failed to save supplier: " . $stmt->error);
        }
        
        http_response_code(201); // Created
        echo json_encode(["success" => true, "message" => "Milk supplier registered successfully.", "id" => $id]);
    }
    
    $stmt->close();

} catch (Exception $e) {
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
