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

try {
    // --- Configuration ---
    // IMPORTANT: This base directory must be writable by the web server.
    // It's relative to this script's location. `../uploads` means an `uploads` folder in the parent directory of `api`.
    $upload_base_dir = '../uploads/'; 
    // This should be the public URL corresponding to the $upload_base_dir
    // IMPORTANT: Update this to your actual domain and path.
    $base_url = 'https://sajfoods.net/busa-api/uploads/'; 

    // --- File Upload Handling ---
    if (!isset($_FILES['fileToUpload']) || $_FILES['fileToUpload']['error'] !== UPLOAD_ERR_OK) {
        $error_message = 'No file uploaded or an upload error occurred.';
        if (isset($_FILES['fileToUpload']['error'])) {
            switch ($_FILES['fileToUpload']['error']) {
                case UPLOAD_ERR_INI_SIZE:
                case UPLOAD_ERR_FORM_SIZE:
                    $error_message = "File is too large.";
                    break;
                case UPLOAD_ERR_PARTIAL:
                    $error_message = "File was only partially uploaded.";
                    break;
                case UPLOAD_ERR_NO_FILE:
                    $error_message = "No file was uploaded.";
                    break;
                case UPLOAD_ERR_NO_TMP_DIR:
                    $error_message = "Missing a temporary folder on the server.";
                    break;
                case UPLOAD_ERR_CANT_WRITE:
                    $error_message = "Failed to write file to disk. Check permissions.";
                    break;
                case UPLOAD_ERR_EXTENSION:
                    $error_message = "A PHP extension stopped the file upload.";
                    break;
            }
        }
        http_response_code(400);
        throw new Exception($error_message);
    }

    $file = $_FILES['fileToUpload'];
    $path_segment = isset($_POST['pathSegment']) ? trim($_POST['pathSegment'], " /\\") : 'general';

    // Security: Sanitize path segment to prevent directory traversal
    $safe_path_segment = preg_replace('/[^a-zA-Z0-9\-_]/', '', $path_segment);
    if (empty($safe_path_segment)) {
        $safe_path_segment = 'general';
    }

    $target_dir = $upload_base_dir . $safe_path_segment . '/';

    // Create directory if it doesn't exist
    if (!is_dir($target_dir)) {
        if (!mkdir($target_dir, 0755, true)) {
            http_response_code(500);
            throw new Exception('Failed to create upload directory.');
        }
    }

    // --- File Validation ---
    $file_type = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    $allowed_types = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    if (!in_array($file_type, $allowed_types)) {
        http_response_code(400);
        throw new Exception('Invalid file type. Only JPG, PNG, GIF, and WEBP are allowed.');
    }

    // Check if it's a real image
    if (getimagesize($file['tmp_name']) === false) {
        http_response_code(400);
        throw new Exception('File is not a valid image.');
    }

    // Limit file size (e.g., 5MB)
    if ($file['size'] > 5 * 1024 * 1024) {
        http_response_code(400);
        throw new Exception('File is too large. Maximum size is 5MB.');
    }

    // --- Generate Unique Filename & Move File ---
    $unique_filename = uniqid('img_', true) . '.' . $file_type;
    $target_file_path = $target_dir . $unique_filename;

    if (move_uploaded_file($file['tmp_name'], $target_file_path)) {
        $public_url = $base_url . $safe_path_segment . '/' . $unique_filename;
        http_response_code(200);
        echo json_encode(['success' => true, 'url' => $public_url, 'message' => 'File uploaded successfully.']);
    } else {
        http_response_code(500);
        throw new Exception('Failed to move uploaded file. Check server permissions.');
    }

} catch (Exception $e) {
    // If the response code has not been set by a specific error, default to 500
    if (http_response_code() === 200) {
        http_response_code(500);
    }
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>