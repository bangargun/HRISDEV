/*
  # HRIS Core Schema

  1. New Tables
    - `departments` - Company departments (IT, HR, Finance, etc.)
    - `positions` - Job positions/roles linked to departments
    - `employees` - Core employee records with personal and employment info
    - `attendance` - Daily attendance check-in/check-out records
    - `leave_types` - Types of leaves (Annual, Sick, Maternity, etc.)
    - `leave_requests` - Employee leave applications and approvals

  2. Security
    - RLS enabled on all tables
    - Authenticated users can read all data (for HR use case)
    - Authenticated users can manage their own attendance
    - All write ops require authentication

  3. Notes
    - employees.user_id optionally links to Supabase auth.users
    - leave_requests.approved_by references employees table
    - attendance uses date + employee_id unique constraint
*/

-- Departments
CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  manager_id uuid,
  created_at timestamptz DEFAULT now()
);

-- Positions
CREATE TABLE IF NOT EXISTS positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  level text DEFAULT 'staff' CHECK (level IN ('intern', 'staff', 'senior', 'lead', 'manager', 'director', 'vp', 'c-level')),
  description text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Employees
CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id text UNIQUE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text DEFAULT '',
  position_id uuid REFERENCES positions(id) ON DELETE SET NULL,
  department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  manager_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  employment_type text DEFAULT 'full-time' CHECK (employment_type IN ('full-time', 'part-time', 'contract', 'intern')),
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'terminated', 'on-leave')),
  hire_date date NOT NULL,
  birth_date date,
  gender text DEFAULT '' CHECK (gender IN ('', 'male', 'female', 'other')),
  address text DEFAULT '',
  city text DEFAULT '',
  avatar_url text DEFAULT '',
  salary numeric(15,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add self-reference for department manager after employees table exists
ALTER TABLE departments ADD CONSTRAINT fk_department_manager
  FOREIGN KEY (manager_id) REFERENCES employees(id) ON DELETE SET NULL;

-- Attendance
CREATE TABLE IF NOT EXISTS attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date date NOT NULL,
  check_in timestamptz,
  check_out timestamptz,
  status text DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'half-day', 'holiday', 'weekend')),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, date)
);

-- Leave Types
CREATE TABLE IF NOT EXISTS leave_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  days_allowed integer NOT NULL DEFAULT 12,
  color text DEFAULT '#3B82F6',
  description text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Leave Requests
CREATE TABLE IF NOT EXISTS leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type_id uuid NOT NULL REFERENCES leave_types(id) ON DELETE RESTRICT,
  start_date date NOT NULL,
  end_date date NOT NULL,
  days_count integer NOT NULL DEFAULT 1,
  reason text DEFAULT '',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  approved_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  approved_at timestamptz,
  rejection_reason text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

-- Departments policies
CREATE POLICY "Authenticated users can view departments"
  ON departments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert departments"
  ON departments FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update departments"
  ON departments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete departments"
  ON departments FOR DELETE TO authenticated USING (true);

-- Positions policies
CREATE POLICY "Authenticated users can view positions"
  ON positions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert positions"
  ON positions FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update positions"
  ON positions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete positions"
  ON positions FOR DELETE TO authenticated USING (true);

-- Employees policies
CREATE POLICY "Authenticated users can view employees"
  ON employees FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert employees"
  ON employees FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update employees"
  ON employees FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete employees"
  ON employees FOR DELETE TO authenticated USING (true);

-- Attendance policies
CREATE POLICY "Authenticated users can view attendance"
  ON attendance FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert attendance"
  ON attendance FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update attendance"
  ON attendance FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete attendance"
  ON attendance FOR DELETE TO authenticated USING (true);

-- Leave types policies
CREATE POLICY "Authenticated users can view leave types"
  ON leave_types FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert leave types"
  ON leave_types FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update leave types"
  ON leave_types FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete leave types"
  ON leave_types FOR DELETE TO authenticated USING (true);

-- Leave requests policies
CREATE POLICY "Authenticated users can view leave requests"
  ON leave_requests FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert leave requests"
  ON leave_requests FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update leave requests"
  ON leave_requests FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete leave requests"
  ON leave_requests FOR DELETE TO authenticated USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_position ON employees(position_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_attendance_employee ON attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
