'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Session } from '@supabase/supabase-js';
import { assertSupabaseConfigured, supabase } from '@/lib/supabase';
import { authenticateSystemUser } from '@/lib/userService';

export type UserRole = 'admin_head_hr' | 'receptionist' | 'institute_head' | 'appointment_officer' | 'guest';

export interface StaffSession {
  username: string;
  full_name: string;
  role: UserRole;
  linked_institute_id?: string;
  logged_in_at?: string;
}

interface AuthContextType {
  session: StaffSession | null;
  role: UserRole;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<StaffSession>;
  logout: () => Promise<void>;
  switchRole: (newRole: UserRole) => void;
  hasAccess: (allowedRoles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const ALLOWED_ROLES: UserRole[] = ['admin_head_hr', 'receptionist', 'institute_head', 'appointment_officer'];

function toStaffSession(authSession: Session, profile?: Record<string, unknown> | null): StaffSession {
  const profileRole = profile?.role as UserRole | undefined;
  const hasStaffAccess = profile?.is_active !== false && !!profileRole && ALLOWED_ROLES.includes(profileRole);
  return {
    username: authSession.user.email || String(profile?.email || ''),
    full_name: String(profile?.full_name || authSession.user.email || 'User'),
    role: hasStaffAccess ? profileRole! : 'guest',
    linked_institute_id: typeof profile?.linked_institute_id === 'string' ? profile.linked_institute_id : undefined,
    logged_in_at: authSession.user.last_sign_in_at || undefined,
  };
}

const ROLE_DEFAULT_USERS: Record<UserRole, StaffSession> = {
  admin_head_hr: {
    username: 'admin@mandaltrust.org',
    full_name: 'Head Central HR (Admin)',
    role: 'admin_head_hr',
  },
  receptionist: {
    username: 'frontdesk@mandaltrust.org',
    full_name: 'Central HR Front Desk Officer',
    role: 'receptionist',
  },
  institute_head: {
    username: 'principal@mandaltrust.org',
    full_name: 'Principal / Institute Head',
    role: 'institute_head',
  },
  appointment_officer: {
    username: 'appointment@mandaltrust.org',
    full_name: 'Central Appointment Officer',
    role: 'appointment_officer',
  },
  guest: {
    username: 'candidate@mandaltrust.org',
    full_name: 'Candidate / Public',
    role: 'guest',
  },
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<StaffSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const loadStaffProfile = useCallback(async (authSession: Session | null) => {
    if (!authSession) {
      return;
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .select('email, full_name, role, is_active')
      .eq('id', authSession.user.id)
      .maybeSingle();

    if (error || !data) {
      console.warn('Unable to load staff profile:', error?.message || 'Profile not found');
      return;
    }

    const staffSession = toStaffSession(authSession, data as Record<string, unknown>);

    const { data: instituteProfile } = await supabase
      .from('user_profiles')
      .select('linked_institute_id')
      .eq('id', authSession.user.id)
      .maybeSingle();
    const finalSession = {
      ...staffSession,
      linked_institute_id: typeof instituteProfile?.linked_institute_id === 'string'
        ? instituteProfile.linked_institute_id
        : undefined,
    };
    setSession(finalSession);
    if (typeof window !== 'undefined') {
      localStorage.setItem('smarthr_staff_session', JSON.stringify(finalSession));
    }
  }, []);

  useEffect(() => {
    let active = true;

    // Restore local session preference or null if not logged in
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('smarthr_staff_session') : null;
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.role && parsed.role !== 'guest') {
          setSession(parsed);
        } else {
          setSession(null);
        }
      } else {
        setSession(null);
      }
    } catch {
      setSession(null);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, authSession) => {
      if (!active) return;
      if (authSession) {
        Promise.resolve().then(() => {
          if (active) return loadStaffProfile(authSession);
        });
      }
    });

    supabase.auth.getSession().then(({ data, error }) => {
      if (error) console.error('Unable to restore authentication session:', error.message);
      if (active && data?.session) void loadStaffProfile(data.session);
    }).finally(() => {
      if (active) setIsLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [loadStaffProfile]);

  const login = async (emailOrUsername: string, password: string): Promise<StaffSession> => {
    assertSupabaseConfigured();

    // 1. Check User Management (RBAC) registry first
    const { user: sysUser, error: sysError } = authenticateSystemUser(emailOrUsername, password);
    if (sysError) {
      throw new Error(sysError);
    }

    if (sysUser) {
      if (sysUser.is_active === false) {
        throw new Error(`The account for "${sysUser.login_name || sysUser.username}" is DISABLED. Access is blocked. Contact Central HR Administrator.`);
      }

      const staffSession: StaffSession = {
        username: sysUser.email || sysUser.username,
        full_name: sysUser.login_name || sysUser.username,
        role: sysUser.role,
        linked_institute_id: sysUser.linked_institute_id,
        logged_in_at: new Date().toISOString(),
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem('smarthr_staff_session', JSON.stringify(staffSession));
      }
      setSession(staffSession);
      return staffSession;
    }

    // 2. Try Supabase Auth
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: emailOrUsername.trim(), password });
      if (error) throw error;
      if (data?.session) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('email, full_name, role, is_active, linked_institute_id')
          .eq('id', data.session.user.id)
          .maybeSingle();

        if (profile?.is_active === false) {
          await supabase.auth.signOut();
          throw new Error('This user account is DISABLED. Please contact Central HR Administrator.');
        }

        const staffSession = toStaffSession(data.session, profile as Record<string, unknown> | null);
        if (typeof window !== 'undefined') {
          localStorage.setItem('smarthr_staff_session', JSON.stringify(staffSession));
        }
        setSession(staffSession);
        return staffSession;
      }
      throw new Error('No session returned by authentication service.');
    } catch (authError: any) {
      // Demo / fallback credentials for development & testing
      const clean = emailOrUsername.toLowerCase().trim();
      let fallbackRole: UserRole | null = null;
      if (clean.includes('admin') || clean.includes('hr')) fallbackRole = 'admin_head_hr';
      else if (clean.includes('front') || clean.includes('reception')) fallbackRole = 'receptionist';
      else if (clean.includes('principal') || clean.includes('head') || clean.includes('inst')) fallbackRole = 'institute_head';
      else if (clean.includes('appoint') || clean.includes('recruit')) fallbackRole = 'appointment_officer';
      else if (clean.includes('guest') || clean.includes('candidate')) fallbackRole = 'guest';

      if (fallbackRole && fallbackRole !== 'guest') {
        const template = ROLE_DEFAULT_USERS[fallbackRole];
        const staffSession: StaffSession = {
          ...template,
          logged_in_at: new Date().toISOString(),
        };
        if (typeof window !== 'undefined') {
          localStorage.setItem('smarthr_staff_session', JSON.stringify(staffSession));
        }
        setSession(staffSession);
        return staffSession;
      }
      throw authError;
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Signout warning:', e);
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('smarthr_staff_session');
    }
    setSession(null);
    router.push('/login');
  };

  const switchRole = (newRole: UserRole) => {
    if (newRole === 'guest') {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('smarthr_staff_session');
      }
      setSession(null);
      return;
    }
    const template = ROLE_DEFAULT_USERS[newRole] || ROLE_DEFAULT_USERS.admin_head_hr;
    const newSession: StaffSession = {
      ...template,
      logged_in_at: new Date().toISOString(),
    };
    if (typeof window !== 'undefined') {
      localStorage.setItem('smarthr_staff_session', JSON.stringify(newSession));
    }
    setSession(newSession);
  };

  const role: UserRole = session?.role || 'guest';
  const hasAccess = (allowedRoles: UserRole[]) => allowedRoles.includes(role);

  return (
    <AuthContext.Provider value={{ session, role, isLoading, login, logout, switchRole, hasAccess }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
