<?php
declare(strict_types=1);
$config = require __DIR__ . '/config.php';

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allow = in_array($origin, $config['cors_origins'], true) ? $origin : ($config['cors_origins'][0] ?? '*');
header('Access-Control-Allow-Origin: ' . $allow);
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET,POST,PATCH,PUT,DELETE,OPTIONS');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}

function json_out(int $status, $payload, ?string $cookie = null): void {
  if ($cookie !== null) header('Set-Cookie: ' . $cookie, false);
  http_response_code($status);
  echo json_encode($payload);
  exit;
}

function body(): array {
  $raw = file_get_contents('php://input');
  if (!$raw) return [];
  $data = json_decode($raw, true);
  return is_array($data) ? $data : [];
}

function db(array $config): PDO {
  static $pdo = null;
  if ($pdo) return $pdo;
  $pdo = new PDO(
    "mysql:host={$config['db_host']};dbname={$config['db_name']};charset=utf8mb4",
    $config['db_user'],
    $config['db_pass'],
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
  );
  return $pdo;
}

function sign_token(array $user, bool $remember, string $secret): string {
  $payload = ['sub' => $user['id'], 'role' => $user['role'], 'exp' => time() + ($remember ? 60 * 60 * 24 * 30 : 60 * 60 * 12)];
  $body = rtrim(strtr(base64_encode(json_encode($payload)), '+/', '-_'), '=');
  $sig = rtrim(strtr(base64_encode(hash_hmac('sha256', $body, $secret, true)), '+/', '-_'), '=');
  return $body . '.' . $sig;
}

function verify_token(?string $token, string $secret): ?array {
  if (!$token) return null;
  [$body, $sig] = array_pad(explode('.', $token, 2), 2, '');
  $expected = rtrim(strtr(base64_encode(hash_hmac('sha256', $body, $secret, true)), '+/', '-_'), '=');
  if (!hash_equals($expected, $sig)) return null;
  $payload = json_decode(base64_decode(strtr($body, '-_', '+/')), true);
  if (!is_array($payload) || ($payload['exp'] ?? 0) < time()) return null;
  return $payload;
}

function request_token(): ?string {
  $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
  if (str_starts_with($header, 'Bearer ')) return substr($header, 7);
  return $_COOKIE['wch_hrms_token'] ?? null;
}

function public_user(array $row): array {
  return [
    'id' => $row['id'],
    'name' => $row['name'],
    'email' => $row['email'],
    'phone' => $row['phone'],
    'role' => $row['role'],
    'employeeId' => $row['employee_id'],
    'avatarUrl' => $row['avatar_url'],
    'username' => $row['username'],
    'password' => '',
  ];
}

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$parts = array_values(array_filter(explode('/', $path), fn($part) => $part !== '' && $part !== 'index.php'));
$known = ['api', 'auth', 'bootstrap', 'employees', 'departments', 'designations', 'holidays', 'leave', 'attendance', 'announcements', 'documents', 'notifications', 'settings', 'health'];
while ($parts && !in_array($parts[0], $known, true)) array_shift($parts);
if (($parts[0] ?? '') === 'api') array_shift($parts);
$method = $_SERVER['REQUEST_METHOD'];

try {
  $pdo = db($config);

  if (($parts[0] ?? '') === 'health' && $method === 'GET') {
    json_out(200, ['ok' => true]);
  }

  if (($parts[0] ?? '') === 'auth' && ($parts[1] ?? '') === 'login' && $method === 'POST') {
    $input = body();
    $username = strtolower(trim((string)($input['username'] ?? '')));
    $stmt = $pdo->prepare('SELECT * FROM users WHERE LOWER(username) = ? OR LOWER(email) = ?');
    $stmt->execute([$username, $username]);
    $account = $stmt->fetch();
    if (!$account || !password_verify((string)($input['password'] ?? ''), $account['password_hash'])) {
      json_out(401, ['error' => 'The username or password is incorrect.']);
    }
    if ($account['employee_id']) {
      $emp = $pdo->prepare('SELECT status FROM employees WHERE id = ?');
      $emp->execute([$account['employee_id']]);
      $row = $emp->fetch();
      if (($row['status'] ?? '') === 'INACTIVE') json_out(401, ['error' => 'The username or password is incorrect.']);
    }
    $user = public_user($account);
    $token = sign_token($user, !empty($input['remember']), $config['jwt_secret']);
    $max = !empty($input['remember']) ? 60 * 60 * 24 * 30 : 60 * 60 * 12;
    json_out(200, ['user' => $user, 'token' => $token], 'wch_hrms_token=' . rawurlencode($token) . '; HttpOnly; Path=/; Max-Age=' . $max . '; SameSite=None; Secure');
  }

  if (($parts[0] ?? '') === 'auth' && ($parts[1] ?? '') === 'logout' && $method === 'POST') {
    json_out(200, ['ok' => true], 'wch_hrms_token=; HttpOnly; Path=/; Max-Age=0; SameSite=None; Secure');
  }

  $payload = verify_token(request_token(), $config['jwt_secret']);
  if (!$payload) json_out(401, ['error' => 'Unauthorized']);
  $stmt = $pdo->prepare('SELECT * FROM users WHERE id = ?');
  $stmt->execute([$payload['sub']]);
  $account = $stmt->fetch();
  if (!$account) json_out(401, ['error' => 'Unauthorized']);
  $user = public_user($account);

  if (($parts[0] ?? '') === 'auth' && ($parts[1] ?? '') === 'me' && $method === 'GET') {
    json_out(200, ['user' => $user]);
  }

  if (($parts[0] ?? '') === 'bootstrap' && $method === 'GET') {
    require_once __DIR__ . '/bootstrap.php';
    json_out(200, hrms_bootstrap($pdo));
  }

  require __DIR__ . '/routes.php';
  json_out(404, ['error' => 'Not found']);
} catch (Throwable $error) {
  json_out(500, ['error' => $error->getMessage()]);
}
