<?php
$local = __DIR__ . '/config.local.php';
$overrides = is_file($local) ? require $local : [];
return array_merge([
  'db_host' => getenv('DB_HOST') ?: 'localhost',
  'db_name' => getenv('DB_NAME') ?: 'u572425523_hrmswch',
  'db_user' => getenv('DB_USER') ?: 'u572425523_hrmswch',
  'db_pass' => getenv('DB_PASSWORD') ?: '',
  'jwt_secret' => getenv('JWT_SECRET') ?: 'wch-hrms-hostinger-secret',
  'cors_origins' => array_filter(array_map('trim', explode(',', getenv('API_CORS_ORIGINS') ?: 'http://localhost:3000,https://yogipowar.github.io'))),
], $overrides);
