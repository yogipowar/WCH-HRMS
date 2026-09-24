<?php
declare(strict_types=1);

function hrms_json($value): ?string {
  return $value === null ? null : json_encode($value);
}

if (($parts[0] ?? '') === 'employees' && $method === 'POST') {
  $input = body();
  $employee = $input['employee'] ?? [];
  $userRow = $input['user'] ?? [];
  $pdo->prepare('REPLACE INTO employees (id, employee_code, user_id, full_name, avatar_url, date_of_birth, gender, phone, personal_email, work_email, address, department_id, designation_id, joining_date, employment_type, reporting_person_id, work_location, status, daily_required_hours, basic_salary, allowances, deductions, emergency_contact, bank_information) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
    ->execute([
      $employee['id'], $employee['employeeCode'], $employee['userId'], $employee['fullName'], $employee['avatarUrl'],
      $employee['dateOfBirth'], $employee['gender'], $employee['phone'], $employee['personalEmail'], $employee['workEmail'],
      $employee['address'], $employee['departmentId'], $employee['designationId'], $employee['joiningDate'],
      $employee['employmentType'], $employee['reportingPersonId'], $employee['workLocation'], $employee['status'],
      $employee['dailyRequiredHours'], $employee['basicSalary'], $employee['allowances'], $employee['deductions'],
      hrms_json($employee['emergencyContact']), hrms_json($employee['bankInformation']),
    ]);
  $hash = password_hash((string)($userRow['password'] ?? 'ChangeMe@123'), PASSWORD_BCRYPT);
  $pdo->prepare('REPLACE INTO users (id, name, email, phone, role, employee_id, avatar_url, username, password_hash) VALUES (?,?,?,?,?,?,?,?,?)')
    ->execute([$userRow['id'], $userRow['name'], $userRow['email'], $userRow['phone'], $userRow['role'], $userRow['employeeId'], $userRow['avatarUrl'], $userRow['username'], $hash]);
  if (!empty($input['leaveBalance'])) {
    $b = $input['leaveBalance'];
    $pdo->prepare('REPLACE INTO leave_balances (employee_id, casual, sick, privilege) VALUES (?,?,?,?)')
      ->execute([$b['employeeId'], $b['casual'], $b['sick'], $b['privilege']]);
  }
  if (!empty($input['payrollRecord'])) {
    $p = $input['payrollRecord'];
    $pdo->prepare('REPLACE INTO payroll_records (id, employee_id, period, basic_salary, allowances, deductions, gross_salary, net_salary, status, payslip_available) VALUES (?,?,?,?,?,?,?,?,?,?)')
      ->execute([$p['id'], $p['employeeId'], $p['period'], $p['basicSalary'], $p['allowances'], $p['deductions'], $p['grossSalary'], $p['netSalary'], $p['status'], !empty($p['payslipAvailable']) ? 1 : 0]);
  }
  json_out(200, ['ok' => true]);
}

if (($parts[0] ?? '') === 'employees' && isset($parts[1]) && $method === 'PATCH') {
  $input = body();
  if (!empty($input['employee'])) {
    $_POST_EMP = $input;
    $employee = $input['employee'];
    $pdo->prepare('REPLACE INTO employees (id, employee_code, user_id, full_name, avatar_url, date_of_birth, gender, phone, personal_email, work_email, address, department_id, designation_id, joining_date, employment_type, reporting_person_id, work_location, status, daily_required_hours, basic_salary, allowances, deductions, emergency_contact, bank_information) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
      ->execute([
        $employee['id'], $employee['employeeCode'], $employee['userId'], $employee['fullName'], $employee['avatarUrl'],
        $employee['dateOfBirth'], $employee['gender'], $employee['phone'], $employee['personalEmail'], $employee['workEmail'],
        $employee['address'], $employee['departmentId'], $employee['designationId'], $employee['joiningDate'],
        $employee['employmentType'], $employee['reportingPersonId'], $employee['workLocation'], $employee['status'],
        $employee['dailyRequiredHours'], $employee['basicSalary'], $employee['allowances'], $employee['deductions'],
        hrms_json($employee['emergencyContact']), hrms_json($employee['bankInformation']),
      ]);
  }
  if (!empty($input['user'])) {
    $userRow = $input['user'];
    if (!empty($userRow['password'])) {
      $pdo->prepare('UPDATE users SET name=?, email=?, phone=?, avatar_url=?, username=?, password_hash=? WHERE id=?')
        ->execute([$userRow['name'], $userRow['email'], $userRow['phone'], $userRow['avatarUrl'], $userRow['username'], password_hash($userRow['password'], PASSWORD_BCRYPT), $userRow['id']]);
    } else {
      $pdo->prepare('UPDATE users SET name=?, email=?, phone=?, avatar_url=?, username=? WHERE id=?')
        ->execute([$userRow['name'], $userRow['email'], $userRow['phone'], $userRow['avatarUrl'], $userRow['username'], $userRow['id']]);
    }
  }
  json_out(200, ['ok' => true]);
}

if (($parts[0] ?? '') === 'departments' && $method === 'POST') {
  $item = body();
  $pdo->prepare('INSERT INTO departments (id, name, head_employee_id, status, created_at, description) VALUES (?,?,?,?,?,?)')
    ->execute([$item['id'], $item['name'], $item['headEmployeeId'], $item['status'], $item['createdAt'], $item['description']]);
  json_out(200, $item);
}
if (($parts[0] ?? '') === 'departments' && isset($parts[1]) && $method === 'PATCH') {
  $item = body();
  $pdo->prepare('UPDATE departments SET name=?, head_employee_id=?, status=?, description=? WHERE id=?')
    ->execute([$item['name'], $item['headEmployeeId'], $item['status'], $item['description'], $parts[1]]);
  json_out(200, ['ok' => true]);
}
if (($parts[0] ?? '') === 'designations' && $method === 'POST') {
  $item = body();
  $pdo->prepare('INSERT INTO designations (id, name, department_id, status) VALUES (?,?,?,?)')
    ->execute([$item['id'], $item['name'], $item['departmentId'], $item['status']]);
  json_out(200, $item);
}
if (($parts[0] ?? '') === 'designations' && isset($parts[1]) && $method === 'PATCH') {
  $item = body();
  $pdo->prepare('UPDATE designations SET name=?, department_id=?, status=? WHERE id=?')
    ->execute([$item['name'], $item['departmentId'], $item['status'], $parts[1]]);
  json_out(200, ['ok' => true]);
}
if (($parts[0] ?? '') === 'holidays' && $method === 'POST') {
  $item = body();
  $pdo->prepare('INSERT INTO holidays (id, name, date, type, description, recurring) VALUES (?,?,?,?,?,?)')
    ->execute([$item['id'], $item['name'], $item['date'], $item['type'], $item['description'], !empty($item['recurring']) ? 1 : 0]);
  json_out(200, $item);
}
if (($parts[0] ?? '') === 'holidays' && isset($parts[1]) && $method === 'PATCH') {
  $item = body();
  $pdo->prepare('UPDATE holidays SET name=?, date=?, type=?, description=?, recurring=? WHERE id=?')
    ->execute([$item['name'], $item['date'], $item['type'], $item['description'], !empty($item['recurring']) ? 1 : 0, $parts[1]]);
  json_out(200, ['ok' => true]);
}
if (($parts[0] ?? '') === 'holidays' && isset($parts[1]) && $method === 'DELETE') {
  $pdo->prepare('DELETE FROM holidays WHERE id = ?')->execute([$parts[1]]);
  json_out(200, ['ok' => true]);
}
if (($parts[0] ?? '') === 'leave' && $method === 'POST') {
  $item = body();
  $pdo->prepare('INSERT INTO leave_requests (id, employee_id, type, start_date, end_date, is_half_day, reason, attachment_name, status, rejection_reason, reviewed_by, reviewed_at, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)')
    ->execute([$item['id'], $item['employeeId'], $item['type'], $item['startDate'], $item['endDate'], !empty($item['isHalfDay']) ? 1 : 0, $item['reason'], $item['attachmentName'], $item['status'], $item['rejectionReason'], $item['reviewedBy'], $item['reviewedAt'], $item['createdAt']]);
  json_out(200, $item);
}
if (($parts[0] ?? '') === 'leave' && isset($parts[1], $parts[2]) && $parts[2] === 'status' && $method === 'PATCH') {
  $input = body();
  $item = $input['request'];
  $pdo->prepare('UPDATE leave_requests SET status=?, reviewed_by=?, reviewed_at=?, rejection_reason=? WHERE id=?')
    ->execute([$item['status'], $item['reviewedBy'], $item['reviewedAt'], $item['rejectionReason'], $parts[1]]);
  if (!empty($input['balance'])) {
    $b = $input['balance'];
    $pdo->prepare('UPDATE leave_balances SET casual=?, sick=?, privilege=? WHERE employee_id=?')
      ->execute([$b['casual'], $b['sick'], $b['privilege'], $b['employeeId']]);
  }
  json_out(200, ['ok' => true]);
}
if (($parts[0] ?? '') === 'attendance' && $method === 'PUT') {
  $item = body();
  $pdo->prepare('REPLACE INTO attendance_records (id, employee_id, date, clock_in, clock_out, state, status, required_hours, active_working_minutes, break_minutes, work_session, breaks_json, late_minutes, notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
    ->execute([$item['id'], $item['employeeId'], $item['date'], $item['clockIn'], $item['clockOut'], $item['state'], $item['status'], $item['requiredHours'], $item['activeWorkingMinutes'], $item['breakMinutes'], hrms_json($item['workSession']), hrms_json($item['breaks'] ?? []), $item['lateMinutes'], $item['notes']]);
  json_out(200, $item);
}
if (($parts[0] ?? '') === 'announcements' && $method === 'POST') {
  $item = body();
  $pdo->prepare('INSERT INTO announcements (id, title, description, audience, department_id, publish_date, status, created_by) VALUES (?,?,?,?,?,?,?,?)')
    ->execute([$item['id'], $item['title'], $item['description'], $item['audience'], $item['departmentId'], $item['publishDate'], $item['status'], $item['createdBy']]);
  json_out(200, $item);
}
if (($parts[0] ?? '') === 'announcements' && isset($parts[1]) && $method === 'PATCH') {
  $item = body();
  $pdo->prepare('UPDATE announcements SET title=?, description=?, audience=?, department_id=?, publish_date=?, status=? WHERE id=?')
    ->execute([$item['title'], $item['description'], $item['audience'], $item['departmentId'], $item['publishDate'], $item['status'], $parts[1]]);
  json_out(200, ['ok' => true]);
}
if (($parts[0] ?? '') === 'documents' && $method === 'POST') {
  $item = body();
  $pdo->prepare('INSERT INTO documents (id, employee_id, type, name, file_name, expiry_date, status, uploaded_at) VALUES (?,?,?,?,?,?,?,?)')
    ->execute([$item['id'], $item['employeeId'], $item['type'], $item['name'], $item['fileName'], $item['expiryDate'], $item['status'], $item['uploadedAt']]);
  json_out(200, $item);
}
if (($parts[0] ?? '') === 'notifications' && ($parts[1] ?? '') === 'read-all' && $method === 'POST') {
  $input = body();
  $pdo->prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?')->execute([$input['userId']]);
  json_out(200, ['ok' => true]);
}
if (($parts[0] ?? '') === 'notifications' && isset($parts[1]) && $method === 'PATCH') {
  $pdo->prepare('UPDATE notifications SET is_read = 1 WHERE id = ?')->execute([$parts[1]]);
  json_out(200, ['ok' => true]);
}
if (($parts[0] ?? '') === 'settings' && $method === 'PATCH') {
  $item = body();
  $pdo->prepare('REPLACE INTO settings (id, payload) VALUES (1, ?)')->execute([hrms_json($item)]);
  json_out(200, $item);
}
