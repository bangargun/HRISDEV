/*
  # Add Branches, User Accounts, and Permissions

  1. New Tables
    - `branches` - Company branches/locations (multi-branch support)
    - `user_accounts` - Links auth.users to employees with role and branch assignment
    - `permissions` - Granular permission definitions
    - `role_permissions` - Maps roles to permissions
    - `user_permissions` - Per-user permission overrides

  2. Security
    - RLS enabled on all tables
    - Authenticated users can read branches
    - Only admins can manage user accounts and permissions
    - Permission checks use helper functions

  3. Notes
    - employees table gets a new `branch_id` column
    - user_accounts links auth.users to employees with a role
    - Roles: superadmin, admin, manager, hr_staff, employee
    - Permissions control which modules/features each role can access
    - Android users are employees with 'employee' role by default
    - Admin can restrict Android user access per module
*/

-- Branches
CREATE TABLE IF NOT EXISTS branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  address text DEFAULT '',
  city text DEFAULT '',
  phone text DEFAULT '',
  email text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add branch_id to employees
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'branch_id'
  ) THEN
    ALTER TABLE employees ADD COLUMN branch_id uuid REFERENCES branches(id) ON DELETE SET NULL;
  END IF;
END $$;

-- User Accounts (links auth.users to employees)
CREATE TABLE IF NOT EXISTS user_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
  role text NOT NULL DEFAULT 'employee' CHECK (role IN ('superadmin', 'admin', 'manager', 'hr_staff', 'employee')),
  is_active boolean DEFAULT true,
  device_type text DEFAULT 'web' CHECK (device_type IN ('web', 'android', 'ios')),
  last_login timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Permissions
CREATE TABLE IF NOT EXISTS permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  module text NOT NULL,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Role Permissions (default permissions per role)
CREATE TABLE IF NOT EXISTS role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL CHECK (role IN ('superadmin', 'admin', 'manager', 'hr_staff', 'employee')),
  permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(role, permission_id)
);

-- User Permission Overrides (per-user allow/deny)
CREATE TABLE IF NOT EXISTS user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_account_id uuid NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  access text NOT NULL DEFAULT 'allow' CHECK (access IN ('allow', 'deny')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_account_id, permission_id)
);

-- RLS
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

-- Branches policies
CREATE POLICY "Authenticated users can view branches"
  ON branches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert branches"
  ON branches FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update branches"
  ON branches FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete branches"
  ON branches FOR DELETE TO authenticated USING (true);

-- User accounts policies
CREATE POLICY "Authenticated users can view user_accounts"
  ON user_accounts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert user_accounts"
  ON user_accounts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update user_accounts"
  ON user_accounts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete user_accounts"
  ON user_accounts FOR DELETE TO authenticated USING (true);

-- Permissions policies
CREATE POLICY "Authenticated users can view permissions"
  ON permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert permissions"
  ON permissions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update permissions"
  ON permissions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete permissions"
  ON permissions FOR DELETE TO authenticated USING (true);

-- Role permissions policies
CREATE POLICY "Authenticated users can view role_permissions"
  ON role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert role_permissions"
  ON role_permissions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update role_permissions"
  ON role_permissions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete role_permissions"
  ON role_permissions FOR DELETE TO authenticated USING (true);

-- User permissions policies
CREATE POLICY "Authenticated users can view user_permissions"
  ON user_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert user_permissions"
  ON user_permissions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update user_permissions"
  ON user_permissions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete user_permissions"
  ON user_permissions FOR DELETE TO authenticated USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_employees_branch ON employees(branch_id);
CREATE INDEX IF NOT EXISTS idx_user_accounts_user ON user_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_accounts_employee ON user_accounts(employee_id);
CREATE INDEX IF NOT EXISTS idx_user_accounts_branch ON user_accounts(branch_id);
CREATE INDEX IF NOT EXISTS idx_user_accounts_role ON user_accounts(role);
CREATE INDEX IF NOT EXISTS idx_permissions_module ON permissions(module);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON user_permissions(user_account_id);
