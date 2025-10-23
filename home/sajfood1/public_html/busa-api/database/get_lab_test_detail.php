<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

$servername = "localhost";
$username = "sajfood1_busa";
$password = "Haseem1234@";
$dbname = "sajfood1_busa-app";

try {
    $conn = new mysqli($servername, $username, $password, $dbname);
    if ($conn->connect_error) {
        throw new Exception("Database connection failed: " . $conn->connect_error);
    }

    $test_id = isset($_GET['id']) ? $_GET['id'] : null;

    if (!$test_id) {
        http_response_code(400);
        throw new Exception("Test ID is required.");
    }

    $stmt = $conn->prepare("SELECT * FROM lab_tests WHERE id = ?");
    if (!$stmt) {
        throw new Exception("Prepare statement failed: " . $conn->error);
    }

    $stmt->bind_param("s", $test_id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $test = $result->fetch_assoc();
        
        // Correctly cast numeric fields
        $numeric_fields = ['phLevel', 'tdsLevel', 'chlorineLevel', 'turbidity', 'conductivity', 'temperature'];
        foreach ($numeric_fields as $field) {
            $test[$field] = isset($test[$field]) ? (float)$test[$field] : null;
        }

        http_response_code(200);
        echo json_encode(["success" => true, "data" => $test]);
    } else {
        http_response_code(404);
        echo json_encode(["success" => false, "message" => "Test with ID '{$test_id}' not found."]);
    }

    $stmt->close();

} catch (Exception $e) {
    if (http_response_code() === 200) http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
} finally {
    if (isset($conn)) $conn->close();
}
?>
