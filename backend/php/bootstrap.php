<?php
declare(strict_types=1);

function hrms_decode($value, $fallback) {
  if ($value === null || $value === '') return $fallback;
  if (is_array($value)) return $value;
  $decoded = json_decode((string)$value, true);
  return $decoded === null ? $fallback : $decoded;
}

function hrms_num($value): float {
  return (float)$value;
}

function hrms_bootstrap(PDO $pdo): array {
  $users = $pdo->query('SELECT * FROM users')->fetchAll();
  $employees = $pdo->query('SELECT * FROM employees')->fetchAll();
  $departments = $pdo->query('SELECT * FROM departments')->fetchAll();
  $designations = $pdo->query('SELECT * FROM designations')->fetchAll();
  $attendance = $pdo->query('SELECT * FROM attendance_records')->fetchAll();
  $balances = $pdo->query('SELECT * FROM leave_balances')->fetchAll();
  $leaves = $pdo->query('SELECT * FROM leave_requests')->fetchAll();
  $holidays = $pdo->query('SELECT * FROM holidays')->fetchAll();
  $notifications = $pdo->query('SELECT * FROM notifications')->fetchAll();
  $announcements = $pdo->query('SELECT * FROM announcements')->fetchAll();
  $documents = $pdo->query('SELECT * FROM documents')->fetchAll();
  $payroll = $pdo->query('SELECT * FROM payroll_records')->fetchAll();
  $settings = $pdo->query('SELECT payload FROM settings WHERE id = 1')->fetch();

  return [
    'users' => array_map(fn($row) => [
      'id' => $row['id'], 'name' => $row['name'], 'email' => $row['email'], 'phone' => $row['phone'],
      'role' => $row['role'], 'employeeId' => $row['employee_id'], 'avatarUrl' => $row['avatar_url'],
      'username' => $row['username'], 'password' => '',
    ], $users),
    'employees' => array_map(fn($row) => [
      'id' => $row['id'], 'employeeCode' => $row['employee_code'], 'userId' => $row['user_id'],
      'fullName' => $row['full_name'], 'avatarUrl' => $row['avatar_url'],
      'dateOfBirth' => substr((string)$row['date_of_birth'], 0, 10), 'gender' => $row['gender'],
      'phone' => $row['phone'], 'personalEmail' => $row['personal_email'], 'workEmail' => $row['work_email'],
      'address' => $row['address'], 'departmentId' => $row['department_id'], 'designationId' => $row['designation_id'],
      'joiningDate' => substr((string)$row['joining_date'], 0, 10), 'employmentType' => $row['employment_type'],
      'reportingPersonId' => $row['reporting_person_id'], 'workLocation' => $row['work_location'],
      'status' => $row['status'], 'dailyRequiredHours' => hrms_num($row['daily_required_hours']),
      'basicSalary' => hrms_num($row['basic_salary']), 'allowances' => hrms_num($row['allowances']),
      'deductions' => hrms_num($row['deductions']),
      'emergencyContact' => hrms_decode($row['emergency_contact'], ['name'=>'','relationship'=>'','phone'=>'']),
      'bankInformation' => hrms_decode($row['bank_information'], ['accountHolder'=>'','bankName'=>'','accountNumber'=>'','ifscCode'=>'']),
    ], $employees),
    'departments' => array_map(fn($row) => [
      'id' => $row['id'], 'name' => $row['name'], 'headEmployeeId' => $row['head_employee_id'],
      'status' => $row['status'], 'createdAt' => substr((string)$row['created_at'], 0, 10),
      'description' => $row['description'],
    ], $departments),
    'designations' => array_map(fn($row) => [
      'id' => $row['id'], 'name' => $row['name'], 'departmentId' => $row['department_id'], 'status' => $row['status'],
    ], $designations),
    'attendanceRecords' => array_map(fn($row) => [
      'id' => $row['id'], 'employeeId' => $row['employee_id'], 'date' => substr((string)$row['date'], 0, 10),
      'clockIn' => $row['clock_in'], 'clockOut' => $row['clock_out'], 'state' => $row['state'], 'status' => $row['status'],
      'requiredHours' => hrms_num($row['required_hours']), 'activeWorkingMinutes' => (int)$row['active_working_minutes'],
      'breakMinutes' => (int)$row['break_minutes'], 'workSession' => hrms_decode($row['work_session'], null),
      'breaks' => hrms_decode($row['breaks_json'], []), 'lateMinutes' => (int)$row['late_minutes'], 'notes' => $row['notes'],
    ], $attendance),
    'leaveBalances' => array_map(fn($row) => [
      'employeeId' => $row['employee_id'], 'casual' => hrms_num($row['casual']),
      'sick' => hrms_num($row['sick']), 'privilege' => hrms_num($row['privilege']),
    ], $balances),
    'leaveRequests' => array_map(fn($row) => [
      'id' => $row['id'], 'employeeId' => $row['employee_id'], 'type' => $row['type'],
      'startDate' => substr((string)$row['start_date'], 0, 10), 'endDate' => substr((string)$row['end_date'], 0, 10),
      'isHalfDay' => (bool)$row['is_half_day'], 'reason' => $row['reason'], 'attachmentName' => $row['attachment_name'],
      'status' => $row['status'], 'rejectionReason' => $row['rejection_reason'], 'reviewedBy' => $row['reviewed_by'],
      'reviewedAt' => $row['reviewed_at'], 'createdAt' => $row['created_at'],
    ], $leaves),
    'holidays' => array_map(fn($row) => [
      'id' => $row['id'], 'name' => $row['name'], 'date' => substr((string)$row['date'], 0, 10),
      'type' => $row['type'], 'description' => $row['description'], 'recurring' => (bool)$row['recurring'],
    ], $holidays),
    'notifications' => array_map(fn($row) => [
      'id' => $row['id'], 'userId' => $row['user_id'], 'type' => $row['type'], 'title' => $row['title'],
      'message' => $row['message'], 'read' => (bool)$row['is_read'], 'createdAt' => $row['created_at'], 'href' => $row['href'],
    ], $notifications),
    'announcements' => array_map(fn($row) => [
      'id' => $row['id'], 'title' => $row['title'], 'description' => $row['description'], 'audience' => $row['audience'],
      'departmentId' => $row['department_id'], 'publishDate' => substr((string)$row['publish_date'], 0, 10),
      'status' => $row['status'], 'createdBy' => $row['created_by'],
    ], $announcements),
    'documents' => array_map(fn($row) => [
      'id' => $row['id'], 'employeeId' => $row['employee_id'], 'type' => $row['type'], 'name' => $row['name'],
      'fileName' => $row['file_name'], 'expiryDate' => $row['expiry_date'] ? substr((string)$row['expiry_date'], 0, 10) : null,
      'status' => $row['status'], 'uploadedAt' => substr((string)$row['uploaded_at'], 0, 10),
    ], $documents),
    'payrollRecords' => array_map(fn($row) => [
      'id' => $row['id'], 'employeeId' => $row['employee_id'], 'period' => $row['period'],
      'basicSalary' => hrms_num($row['basic_salary']), 'allowances' => hrms_num($row['allowances']),
      'deductions' => hrms_num($row['deductions']), 'grossSalary' => hrms_num($row['gross_salary']),
      'netSalary' => hrms_num($row['net_salary']), 'status' => $row['status'],
      'payslipAvailable' => (bool)$row['payslip_available'],
    ], $payroll),
    'settings' => hrms_decode($settings['payload'] ?? '{}', new stdClass()),
  ];
}
