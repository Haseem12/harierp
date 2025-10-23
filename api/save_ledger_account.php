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
    
    // Basic validation
    if (empty($data->name) || empty($data->accountCode) || empty($data->accountType)) {
        http_response_code(400);
        throw new Exception("Name, Account Code, and Account Type are required.");
    }
    
    $name = trim($data->name);
    $accountCode = trim($data->accountCode);
    $accountType = trim($data->accountType);
    $priceLevel = $data->priceLevel ?? 'DEFAULT';
    $zone = $data->zone ?? 'N/A';
    $creditPeriod = isset($data->creditPeriod) ? (int)$data->creditPeriod : 0;
    $creditLimit = isset($data->creditLimit) ? (float)$data->creditLimit : 0;
    $address = $data->address ?? '';
    $phone = $data->phone ?? '';
    $bankDetails = $data->bankDetails ?? '';
    $updatedAt = date('Y-m-d H:i:s');
    
    $isUpdate = isset($data->id) && !empty($data->id);

    if ($isUpdate) {
        $id = $data->id;
        $stmt = $conn->prepare("UPDATE ledger_accounts SET name=?, accountCode=?, priceLevel=?, zone=?, creditPeriod=?, creditLimit=?, address=?, phone=?, accountType=?, bankDetails=?, updatedAt=? WHERE id=?");
        $stmt->bind_param("ssssidssssss", $name, $accountCode, $priceLevel, $zone, $creditPeriod, $creditLimit, $address, $phone, $accountType, $bankDetails, $updatedAt, $id);
    } else {
        $id = 'la_' . uniqid(); // Generate a unique ID for new records
        $createdAt = date('Y-m-d H:i:s');
        $stmt = $conn->prepare("INSERT INTO ledger_accounts (id, name, accountCode, priceLevel, zone, creditPeriod, creditLimit, address, phone, accountType, bankDetails, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("sssssidssssss", $id, $name, $accountCode, $priceLevel, $zone, $creditPeriod, $creditLimit, $address, $phone, $accountType, $bankDetails, $createdAt, $updatedAt);
    }
    
    if (!$stmt->execute()) {
        if ($conn->errno == 1062) { // Handle duplicate entry error
            throw new Exception("An account with this code ({$accountCode}) may already exist.");
        }
        throw new Exception("General error: Insert/Update failed. " . $stmt->error);
    }
    
    if ($stmt->affected_rows === 0 && $isUpdate) {
        // This is not a fatal error for updates, but good to know
    }

    $stmt->close();
    
    $conn->commit();
    
    http_response_code($isUpdate ? 200 : 201); // 201 Created for new entries
    echo json_encode(["success" => true, "message" => "Ledger account " . ($isUpdate ? "updated" : "created") . " successfully.", "id" => $id]);

} catch (Exception $e) {
    if ($conn->autocommit) {
        $conn->rollback();
    }
    http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
} finally {
    if (isset($conn)) {
        $conn->close();
    }
}
?>