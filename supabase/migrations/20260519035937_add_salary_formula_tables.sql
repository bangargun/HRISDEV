/*
  # Add Salary Formula Configuration

  1. New Tables
    - `salary_formulas` - Defines formula templates for salary calculation
      Each formula has a name, component type (earning/deduction), calculation method,
      formula expression, and reference to base salary or other components.
    - `salary_formula_components` - Maps formula components to employee salary structure
      Links a formula to specific employees or employment types with custom parameters.

  2. Security
    - RLS enabled on all new tables
    - Authenticated users can read/write (HR use case)

  3. Notes
    - salary_formulas supports multiple calculation methods:
      fixed: flat amount
      percentage: percentage of base salary or another component
      tiered: progressive/tiered calculation (e.g., PPh 21 brackets)
      formula: custom expression referencing other components
    - salary_formula_components allows per-employee overrides of formula parameters
*/

-- Salary Formulas (template definitions)
CREATE TABLE IF NOT EXISTS salary_formulas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  component_type text NOT NULL DEFAULT 'earning' CHECK (component_type IN ('earning', 'deduction')),
  calculation_method text NOT NULL DEFAULT 'fixed' CHECK (calculation_method IN ('fixed', 'percentage', 'tiered', 'formula')),
  base_reference text DEFAULT 'basic_salary' CHECK (base_reference IN ('basic_salary', 'gross_salary', 'net_salary', 'custom')),
  percentage numeric(8,4) DEFAULT 0,
  fixed_amount numeric(15,2) DEFAULT 0,
  formula_expression text DEFAULT '',
  tier_config jsonb DEFAULT '[]',
  is_taxable boolean DEFAULT true,
  is_mandatory boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  description text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Salary Formula Components (per-employee or per-type assignments)
CREATE TABLE IF NOT EXISTS salary_formula_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  formula_id uuid NOT NULL REFERENCES salary_formulas(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  employment_type text CHECK (employment_type IN ('full-time', 'part-time', 'contract', 'intern')),
  custom_percentage numeric(8,4) DEFAULT null,
  custom_fixed_amount numeric(15,2) DEFAULT null,
  custom_tier_config jsonb DEFAULT null,
  is_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE salary_formulas ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_formula_components ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view salary_formulas"
  ON salary_formulas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert salary_formulas"
  ON salary_formulas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update salary_formulas"
  ON salary_formulas FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete salary_formulas"
  ON salary_formulas FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view salary_formula_components"
  ON salary_formula_components FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert salary_formula_components"
  ON salary_formula_components FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update salary_formula_components"
  ON salary_formula_components FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete salary_formula_components"
  ON salary_formula_components FOR DELETE TO authenticated USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_salary_formulas_code ON salary_formulas(code);
CREATE INDEX IF NOT EXISTS idx_salary_formulas_type ON salary_formulas(component_type);
CREATE INDEX IF NOT EXISTS idx_salary_formula_components_formula ON salary_formula_components(formula_id);
CREATE INDEX IF NOT EXISTS idx_salary_formula_components_employee ON salary_formula_components(employee_id);
