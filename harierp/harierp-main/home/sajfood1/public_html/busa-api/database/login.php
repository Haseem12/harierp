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

// --- Helper function for logging failed attempts ---
function log_failed_login($username, $reason) {
    $log_file = 'failed_logins.log'; // Log file in the same directory
    $ip_address = $_SERVER['REMOTE_ADDR'];
    $timestamp = date('Y-m-d H:i:s');
    $log_message = "{$timestamp} | IP: {$ip_address} | Attempted Username: '{$username}' | Reason: {$reason}\n";
    
    // Append to the log file
    file_put_contents($log_file, $log_message, FILE_APPEND);
}

$servername = "localhost";
$username_db = "sajfood1_busa";
$password_db = "Haseem1234@";
$dbname = "sajfood1_busa-app";

$conn = new mysqli($servername, $username_db, $password_db, $dbname);

if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Database connection failed: " . $conn->connect_error]);
    exit();
}

try {
    $data = json_decode(file_get_contents("php://input"));

    if (
        !isset($data->username) || empty(trim($data->username)) ||
        !isset($data->password) || empty(trim($data->password))
    ) {
        http_response_code(400);
        throw new Exception("Username and password are required.");
    }

    $login_username = trim($data->username);
    $login_password = trim($data->password);

    // Fetch user by username or id
    $stmt = $conn->prepare("SELECT id, name, password, role, isActive FROM users WHERE name = ? OR id = ?");
    $stmt->bind_param("ss", $login_username, $login_username);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        http_response_code(401); // Unauthorized
        log_failed_login($login_username, "User not found");
        throw new Exception("Invalid credentials. Please check your username and password.");
    }

    $user = $result->fetch_assoc();
    $stmt->close();
    
    // Verify password first
    if (!password_verify($login_password, $user['password'])) {
        http_response_code(401); // Unauthorized
        log_failed_login($login_username, "Incorrect password");
        throw new Exception("Invalid credentials. Please check your username and password.");
    }
    
    // Then check if the account is active
    if (!$user['isActive']) {
        http_response_code(403); // Forbidden
        log_failed_login($login_username, "Account is deactivated");
        throw new Exception("Your account has been deactivated. Please contact an administrator.");
    }

    // If successful, return user data (without the password hash)
    unset($user['password']);
    unset($user['isActive']);

    http_response_code(200);
    echo json_encode(["success" => true, "user" => $user]);

} catch (Exception $e) {
    // If a specific HTTP code wasn't set, default to 500
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
