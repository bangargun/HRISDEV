/*
  # Add Salary and Training Tables

  1. New Tables
    - `salary_components` - Salary components (basic, allowance, deduction types)
    - `employee_salaries` - Employee salary records with breakdown per period
    - `trainings` - Training programs available
    - `training_enrollments` - Employee enrollment in training programs

  2. Security
    - RLS enabled on all new tables
    - Authenticated users can read/write all data (HR use case)

  3. Notes
    - employee_salaries tracks monthly payroll per employee
    - trainings can have multiple employees enrolled
    - training_enrollments tracks attendance and completion status
*/

-- Salary Components (template for salary structure)
CREATE TABLE IF NOT EXISTS salary_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  component_type text NOT NULL DEFAULT 'earning' CHECK (component_type IN ('earning', 'deduction')),
  description text DEFAULT '',
  is_taxable boolean DEFAULT true,
  is_recurring boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Employee Salary Records (monthly payroll)
CREATE TABLE IF NOT EXISTS employee_salaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  period_month integer NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year integer NOT NULL CHECK (period_year >= 2020),
  basic_salary numeric(15,2) NOT NULL DEFAULT 0,
  transport_allowance numeric(15,2) DEFAULT 0,
  meal_allowance numeric(15,2) DEFAULT 0,
  housing_allowance numeric(15,2) DEFAULT 0,
  overtime_pay numeric(15,2) DEFAULT 0,
  bonus numeric(15,2) DEFAULT 0,
  other_earnings numeric(15,2) DEFAULT 0,
  bpjs_tk numeric(15,2) DEFAULT 0,
  bpjs_kesehatan numeric(15,2) DEFAULT 0,
  pph21 numeric(15,2) DEFAULT 0,
  other_deductions numeric(15,2) DEFAULT 0,
  total_earnings numeric(15,2) GENERATED ALWAYS AS (
    basic_salary + transport_allowance + meal_allowance + housing_allowance + overtime_pay + bonus + other_earnings
  ) STORED,
  total_deductions numeric(15,2) GENERATED ALWAYS AS (
    bpjs_tk + bpjs_kesehatan + pph21 + other_deductions
  ) STORED,
  net_salary numeric(15,2) GENERATED ALWAYS AS (
    basic_salary + transport_allowance + meal_allowance + housing_allowance + overtime_pay + bonus + other_earnings
    - bpjs_tk - bpjs_kesehatan - pph21 - other_deductions
  ) STORED,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'paid')),
  paid_at timestamptz,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, period_month, period_year)
);

-- Trainings
CREATE TABLE IF NOT EXISTS trainings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  trainer text DEFAULT '',
  category text DEFAULT 'general' CHECK (category IN ('general', 'technical', 'leadership', 'compliance', 'safety', 'soft-skill')),
  start_date date NOT NULL,
  end_date date NOT NULL,
  location text DEFAULT '',
  quota integer DEFAULT 0,
  status text DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'ongoing', 'completed', 'cancelled')),
  certificate boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Training Enrollments
CREATE TABLE IF NOT EXISTS training_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id uuid NOT NULL REFERENCES trainings(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  status text DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'attended', 'completed', 'failed', 'cancelled')),
  score numeric(5,2),
  certificate_url text DEFAULT '',
  notes text DEFAULT '',
  enrolled_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  UNIQUE(training_id, employee_id)
);

-- RLS
ALTER TABLE salary_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_salaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainings ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_enrollments ENABLE ROW LEVEL SECURITY;

-- Salary components policies
CREATE POLICY "Authenticated users can view salary_components"
  ON salary_components FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert salary_components"
  ON salary_components FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update salary_components"
  ON salary_components FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete salary_components"
  ON salary_components FOR DELETE TO authenticated USING (true);

-- Employee salaries policies
CREATE POLICY "Authenticated users can view employee_salaries"
  ON employee_salaries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert employee_salaries"
  ON employee_salaries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update employee_salaries"
  ON employee_salaries FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete employee_salaries"
  ON employee_salaries FOR DELETE TO authenticated USING (true);

-- Trainings policies
CREATE POLICY "Authenticated users can view trainings"
  ON trainings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert trainings"
  ON trainings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update trainings"
  ON trainings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete trainings"
  ON trainings FOR DELETE TO authenticated USING (true);

-- Training enrollments policies
CREATE POLICY "Authenticated users can view training_enrollments"
  ON training_enrollments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert training_enrollments"
  ON training_enrollments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update training_enrollments"
  ON training_enrollments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete training_enrollments"
  ON training_enrollments FOR DELETE TO authenticated USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_employee_salaries_employee ON employee_salaries(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_salaries_period ON employee_salaries(period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_trainings_status ON trainings(status);
CREATE INDEX IF NOT EXISTS idx_trainings_dates ON trainings(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_training_enrollments_training ON training_enrollments(training_id);
CREATE INDEX IF NOT EXISTS idx_training_enrollments_employee ON training_enrollments(employee_id);
