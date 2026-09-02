<?php
$target = 'http://127.0.0.1:5001';

// Apache mod_rewrite changes REQUEST_URI to the rewrite target (api-proxy.php).
// The original path is preserved in REDIRECT_URL.
$uri = $_SERVER['REDIRECT_URL'] ?? $_SERVER['REQUEST_URI'];

// Append query string if present
$qs = $_SERVER['QUERY_STRING'] ?? '';
$url = $target . $uri . ($qs ? '?' . $qs : '');

$method = $_SERVER['REQUEST_METHOD'];
$headers = [];
foreach (getallheaders() as $k => $v) {
    if (strtolower($k) === 'host') continue;
    $headers[] = "$k: $v";
}
$body = file_get_contents('php://input');

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HEADER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);
if ($body) curl_setopt($ch, CURLOPT_POSTFIELDS, $body);

$response = curl_exec($ch);
$headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($curlError) {
    http_response_code(502);
    echo json_encode(['error' => 'Proxy error: ' . $curlError]);
    exit;
}

$responseHeaders = substr($response, 0, $headerSize);
$responseBody = substr($response, $headerSize);

http_response_code($httpCode);
foreach (explode("\r\n", $responseHeaders) as $h) {
    if (preg_match('/^(Content-Type|Authorization|X-|Access-Control)/', $h)) {
        header($h);
    }
}
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($method === 'OPTIONS') {
    http_response_code(200);
    exit;
}

echo $responseBody;
