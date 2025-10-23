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
    $data = json_decode(file_get_contents("php://input"));

    if (!isset($data->users) || !is_array($data->users)) {
        http_response_code(400);
        throw new Exception("Invalid input: 'users' array is required.");
    }
    
    $conn->begin_transaction();

    $stmt = $conn->prepare("UPDATE users SET isActive = ? WHERE id = ?");

    foreach ($data->users as $user) {
        if (!isset($user->id) || !isset($user->isActive)) {
            throw new Exception("Invalid user object in array. Each user must have 'id' and 'isActive' properties.");
        }
        $userId = $user->id;
        $isActive = (bool)$user->isActive;
        
        $stmt->bind_param("is", $isActive, $userId);
        if (!$stmt->execute()) {
            throw new Exception("Failed to update user '{$userId}': " . $stmt->error);
        }
    }
    
    $stmt->close();
    $conn->commit();

    http_response_code(200);
    echo json_encode(["success" => true, "message" => "User activation settings updated successfully."]);

} catch (Exception $e) {
    if ($conn->autocommit === false) {
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
