<?php
declare(strict_types=1);
$config = require __DIR__ . '/config.php';
header('Content-Type: text/plain; charset=utf-8');

$pdo = new PDO(
  "mysql:host={$config['db_host']};dbname={$config['db_name']};charset=utf8mb4",
  $config['db_user'],
  $config['db_pass'],
  [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);

$schema = file_get_contents(dirname(__DIR__) . '/schema.sql');
$pdo->exec($schema);
echo "Schema ready.\n";

$seedFile = __DIR__ . '/seed-data.json';
if (!is_file($seedFile)) {
  echo "No seed-data.json found.\n";
  exit;
}

$data = json_decode(file_get_contents($seedFile), true);
if (!is_array($data)) {
  echo "Invalid seed-data.json\n";
  exit;
}

function enc($value) {
  return $value === null ? null : json_encode($value);
}

$pdo->exec('SET FOREIGN_KEY_CHECKS = 0');
foreach (['users','employees','departments','designations','attendance_records','leave_balances','leave_requests','holidays','notifications','announcements','documents','payroll_records','settings'] as $table) {
  $pdo->exec("DELETE FROM {$table}");
}

foreach ($data['users'] as $user) {
  $pdo->prepare('INSERT INTO users (id, name, email, phone, role, employee_id, avatar_url, username, password_hash) VALUES (?,?,?,?,?,?,?,?,?)')
    ->execute([$user['id'], $user['name'], $user['email'], $user['phone'], $user['role'], $user['employeeId'], $user['avatarUrl'], $user['username'], password_hash($user['password'], PASSWORD_BCRYPT)]);
}
foreach ($data['employees'] as $employee) {
  $pdo->prepare('INSERT INTO employees (id, employee_code, user_id, full_name, avatar_url, date_of_birth, gender, phone, personal_email, work_email, address, department_id, designation_id, joining_date, employment_type, reporting_person_id, work_location, status, daily_required_hours, basic_salary, allowances, deductions, emergency_contact, bank_information) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
    ->execute([$employee['id'], $employee['employeeCode'], $employee['userId'], $employee['fullName'], $employee['avatarUrl'], $employee['dateOfBirth'], $employee['gender'], $employee['phone'], $employee['personalEmail'], $employee['workEmail'], $employee['address'], $employee['departmentId'], $employee['designationId'], $employee['joiningDate'], $employee['employmentType'], $employee['reportingPersonId'], $employee['workLocation'], $employee['status'], $employee['dailyRequiredHours'], $employee['basicSalary'], $employee['allowances'], $employee['deductions'], enc($employee['emergencyContact']), enc($employee['bankInformation'])]);
}
foreach ($data['departments'] as $item) {
  $pdo->prepare('INSERT INTO departments (id, name, head_employee_id, status, created_at, description) VALUES (?,?,?,?,?,?)')
    ->execute([$item['id'], $item['name'], $item['headEmployeeId'], $item['status'], $item['createdAt'], $item['description']]);
}
foreach ($data['designations'] as $item) {
  $pdo->prepare('INSERT INTO designations (id, name, department_id, status) VALUES (?,?,?,?)')
    ->execute([$item['id'], $item['name'], $item['departmentId'], $item['status']]);
}
foreach ($data['attendanceRecords'] as $item) {
  $pdo->prepare('INSERT INTO attendance_records (id, employee_id, date, clock_in, clock_out, state, status, required_hours, active_working_minutes, break_minutes, work_session, breaks_json, late_minutes, notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
    ->execute([$item['id'], $item['employeeId'], $item['date'], $item['clockIn'], $item['clockOut'], $item['state'], $item['status'], $item['requiredHours'], $item['activeWorkingMinutes'], $item['breakMinutes'], enc($item['workSession']), enc($item['breaks']), $item['lateMinutes'], $item['notes']]);
}
foreach ($data['leaveBalances'] as $item) {
  $pdo->prepare('INSERT INTO leave_balances (employee_id, casual, sick, privilege) VALUES (?,?,?,?)')
    ->execute([$item['employeeId'], $item['casual'], $item['sick'], $item['privilege']]);
}
foreach ($data['leaveRequests'] as $item) {
  $pdo->prepare('INSERT INTO leave_requests (id, employee_id, type, start_date, end_date, is_half_day, reason, attachment_name, status, rejection_reason, reviewed_by, reviewed_at, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)')
    ->execute([$item['id'], $item['employeeId'], $item['type'], $item['startDate'], $item['endDate'], !empty($item['isHalfDay']) ? 1 : 0, $item['reason'], $item['attachmentName'], $item['status'], $item['rejectionReason'], $item['reviewedBy'], $item['reviewedAt'], $item['createdAt']]);
}
foreach ($data['holidays'] as $item) {
  $pdo->prepare('INSERT INTO holidays (id, name, date, type, description, recurring) VALUES (?,?,?,?,?,?)')
    ->execute([$item['id'], $item['name'], $item['date'], $item['type'], $item['description'], !empty($item['recurring']) ? 1 : 0]);
}
foreach ($data['notifications'] as $item) {
  $pdo->prepare('INSERT INTO notifications (id, user_id, type, title, message, is_read, created_at, href) VALUES (?,?,?,?,?,?,?,?)')
    ->execute([$item['id'], $item['userId'], $item['type'], $item['title'], $item['message'], !empty($item['read']) ? 1 : 0, $item['createdAt'], $item['href']]);
}
foreach ($data['announcements'] as $item) {
  $pdo->prepare('INSERT INTO announcements (id, title, description, audience, department_id, publish_date, status, created_by) VALUES (?,?,?,?,?,?,?,?)')
    ->execute([$item['id'], $item['title'], $item['description'], $item['audience'], $item['departmentId'], $item['publishDate'], $item['status'], $item['createdBy']]);
}
foreach ($data['documents'] as $item) {
  $pdo->prepare('INSERT INTO documents (id, employee_id, type, name, file_name, expiry_date, status, uploaded_at) VALUES (?,?,?,?,?,?,?,?)')
    ->execute([$item['id'], $item['employeeId'], $item['type'], $item['name'], $item['fileName'], $item['expiryDate'], $item['status'], $item['uploadedAt']]);
}
foreach ($data['payrollRecords'] as $item) {
  $pdo->prepare('INSERT INTO payroll_records (id, employee_id, period, basic_salary, allowances, deductions, gross_salary, net_salary, status, payslip_available) VALUES (?,?,?,?,?,?,?,?,?,?)')
    ->execute([$item['id'], $item['employeeId'], $item['period'], $item['basicSalary'], $item['allowances'], $item['deductions'], $item['grossSalary'], $item['netSalary'], $item['status'], !empty($item['payslipAvailable']) ? 1 : 0]);
}
$pdo->prepare('INSERT INTO settings (id, payload) VALUES (1, ?)')->execute([enc($data['settings'])]);
$pdo->exec('SET FOREIGN_KEY_CHECKS = 1');
echo "Seeded all HRMS tables.\n";
