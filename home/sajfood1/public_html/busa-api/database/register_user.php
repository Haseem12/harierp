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
        !isset($data->username) || empty(trim($data->username)) ||
        !isset($data->password) || empty(trim($data->password)) ||
        !isset($data->role) || empty(trim($data->role))
    ) {
        http_response_code(400);
        throw new Exception("Username, password, and role are required.");
    }

    $id = 'user_' . uniqid();
    $name = trim($data->username);
    $rawPassword = trim($data->password);
    $role = trim($data->role);

    // Hash the password for secure storage
    $hashedPassword = password_hash($rawPassword, PASSWORD_BCRYPT);

    $stmt_check = $conn->prepare("SELECT id FROM users WHERE name = ?");
    $stmt_check->bind_param("s", $name);
    $stmt_check->execute();
    if ($stmt_check->get_result()->num_rows > 0) {
        http_response_code(409); // Conflict
        throw new Exception("A user with this username already exists.");
    }
    $stmt_check->close();

    $stmt_insert = $conn->prepare("INSERT INTO users (id, name, password, role) VALUES (?, ?, ?, ?)");
    $stmt_insert->bind_param("ssss", $id, $name, $hashedPassword, $role);

    if (!$stmt_insert->execute()) {
        throw new Exception("Failed to register user: " . $stmt_insert->error);
    }
    $stmt_insert->close();

    http_response_code(201); // Created
    echo json_encode(["success" => true, "message" => "User registered successfully.", "userId" => $id]);

} catch (Exception $e) {
    if (http_response_code() === 200) { // If no specific error code was set
        http_response_code(500);
    }
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
} finally {
    if (isset($conn)) {
        $conn->close();
    }
}
?>
