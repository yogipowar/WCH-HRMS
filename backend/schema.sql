CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(64) NOT NULL DEFAULT '',
  role VARCHAR(32) NOT NULL,
  employee_id VARCHAR(64) NULL,
  avatar_url TEXT NULL,
  username VARCHAR(128) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  password_plain VARCHAR(255) NOT NULL DEFAULT '',
  color_theme VARCHAR(32) NOT NULL DEFAULT 'atlantic',
  appearance VARCHAR(16) NOT NULL DEFAULT 'light',
  UNIQUE KEY users_username (username),
  UNIQUE KEY users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS employees (
  id VARCHAR(64) PRIMARY KEY,
  employee_code VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  avatar_url TEXT NULL,
  date_of_birth DATE NOT NULL,
  gender VARCHAR(32) NOT NULL,
  phone VARCHAR(64) NOT NULL,
  personal_email VARCHAR(255) NOT NULL,
  work_email VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  department_id VARCHAR(64) NOT NULL,
  designation_id VARCHAR(64) NOT NULL,
  joining_date DATE NOT NULL,
  employment_type VARCHAR(32) NOT NULL,
  reporting_person_id VARCHAR(64) NULL,
  work_location VARCHAR(255) NOT NULL,
  status VARCHAR(32) NOT NULL,
  daily_required_hours DECIMAL(4,1) NOT NULL,
  work_start_time VARCHAR(8) NOT NULL DEFAULT '09:30',
  late_after_minutes INT NOT NULL DEFAULT 10,
  basic_salary DECIMAL(12,2) NOT NULL DEFAULT 0,
  allowances DECIMAL(12,2) NOT NULL DEFAULT 0,
  deductions DECIMAL(12,2) NOT NULL DEFAULT 0,
  emergency_contact LONGTEXT NOT NULL,
  bank_information LONGTEXT NOT NULL,
  UNIQUE KEY employees_code (employee_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS departments (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  head_employee_id VARCHAR(64) NULL,
  status VARCHAR(32) NOT NULL,
  created_at DATE NOT NULL,
  description TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS designations (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  department_id VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS attendance_records (
  id VARCHAR(64) PRIMARY KEY,
  employee_id VARCHAR(64) NOT NULL,
  date DATE NOT NULL,
  clock_in VARCHAR(64) NULL,
  clock_out VARCHAR(64) NULL,
  state VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL,
  required_hours DECIMAL(4,1) NOT NULL,
  active_working_minutes INT NOT NULL DEFAULT 0,
  break_minutes INT NOT NULL DEFAULT 0,
  work_session LONGTEXT NULL,
  breaks_json LONGTEXT NOT NULL,
  late_minutes INT NOT NULL DEFAULT 0,
  notes TEXT NULL,
  UNIQUE KEY attendance_employee_date (employee_id, date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS leave_balances (
  employee_id VARCHAR(64) PRIMARY KEY,
  casual DECIMAL(6,1) NOT NULL DEFAULT 0,
  sick DECIMAL(6,1) NOT NULL DEFAULT 0,
  privilege DECIMAL(6,1) NOT NULL DEFAULT 0,
  spent_casual DECIMAL(6,1) NOT NULL DEFAULT 0,
  spent_sick DECIMAL(6,1) NOT NULL DEFAULT 0,
  spent_privilege DECIMAL(6,1) NOT NULL DEFAULT 0,
  year_start DATE NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS leave_requests (
  id VARCHAR(64) PRIMARY KEY,
  employee_id VARCHAR(64) NOT NULL,
  type VARCHAR(32) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_half_day TINYINT(1) NOT NULL DEFAULT 0,
  reason TEXT NOT NULL,
  attachment_name VARCHAR(255) NULL,
  attachment_mime VARCHAR(128) NULL,
  attachment_data LONGBLOB NULL,
  status VARCHAR(32) NOT NULL,
  rejection_reason TEXT NULL,
  reviewed_by VARCHAR(64) NULL,
  reviewed_at VARCHAR(64) NULL,
  created_at VARCHAR(64) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS late_removal_requests (
  id VARCHAR(64) PRIMARY KEY,
  employee_id VARCHAR(64) NOT NULL,
  attendance_id VARCHAR(64) NOT NULL,
  attendance_date DATE NOT NULL,
  late_minutes INT NOT NULL DEFAULT 0,
  active_working_minutes INT NOT NULL DEFAULT 0,
  required_hours DECIMAL(4,1) NOT NULL,
  reason TEXT NOT NULL,
  status VARCHAR(32) NOT NULL,
  rejection_reason TEXT NULL,
  reviewed_by VARCHAR(64) NULL,
  reviewed_at VARCHAR(64) NULL,
  created_at VARCHAR(64) NOT NULL,
  UNIQUE KEY late_removal_attendance (attendance_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS holidays (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  type VARCHAR(32) NOT NULL,
  description TEXT NOT NULL,
  recurring TINYINT(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  type VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at VARCHAR(64) NOT NULL,
  href VARCHAR(255) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS announcements (
  id VARCHAR(64) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  audience VARCHAR(32) NOT NULL,
  department_id VARCHAR(64) NULL,
  publish_date DATE NOT NULL,
  status VARCHAR(32) NOT NULL,
  created_by VARCHAR(64) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS projects (
  id VARCHAR(64) PRIMARY KEY,
  serial_no INT NOT NULL,
  website_name VARCHAR(255) NOT NULL,
  website_url TEXT NOT NULL,
  login_username VARCHAR(255) NOT NULL DEFAULT '',
  login_password VARCHAR(255) NOT NULL DEFAULT '',
  technology_used TEXT NOT NULL,
  figma_link TEXT NOT NULL,
  remark TEXT NOT NULL,
  project_manager_id VARCHAR(64) NULL,
  team_member_ids LONGTEXT NOT NULL,
  created_at VARCHAR(64) NOT NULL,
  updated_at VARCHAR(64) NOT NULL,
  UNIQUE KEY projects_serial_no (serial_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS documents (
  id VARCHAR(64) PRIMARY KEY,
  employee_id VARCHAR(64) NOT NULL,
  type VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  expiry_date DATE NULL,
  status VARCHAR(32) NOT NULL,
  uploaded_at DATE NOT NULL,
  mime_type VARCHAR(128) NULL,
  file_data LONGBLOB NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS payroll_records (
  id VARCHAR(64) PRIMARY KEY,
  employee_id VARCHAR(64) NOT NULL,
  period VARCHAR(32) NOT NULL,
  basic_salary DECIMAL(12,2) NOT NULL,
  allowances DECIMAL(12,2) NOT NULL,
  deductions DECIMAL(12,2) NOT NULL,
  gross_salary DECIMAL(12,2) NOT NULL,
  net_salary DECIMAL(12,2) NOT NULL,
  status VARCHAR(32) NOT NULL,
  payslip_available TINYINT(1) NOT NULL DEFAULT 0,
  UNIQUE KEY payroll_employee_period (employee_id, period)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS settings (
  id TINYINT PRIMARY KEY,
  payload LONGTEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
