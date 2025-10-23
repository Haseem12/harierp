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

    if (
        !isset($data->userId) || empty(trim($data->userId)) ||
        !isset($data->oldPassword) || empty(trim($data->oldPassword)) ||
        !isset($data->newPassword) || empty(trim($data->newPassword))
    ) {
        http_response_code(400);
        throw new Exception("User ID, old password, and new password are required.");
    }
    
    $userId = trim($data->userId);
    $oldPassword = trim($data->oldPassword);
    $newPassword = trim($data->newPassword);

    // 1. Fetch current hashed password
    $stmt_get = $conn->prepare("SELECT password FROM users WHERE id = ?");
    $stmt_get->bind_param("s", $userId);
    $stmt_get->execute();
    $result = $stmt_get->get_result();
    
    if ($result->num_rows === 0) {
        http_response_code(404);
        throw new Exception("User not found.");
    }

    $user = $result->fetch_assoc();
    $currentHashedPassword = $user['password'];
    $stmt_get->close();

    // 2. Verify old password
    if (!password_verify($oldPassword, $currentHashedPassword)) {
        http_response_code(401); // Unauthorized
        throw new Exception("Incorrect old password.");
    }

    // 3. Hash and update new password
    $newHashedPassword = password_hash($newPassword, PASSWORD_BCRYPT);
    $stmt_update = $conn->prepare("UPDATE users SET password = ? WHERE id = ?");
    $stmt_update->bind_param("ss", $newHashedPassword, $userId);
    
    if (!$stmt_update->execute()) {
        throw new Exception("Failed to update password: " . $stmt_update->error);
    }
    $stmt_update->close();

    http_response_code(200);
    echo json_encode(["success" => true, "message" => "Password changed successfully."]);

} catch (Exception $e) {
    if (http_response_code() === 200) http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
} finally {
    if (isset($conn)) {
        $conn->close();
    }
}
?>
