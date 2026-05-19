export interface Database {
  public: {
    Tables: {
      departments: {
        Row: Department;
        Insert: Omit<Department, 'id' | 'created_at'>;
        Update: Partial<Omit<Department, 'id' | 'created_at'>>;
      };
      positions: {
        Row: Position;
        Insert: Omit<Position, 'id' | 'created_at'>;
        Update: Partial<Omit<Position, 'id' | 'created_at'>>;
      };
      employees: {
        Row: Employee;
        Insert: Omit<Employee, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Employee, 'id' | 'created_at' | 'updated_at'>>;
      };
      attendance: {
        Row: Attendance;
        Insert: Omit<Attendance, 'id' | 'created_at'>;
        Update: Partial<Omit<Attendance, 'id' | 'created_at'>>;
      };
      leave_types: {
        Row: LeaveType;
        Insert: Omit<LeaveType, 'id' | 'created_at'>;
        Update: Partial<Omit<LeaveType, 'id' | 'created_at'>>;
      };
      leave_requests: {
        Row: LeaveRequest;
        Insert: Omit<LeaveRequest, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<LeaveRequest, 'id' | 'created_at' | 'updated_at'>>;
      };
      salary_components: {
        Row: SalaryComponent;
        Insert: Omit<SalaryComponent, 'id' | 'created_at'>;
        Update: Partial<Omit<SalaryComponent, 'id' | 'created_at'>>;
      };
      employee_salaries: {
        Row: EmployeeSalary;
        Insert: Omit<EmployeeSalary, 'id' | 'created_at' | 'updated_at' | 'total_earnings' | 'total_deductions' | 'net_salary'>;
        Update: Partial<Omit<EmployeeSalary, 'id' | 'created_at' | 'updated_at' | 'total_earnings' | 'total_deductions' | 'net_salary'>>;
      };
      salary_formulas: {
        Row: SalaryFormula;
        Insert: Omit<SalaryFormula, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<SalaryFormula, 'id' | 'created_at' | 'updated_at'>>;
      };
      salary_formula_components: {
        Row: SalaryFormulaComponent;
        Insert: Omit<SalaryFormulaComponent, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<SalaryFormulaComponent, 'id' | 'created_at' | 'updated_at'>>;
      };
      trainings: {
        Row: Training;
        Insert: Omit<Training, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Training, 'id' | 'created_at' | 'updated_at'>>;
      };
      training_enrollments: {
        Row: TrainingEnrollment;
        Insert: Omit<TrainingEnrollment, 'id' | 'enrolled_at'>;
        Update: Partial<Omit<TrainingEnrollment, 'id' | 'enrolled_at'>>;
      };
      branches: {
        Row: Branch;
        Insert: Omit<Branch, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Branch, 'id' | 'created_at' | 'updated_at'>>;
      };
      user_accounts: {
        Row: UserAccount;
        Insert: Omit<UserAccount, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<UserAccount, 'id' | 'created_at' | 'updated_at'>>;
      };
      permissions: {
        Row: Permission;
        Insert: Omit<Permission, 'id' | 'created_at'>;
        Update: Partial<Omit<Permission, 'id' | 'created_at'>>;
      };
      role_permissions: {
        Row: RolePermission;
        Insert: Omit<RolePermission, 'id' | 'created_at'>;
        Update: Partial<Omit<RolePermission, 'id' | 'created_at'>>;
      };
      user_permissions: {
        Row: UserPermission;
        Insert: Omit<UserPermission, 'id' | 'created_at'>;
        Update: Partial<Omit<UserPermission, 'id' | 'created_at'>>;
      };
    };
  };
}

export interface Department {
  id: string;
  name: string;
  description: string;
  manager_id: string | null;
  created_at: string;
}

export interface Position {
  id: string;
  title: string;
  department_id: string | null;
  level: 'intern' | 'staff' | 'senior' | 'lead' | 'manager' | 'director' | 'vp' | 'c-level';
  description: string;
  created_at: string;
}

export interface Employee {
  id: string;
  employee_id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  position_id: string | null;
  department_id: string | null;
  manager_id: string | null;
  branch_id: string | null;
  employment_type: 'full-time' | 'part-time' | 'contract' | 'intern';
  status: 'active' | 'inactive' | 'terminated' | 'on-leave';
  hire_date: string;
  birth_date: string | null;
  gender: '' | 'male' | 'female' | 'other';
  address: string;
  city: string;
  avatar_url: string;
  salary: number;
  created_at: string;
  updated_at: string;
}

export interface Attendance {
  id: string;
  employee_id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: 'present' | 'absent' | 'late' | 'half-day' | 'holiday' | 'weekend';
  notes: string;
  created_at: string;
}

export interface LeaveType {
  id: string;
  name: string;
  days_allowed: number;
  color: string;
  description: string;
  created_at: string;
}

export interface LeaveRequest {
  id: string;
  employee_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  days_count: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string;
  created_at: string;
  updated_at: string;
}

export interface SalaryComponent {
  id: string;
  name: string;
  component_type: 'earning' | 'deduction';
  description: string;
  is_taxable: boolean;
  is_recurring: boolean;
  created_at: string;
}

export interface EmployeeSalary {
  id: string;
  employee_id: string;
  period_month: number;
  period_year: number;
  basic_salary: number;
  transport_allowance: number;
  meal_allowance: number;
  housing_allowance: number;
  overtime_pay: number;
  bonus: number;
  other_earnings: number;
  bpjs_tk: number;
  bpjs_kesehatan: number;
  pph21: number;
  other_deductions: number;
  total_earnings: number;
  total_deductions: number;
  net_salary: number;
  status: 'draft' | 'approved' | 'paid';
  paid_at: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface SalaryFormula {
  id: string;
  name: string;
  code: string;
  component_type: 'earning' | 'deduction';
  calculation_method: 'fixed' | 'percentage' | 'tiered' | 'formula';
  base_reference: 'basic_salary' | 'gross_salary' | 'net_salary' | 'custom';
  percentage: number;
  fixed_amount: number;
  formula_expression: string;
  tier_config: TierConfig[];
  is_taxable: boolean;
  is_mandatory: boolean;
  sort_order: number;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TierConfig {
  min: number;
  max: number;
  rate: number;
  description: string;
}

export interface SalaryFormulaComponent {
  id: string;
  formula_id: string;
  employee_id: string | null;
  employment_type: 'full-time' | 'part-time' | 'contract' | 'intern' | null;
  custom_percentage: number | null;
  custom_fixed_amount: number | null;
  custom_tier_config: TierConfig[] | null;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface Training {
  id: string;
  title: string;
  description: string;
  trainer: string;
  category: 'general' | 'technical' | 'leadership' | 'compliance' | 'safety' | 'soft-skill';
  start_date: string;
  end_date: string;
  location: string;
  quota: number;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  certificate: boolean;
  created_at: string;
  updated_at: string;
}

export interface TrainingEnrollment {
  id: string;
  training_id: string;
  employee_id: string;
  status: 'enrolled' | 'attended' | 'completed' | 'failed' | 'cancelled';
  score: number | null;
  certificate_url: string;
  notes: string;
  enrolled_at: string;
  completed_at: string | null;
}

export interface Branch {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserAccount {
  id: string;
  user_id: string;
  employee_id: string | null;
  branch_id: string | null;
  role: 'superadmin' | 'admin' | 'manager' | 'hr_staff' | 'employee';
  is_active: boolean;
  device_type: 'web' | 'android' | 'ios';
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: string;
  code: string;
  name: string;
  module: string;
  description: string;
  created_at: string;
}

export interface RolePermission {
  id: string;
  role: 'superadmin' | 'admin' | 'manager' | 'hr_staff' | 'employee';
  permission_id: string;
  created_at: string;
}

export interface UserPermission {
  id: string;
  user_account_id: string;
  permission_id: string;
  access: 'allow' | 'deny';
  created_at: string;
}

// Composite types with relations
export type EmployeeWithRelations = Employee & {
  departments?: Department | null;
  positions?: Position | null;
  branches?: Branch | null;
};

export type LeaveRequestWithRelations = LeaveRequest & {
  employees?: Employee | null;
  leave_types?: LeaveType | null;
};

export type AttendanceWithEmployee = Attendance & {
  employees?: Employee | null;
};

export type EmployeeSalaryWithEmployee = EmployeeSalary & {
  employees?: Employee | null;
};

export type TrainingWithEnrollments = Training & {
  training_enrollments?: TrainingEnrollmentWithEmployee[];
};

export type TrainingEnrollmentWithEmployee = TrainingEnrollment & {
  employees?: Employee | null;
};

export type UserAccountWithDetails = UserAccount & {
  employees?: Employee | null;
  branches?: Branch | null;
};

export type BranchWithCounts = Branch & {
  employee_count?: number;
};
