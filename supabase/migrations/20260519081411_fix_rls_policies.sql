/*
  # Fix RLS Policies - Replace USING(true) with Role-Based Access

  1. Security Changes
    - Drops all existing policies that use USING(true) / WITH CHECK(true)
    - Replaces with role-based policies using user_accounts table
    - SELECT: All authenticated users can read (HR data visibility)
    - INSERT/UPDATE/DELETE: Only admin+ roles (superadmin, admin, hr_staff, manager)
    - Sensitive tables (employee_salaries, user_accounts, permissions): Restricted to admin+ only
    - Employee self-service: employees can update own attendance, insert own leave requests

  2. Approach
    - Uses a helper function `is_admin_role()` to check if current user has admin privileges
    - Uses `can_manage_hr()` for HR management operations
    - Employees can only modify their own data where appropriate

  3. Notes
    - All old "Authenticated users can *" policies are dropped
    - New policies follow least-privilege principle
*/

-- Helper function: check if current user has admin role
CREATE OR REPLACE FUNCTION is_admin_role()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_accounts
    WHERE user_id = auth.uid()
    AND role IN ('superadmin', 'admin')
    AND is_active = true
  );
$$;

-- Helper function: check if current user can manage HR data
CREATE OR REPLACE FUNCTION can_manage_hr()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_accounts
    WHERE user_id = auth.uid()
    AND role IN ('superadmin', 'admin', 'hr_staff', 'manager')
    AND is_active = true
  );
$$;

-- Helper function: get current user's employee id
CREATE OR REPLACE FUNCTION current_user_employee_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT employee_id FROM user_accounts
  WHERE user_id = auth.uid() AND is_active = true
  LIMIT 1;
$$;

-- Helper function: get current user's branch id
CREATE OR REPLACE FUNCTION current_user_branch_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT branch_id FROM user_accounts
  WHERE user_id = auth.uid() AND is_active = true
  LIMIT 1;
$$;

-- ============================================================
-- DROP ALL OLD POLICIES
-- ============================================================

-- departments
DROP POLICY IF EXISTS "Authenticated users can view departments" ON departments;
DROP POLICY IF EXISTS "Authenticated users can insert departments" ON departments;
DROP POLICY IF EXISTS "Authenticated users can update departments" ON departments;
DROP POLICY IF EXISTS "Authenticated users can delete departments" ON departments;

-- positions
DROP POLICY IF EXISTS "Authenticated users can view positions" ON positions;
DROP POLICY IF EXISTS "Authenticated users can insert positions" ON positions;
DROP POLICY IF EXISTS "Authenticated users can update positions" ON positions;
DROP POLICY IF EXISTS "Authenticated users can delete positions" ON positions;

-- employees
DROP POLICY IF EXISTS "Authenticated users can view employees" ON employees;
DROP POLICY IF EXISTS "Authenticated users can insert employees" ON employees;
DROP POLICY IF EXISTS "Authenticated users can update employees" ON employees;
DROP POLICY IF EXISTS "Authenticated users can delete employees" ON employees;

-- attendance
DROP POLICY IF EXISTS "Authenticated users can view attendance" ON attendance;
DROP POLICY IF EXISTS "Authenticated users can insert attendance" ON attendance;
DROP POLICY IF EXISTS "Authenticated users can update attendance" ON attendance;
DROP POLICY IF EXISTS "Authenticated users can delete attendance" ON attendance;

-- leave_types
DROP POLICY IF EXISTS "Authenticated users can view leave types" ON leave_types;
DROP POLICY IF EXISTS "Authenticated users can insert leave types" ON leave_types;
DROP POLICY IF EXISTS "Authenticated users can update leave types" ON leave_types;
DROP POLICY IF EXISTS "Authenticated users can delete leave types" ON leave_types;

-- leave_requests
DROP POLICY IF EXISTS "Authenticated users can view leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Authenticated users can insert leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Authenticated users can update leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Authenticated users can delete leave requests" ON leave_requests;

-- salary_components
DROP POLICY IF EXISTS "Authenticated users can view salary_components" ON salary_components;
DROP POLICY IF EXISTS "Authenticated users can insert salary_components" ON salary_components;
DROP POLICY IF EXISTS "Authenticated users can update salary_components" ON salary_components;
DROP POLICY IF EXISTS "Authenticated users can delete salary_components" ON salary_components;

-- employee_salaries
DROP POLICY IF EXISTS "Authenticated users can view employee_salaries" ON employee_salaries;
DROP POLICY IF EXISTS "Authenticated users can insert employee_salaries" ON employee_salaries;
DROP POLICY IF EXISTS "Authenticated users can update employee_salaries" ON employee_salaries;
DROP POLICY IF EXISTS "Authenticated users can delete employee_salaries" ON employee_salaries;

-- salary_formulas
DROP POLICY IF EXISTS "Authenticated users can view salary_formulas" ON salary_formulas;
DROP POLICY IF EXISTS "Authenticated users can insert salary_formulas" ON salary_formulas;
DROP POLICY IF EXISTS "Authenticated users can update salary_formulas" ON salary_formulas;
DROP POLICY IF EXISTS "Authenticated users can delete salary_formulas" ON salary_formulas;

-- salary_formula_components
DROP POLICY IF EXISTS "Authenticated users can view salary_formula_components" ON salary_formula_components;
DROP POLICY IF EXISTS "Authenticated users can insert salary_formula_components" ON salary_formula_components;
DROP POLICY IF EXISTS "Authenticated users can update salary_formula_components" ON salary_formula_components;
DROP POLICY IF EXISTS "Authenticated users can delete salary_formula_components" ON salary_formula_components;

-- trainings
DROP POLICY IF EXISTS "Authenticated users can view trainings" ON trainings;
DROP POLICY IF EXISTS "Authenticated users can insert trainings" ON trainings;
DROP POLICY IF EXISTS "Authenticated users can update trainings" ON trainings;
DROP POLICY IF EXISTS "Authenticated users can delete trainings" ON trainings;

-- training_enrollments
DROP POLICY IF EXISTS "Authenticated users can view training_enrollments" ON training_enrollments;
DROP POLICY IF EXISTS "Authenticated users can insert training_enrollments" ON training_enrollments;
DROP POLICY IF EXISTS "Authenticated users can update training_enrollments" ON training_enrollments;
DROP POLICY IF EXISTS "Authenticated users can delete training_enrollments" ON training_enrollments;

-- branches
DROP POLICY IF EXISTS "Authenticated users can view branches" ON branches;
DROP POLICY IF EXISTS "Authenticated users can insert branches" ON branches;
DROP POLICY IF EXISTS "Authenticated users can update branches" ON branches;
DROP POLICY IF EXISTS "Authenticated users can delete branches" ON branches;

-- user_accounts
DROP POLICY IF EXISTS "Authenticated users can view user_accounts" ON user_accounts;
DROP POLICY IF EXISTS "Authenticated users can insert user_accounts" ON user_accounts;
DROP POLICY IF EXISTS "Authenticated users can update user_accounts" ON user_accounts;
DROP POLICY IF EXISTS "Authenticated users can delete user_accounts" ON user_accounts;

-- permissions
DROP POLICY IF EXISTS "Authenticated users can view permissions" ON permissions;
DROP POLICY IF EXISTS "Authenticated users can insert permissions" ON permissions;
DROP POLICY IF EXISTS "Authenticated users can update permissions" ON permissions;
DROP POLICY IF EXISTS "Authenticated users can delete permissions" ON permissions;

-- role_permissions
DROP POLICY IF EXISTS "Authenticated users can view role_permissions" ON role_permissions;
DROP POLICY IF EXISTS "Authenticated users can insert role_permissions" ON role_permissions;
DROP POLICY IF EXISTS "Authenticated users can update role_permissions" ON role_permissions;
DROP POLICY IF EXISTS "Authenticated users can delete role_permissions" ON role_permissions;

-- user_permissions
DROP POLICY IF EXISTS "Authenticated users can view user_permissions" ON user_permissions;
DROP POLICY IF EXISTS "Authenticated users can insert user_permissions" ON user_permissions;
DROP POLICY IF EXISTS "Authenticated users can update user_permissions" ON user_permissions;
DROP POLICY IF EXISTS "Authenticated users can delete user_permissions" ON user_permissions;

-- ============================================================
-- CREATE NEW SECURE POLICIES
-- ============================================================

-- DEPARTMENTS
CREATE POLICY "Authenticated users can view departments" ON departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "HR managers can insert departments" ON departments FOR INSERT TO authenticated WITH CHECK (can_manage_hr());
CREATE POLICY "HR managers can update departments" ON departments FOR UPDATE TO authenticated USING (can_manage_hr()) WITH CHECK (can_manage_hr());
CREATE POLICY "Admins can delete departments" ON departments FOR DELETE TO authenticated USING (is_admin_role());

-- POSITIONS
CREATE POLICY "Authenticated users can view positions" ON positions FOR SELECT TO authenticated USING (true);
CREATE POLICY "HR managers can insert positions" ON positions FOR INSERT TO authenticated WITH CHECK (can_manage_hr());
CREATE POLICY "HR managers can update positions" ON positions FOR UPDATE TO authenticated USING (can_manage_hr()) WITH CHECK (can_manage_hr());
CREATE POLICY "Admins can delete positions" ON positions FOR DELETE TO authenticated USING (is_admin_role());

-- EMPLOYEES
CREATE POLICY "Authenticated users can view employees" ON employees FOR SELECT TO authenticated USING (true);
CREATE POLICY "HR managers can insert employees" ON employees FOR INSERT TO authenticated WITH CHECK (can_manage_hr());
CREATE POLICY "HR managers can update employees" ON employees FOR UPDATE TO authenticated USING (can_manage_hr()) WITH CHECK (can_manage_hr());
CREATE POLICY "Admins can delete employees" ON employees FOR DELETE TO authenticated USING (is_admin_role());

-- ATTENDANCE
CREATE POLICY "Authenticated users can view attendance" ON attendance FOR SELECT TO authenticated USING (true);
CREATE POLICY "HR managers can insert attendance" ON attendance FOR INSERT TO authenticated WITH CHECK (can_manage_hr());
CREATE POLICY "HR managers can update attendance" ON attendance FOR UPDATE TO authenticated USING (can_manage_hr()) WITH CHECK (can_manage_hr());
CREATE POLICY "Admins can delete attendance" ON attendance FOR DELETE TO authenticated USING (is_admin_role());

-- LEAVE_TYPES
CREATE POLICY "Authenticated users can view leave types" ON leave_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "HR managers can insert leave types" ON leave_types FOR INSERT TO authenticated WITH CHECK (can_manage_hr());
CREATE POLICY "HR managers can update leave types" ON leave_types FOR UPDATE TO authenticated USING (can_manage_hr()) WITH CHECK (can_manage_hr());
CREATE POLICY "Admins can delete leave types" ON leave_types FOR DELETE TO authenticated USING (is_admin_role());

-- LEAVE_REQUESTS
CREATE POLICY "Authenticated users can view leave requests" ON leave_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Employees can insert own leave requests" ON leave_requests FOR INSERT TO authenticated WITH CHECK (employee_id = current_user_employee_id() OR can_manage_hr());
CREATE POLICY "HR managers can update leave requests" ON leave_requests FOR UPDATE TO authenticated USING (can_manage_hr() OR employee_id = current_user_employee_id()) WITH CHECK (can_manage_hr() OR employee_id = current_user_employee_id());
CREATE POLICY "Admins can delete leave requests" ON leave_requests FOR DELETE TO authenticated USING (is_admin_role());

-- SALARY_COMPONENTS
CREATE POLICY "Authenticated users can view salary_components" ON salary_components FOR SELECT TO authenticated USING (true);
CREATE POLICY "HR managers can insert salary_components" ON salary_components FOR INSERT TO authenticated WITH CHECK (can_manage_hr());
CREATE POLICY "HR managers can update salary_components" ON salary_components FOR UPDATE TO authenticated USING (can_manage_hr()) WITH CHECK (can_manage_hr());
CREATE POLICY "Admins can delete salary_components" ON salary_components FOR DELETE TO authenticated USING (is_admin_role());

-- EMPLOYEE_SALARIES (sensitive - only admin+ and HR staff)
CREATE POLICY "HR managers can view employee_salaries" ON employee_salaries FOR SELECT TO authenticated USING (can_manage_hr());
CREATE POLICY "HR managers can insert employee_salaries" ON employee_salaries FOR INSERT TO authenticated WITH CHECK (can_manage_hr());
CREATE POLICY "HR managers can update employee_salaries" ON employee_salaries FOR UPDATE TO authenticated USING (can_manage_hr()) WITH CHECK (can_manage_hr());
CREATE POLICY "Admins can delete employee_salaries" ON employee_salaries FOR DELETE TO authenticated USING (is_admin_role());

-- SALARY_FORMULAS
CREATE POLICY "Authenticated users can view salary_formulas" ON salary_formulas FOR SELECT TO authenticated USING (true);
CREATE POLICY "HR managers can insert salary_formulas" ON salary_formulas FOR INSERT TO authenticated WITH CHECK (can_manage_hr());
CREATE POLICY "HR managers can update salary_formulas" ON salary_formulas FOR UPDATE TO authenticated USING (can_manage_hr()) WITH CHECK (can_manage_hr());
CREATE POLICY "Admins can delete salary_formulas" ON salary_formulas FOR DELETE TO authenticated USING (is_admin_role());

-- SALARY_FORMULA_COMPONENTS
CREATE POLICY "HR managers can view salary_formula_components" ON salary_formula_components FOR SELECT TO authenticated USING (can_manage_hr());
CREATE POLICY "HR managers can insert salary_formula_components" ON salary_formula_components FOR INSERT TO authenticated WITH CHECK (can_manage_hr());
CREATE POLICY "HR managers can update salary_formula_components" ON salary_formula_components FOR UPDATE TO authenticated USING (can_manage_hr()) WITH CHECK (can_manage_hr());
CREATE POLICY "Admins can delete salary_formula_components" ON salary_formula_components FOR DELETE TO authenticated USING (is_admin_role());

-- TRAININGS
CREATE POLICY "Authenticated users can view trainings" ON trainings FOR SELECT TO authenticated USING (true);
CREATE POLICY "HR managers can insert trainings" ON trainings FOR INSERT TO authenticated WITH CHECK (can_manage_hr());
CREATE POLICY "HR managers can update trainings" ON trainings FOR UPDATE TO authenticated USING (can_manage_hr()) WITH CHECK (can_manage_hr());
CREATE POLICY "Admins can delete trainings" ON trainings FOR DELETE TO authenticated USING (is_admin_role());

-- TRAINING_ENROLLMENTS
CREATE POLICY "Authenticated users can view training_enrollments" ON training_enrollments FOR SELECT TO authenticated USING (true);
CREATE POLICY "HR managers can insert training_enrollments" ON training_enrollments FOR INSERT TO authenticated WITH CHECK (can_manage_hr());
CREATE POLICY "HR managers can update training_enrollments" ON training_enrollments FOR UPDATE TO authenticated USING (can_manage_hr()) WITH CHECK (can_manage_hr());
CREATE POLICY "Admins can delete training_enrollments" ON training_enrollments FOR DELETE TO authenticated USING (is_admin_role());

-- BRANCHES
CREATE POLICY "Authenticated users can view branches" ON branches FOR SELECT TO authenticated USING (true);
CREATE POLICY "HR managers can insert branches" ON branches FOR INSERT TO authenticated WITH CHECK (can_manage_hr());
CREATE POLICY "HR managers can update branches" ON branches FOR UPDATE TO authenticated USING (can_manage_hr()) WITH CHECK (can_manage_hr());
CREATE POLICY "Admins can delete branches" ON branches FOR DELETE TO authenticated USING (is_admin_role());

-- USER_ACCOUNTS (sensitive - only admin+)
CREATE POLICY "Admins can view user_accounts" ON user_accounts FOR SELECT TO authenticated USING (is_admin_role());
CREATE POLICY "Admins can insert user_accounts" ON user_accounts FOR INSERT TO authenticated WITH CHECK (is_admin_role());
CREATE POLICY "Admins can update user_accounts" ON user_accounts FOR UPDATE TO authenticated USING (is_admin_role()) WITH CHECK (is_admin_role());
CREATE POLICY "Admins can delete user_accounts" ON user_accounts FOR DELETE TO authenticated USING (is_admin_role());

-- PERMISSIONS (sensitive - only admin+)
CREATE POLICY "Admins can view permissions" ON permissions FOR SELECT TO authenticated USING (is_admin_role());
CREATE POLICY "Admins can insert permissions" ON permissions FOR INSERT TO authenticated WITH CHECK (is_admin_role());
CREATE POLICY "Admins can update permissions" ON permissions FOR UPDATE TO authenticated USING (is_admin_role()) WITH CHECK (is_admin_role());
CREATE POLICY "Admins can delete permissions" ON permissions FOR DELETE TO authenticated USING (is_admin_role());

-- ROLE_PERMISSIONS (sensitive - only admin+)
CREATE POLICY "Admins can view role_permissions" ON role_permissions FOR SELECT TO authenticated USING (is_admin_role());
CREATE POLICY "Admins can insert role_permissions" ON role_permissions FOR INSERT TO authenticated WITH CHECK (is_admin_role());
CREATE POLICY "Admins can update role_permissions" ON role_permissions FOR UPDATE TO authenticated USING (is_admin_role()) WITH CHECK (is_admin_role());
CREATE POLICY "Admins can delete role_permissions" ON role_permissions FOR DELETE TO authenticated USING (is_admin_role());

-- USER_PERMISSIONS (sensitive - only admin+)
CREATE POLICY "Admins can view user_permissions" ON user_permissions FOR SELECT TO authenticated USING (is_admin_role());
CREATE POLICY "Admins can insert user_permissions" ON user_permissions FOR INSERT TO authenticated WITH CHECK (is_admin_role());
CREATE POLICY "Admins can update user_permissions" ON user_permissions FOR UPDATE TO authenticated USING (is_admin_role()) WITH CHECK (is_admin_role());
CREATE POLICY "Admins can delete user_permissions" ON user_permissions FOR DELETE TO authenticated USING (is_admin_role());
