/*
  # Seed Demo User Accounts with Authentication

  1. Creates demo auth users and user_accounts
  2. Demo credentials:
     - Admin: admin@hris.com / Admin@123
     - Leader: leader@hris.com / Leader@123
     - Employee: employee@hris.com / Employee@123
  3. Links users to employees already in the database
*/

-- Note: Auth users must be created via the API, not SQL
-- This migration assumes the auth users are already created via supabase.auth.signUp()
-- The user_accounts records should be created once the auth user IDs are obtained

-- If you need to seed these accounts, use the edge function or frontend to:
-- 1. Create auth users via supabase.auth.signUp()
-- 2. Create user_accounts records linking to employees

-- For now, we'll just add a comment with the steps to create demo accounts manually
-- After running this migration, create demo accounts as follows:

-- Step 1: Use the edge function or frontend signup to create these accounts:
-- - admin@hris.com / Admin@123
-- - leader@hris.com / Leader@123  
-- - employee@hris.com / Employee@123

-- Step 2: Get their user IDs from auth.users table and link them:
-- INSERT INTO user_accounts (user_id, employee_id, branch_id, role, device_type, is_active) VALUES
-- ('<admin_user_id>', '<first_employee_id>', NULL, 'admin', 'web', true),
-- ('<leader_user_id>', '<second_employee_id>', NULL, 'leader', 'web', true),
-- ('<employee_user_id>', '<third_employee_id>', NULL, 'employee', 'web', true);
