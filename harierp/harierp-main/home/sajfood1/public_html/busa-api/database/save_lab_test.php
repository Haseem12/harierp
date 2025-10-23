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

    // Validation
    if (
        !isset($data->sampleId) || empty(trim($data->sampleId)) ||
        !isset($data->testDate) || empty(trim($data->testDate)) ||
        !isset($data->productName) || empty(trim($data->productName))
    ) {
        http_response_code(400);
        throw new Exception("Incomplete test data. Sample ID, Product Name, and Test Date are required.");
    }
    
    $conn->begin_transaction();

    $id = "labtest_" . uniqid();
    $batchNumber = isset($data->batchNumber) ? trim($data->batchNumber) : null;
    $sampleId = trim($data->sampleId);
    $testDate = $data->testDate;
    $productName = trim($data->productName);

    $phLevel = isset($data->phLevel) && is_numeric($data->phLevel) ? (float)$data->phLevel : null;
    $tdsLevel = isset($data->tdsLevel) && is_numeric($data->tdsLevel) ? (float)$data->tdsLevel : null;
    $chlorineLevel = isset($data->chlorineLevel) && is_numeric($data->chlorineLevel) ? (float)$data->chlorineLevel : null;
    $turbidity = isset($data->turbidity) && is_numeric($data->turbidity) ? (float)$data->turbidity : null;
    $conductivity = isset($data->conductivity) && is_numeric($data->conductivity) ? (float)$data->conductivity : null;
    $temperature = isset($data->temperature) && is_numeric($data->temperature) ? (float)$data->temperature : null;

    $microbiologicalTest = $data->microbiologicalTest ?? 'Pending';
    $chemicalTest = $data->chemicalTest ?? 'Pending';
    $physicalTest = $data->physicalTest ?? 'Pending';
    $notes = isset($data->notes) ? trim($data->notes) : '';
    
    // Determine overall status
    $overallStatus = 'Pass';
    if ($microbiologicalTest === 'Fail' || $chemicalTest === 'Fail' || $physicalTest === 'Fail') {
        $overallStatus = 'Fail';
    } elseif ($microbiologicalTest === 'Pending' || $chemicalTest === 'Pending' || $physicalTest === 'Pending') {
        $overallStatus = 'Pending';
    }
    

    $stmt = $conn->prepare(
        "INSERT INTO lab_tests (id, batchNumber, sampleId, testDate, productName, phLevel, tdsLevel, chlorineLevel, turbidity, conductivity, temperature, microbiologicalTest, chemicalTest, physicalTest, overallStatus, notes) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    $stmt->bind_param("sssssddddddsssss", 
        $id, $batchNumber, $sampleId, $testDate, $productName, 
        $phLevel, $tdsLevel, $chlorineLevel, $turbidity, $conductivity, $temperature,
        $microbiologicalTest, $chemicalTest, $physicalTest, $overallStatus, $notes
    );

    if (!$stmt->execute()) {
        throw new Exception("Failed to save lab test: " . $stmt->error);
    }
    $stmt->close();

    $conn->commit();
    http_response_code(201);
    echo json_encode(["success" => true, "message" => "Lab test recorded successfully.", "id" => $id]);

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
