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

    if (!isset($data->userId) || empty(trim($data->userId))) {
        http_response_code(400);
        throw new Exception("User ID is required to reset a password.");
    }
    
    $userId = trim($data->userId);
    $defaultPassword = "password123"; // The new default password

    // Hash the default password
    $newHashedPassword = password_hash($defaultPassword, PASSWORD_BCRYPT);
    
    // Update the user's password
    $stmt_update = $conn->prepare("UPDATE users SET password = ? WHERE id = ?");
    $stmt_update->bind_param("ss", $newHashedPassword, $userId);
    
    if (!$stmt_update->execute()) {
        throw new Exception("Failed to reset password: " . $stmt_update->error);
    }
    
    if ($stmt_update->affected_rows === 0) {
        http_response_code(404);
        throw new Exception("User with ID '{$userId}' not found.");
    }

    $stmt_update->close();

    http_response_code(200);
    echo json_encode(["success" => true, "message" => "Password has been reset to the default 'password123'."]);

} catch (Exception $e) {
    if (http_response_code() === 200) http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
} finally {
    if (isset($conn)) {
        $conn->close();
    }
}
?>
