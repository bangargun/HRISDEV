import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { api } from './api';

export interface UserSession {
  id: string;
  email: string;
  role: 'admin' | 'leader' | 'employee';
  employee_id?: string;
  employee_name?: string;
  branch_id?: string;
}

interface AuthContextType {
  user: UserSession | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (data: {
    email: string;
    password: string;
    profile: {
      firstName: string;
      lastName: string;
      phone: string;
      gender: string;
      birthDate: string;
      address: string;
      city: string;
    };
  }) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // Fetch user account and role from user_accounts table
          const userAccounts = await api.select('user_accounts', { filter: `user_id.eq.${session.user.id}` }) as any[];
          if (userAccounts && userAccounts.length > 0) {
            const ua = userAccounts[0];
            // Fetch employee data to get name
            if (ua.employee_id) {
              const employees = await api.select('employees', { filter: `id.eq.${ua.employee_id}` }) as any[];
              if (employees && employees.length > 0) {
                const emp = employees[0];
                setUser({
                  id: session.user.id,
                  email: session.user.email || '',
                  role: ua.role,
                  employee_id: ua.employee_id,
                  employee_name: `${emp.first_name} ${emp.last_name}`,
                  branch_id: ua.branch_id,
                });
              }
            } else {
              setUser({
                id: session.user.id,
                email: session.user.email || '',
                role: ua.role,
              });
            }
          }
        }
      } catch (err) {
        console.error('Auth check failed:', err);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        try {
          const userAccounts = await api.select('user_accounts', { filter: `user_id.eq.${session.user.id}` }) as any[];
          if (userAccounts && userAccounts.length > 0) {
            const ua = userAccounts[0];
            if (ua.employee_id) {
              const employees = await api.select('employees', { filter: `id.eq.${ua.employee_id}` }) as any[];
              if (employees && employees.length > 0) {
                const emp = employees[0];
                setUser({
                  id: session.user.id,
                  email: session.user.email || '',
                  role: ua.role,
                  employee_id: ua.employee_id,
                  employee_name: `${emp.first_name} ${emp.last_name}`,
                  branch_id: ua.branch_id,
                });
              }
            } else {
              setUser({
                id: session.user.id,
                email: session.user.email || '',
                role: ua.role,
              });
            }
          }
        } catch (err) {
          console.error('Failed to load user data:', err);
        }
      } else {
        setUser(null);
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signUp(data: {
    email: string;
    password: string;
    profile: {
      firstName: string;
      lastName: string;
      phone: string;
      gender: string;
      birthDate: string;
      address: string;
      city: string;
    };
  }) {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Registrasi gagal');

    try {
      const employeeResponse = await api.insert('employees', {
        employee_id: `EMP-${Date.now()}`,
        first_name: data.profile.firstName,
        last_name: data.profile.lastName,
        email: data.email,
        phone: data.profile.phone,
        gender: data.profile.gender,
        birth_date: data.profile.birthDate,
        address: data.profile.address,
        city: data.profile.city,
        status: 'active',
        employment_type: 'full-time',
        hire_date: new Date().toISOString(),
        department_id: null,
        position_id: null,
        branch_id: null,
      });

      if (!employeeResponse || employeeResponse.length === 0) {
        throw new Error('Gagal membuat profil karyawan');
      }

      const employeeId = employeeResponse[0].id;

      const userAccountResponse = await api.insert('user_accounts', {
        user_id: authData.user.id,
        employee_id: employeeId,
        role: 'employee',
        branch_id: null,
      });

      if (!userAccountResponse) {
        throw new Error('Gagal membuat akun pengguna');
      }

      await signIn(data.email, data.password);
    } catch (err) {
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw err;
    }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
