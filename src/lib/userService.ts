import { supabase } from '@/lib/supabase';
import { UserRole } from '@/context/AuthContext';

export interface SystemUser {
  id: string;
  username: string; // e.g. 'admin', 'frontdesk', 'principal', 'appointment'
  login_name: string; // e.g. 'Head Central HR', 'Priyanka Sutar'
  email: string; // e.g. 'admin@mandaltrust.org'
  mobile_number: string; // e.g. '+91 9876543210'
  password?: string; // e.g. 'admin123'
  role: UserRole; // 'admin_head_hr' | 'receptionist' | 'institute_head' | 'appointment_officer'
  linked_institute_id?: string;
  linked_institute_name?: string;
  is_active: boolean; // true = active, false = disabled
  created_at: string;
  updated_at?: string;
}

const STORAGE_KEY = 'smarthr_system_users';

export const DEFAULT_USERS: SystemUser[] = [
  {
    id: 'user_admin_001',
    username: 'admin',
    login_name: 'Head Central HR (Admin)',
    email: 'admin@mandaltrust.org',
    mobile_number: '+91 9876543210',
    password: 'admin123',
    role: 'admin_head_hr',
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'user_frontdesk_002',
    username: 'frontdesk',
    login_name: 'Central HR Front Desk Officer',
    email: 'frontdesk@mandaltrust.org',
    mobile_number: '+91 9876543211',
    password: 'admin123',
    role: 'receptionist',
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'user_principal_003',
    username: 'principal',
    login_name: 'Principal / Institute Head',
    email: 'principal@mandaltrust.org',
    mobile_number: '+91 9876543212',
    password: 'admin123',
    role: 'institute_head',
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'user_recruitment_004',
    username: 'appointment',
    login_name: 'Central Appointment Officer',
    email: 'appointment@mandaltrust.org',
    mobile_number: '+91 9876543213',
    password: 'admin123',
    role: 'appointment_officer',
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
  },
];

/**
 * Get all system users from localStorage (falling back to DEFAULT_USERS).
 */
export function getSystemUsers(): SystemUser[] {
  if (typeof window === 'undefined') return DEFAULT_USERS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_USERS));
      return DEFAULT_USERS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Ensure all default roles exist
      const existingRoles = new Set(parsed.map((u: SystemUser) => u.role));
      let modified = false;
      for (const def of DEFAULT_USERS) {
        if (!existingRoles.has(def.role)) {
          parsed.push(def);
          modified = true;
        }
      }
      if (modified) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      }
      return parsed;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_USERS));
    return DEFAULT_USERS;
  } catch (err) {
    console.warn('Error reading system users from storage:', err);
    return DEFAULT_USERS;
  }
}

/**
 * Save users array to localStorage.
 */
export function saveSystemUsers(users: SystemUser[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  } catch (err) {
    console.error('Failed to save system users:', err);
  }
}

/**
 * Add a new user.
 */
export async function createSystemUser(user: Omit<SystemUser, 'id' | 'created_at'>): Promise<SystemUser> {
  const users = getSystemUsers();

  // Check unique username and email
  const cleanUsername = user.username.trim().toLowerCase();
  const cleanEmail = user.email.trim().toLowerCase();

  const usernameExists = users.some((u) => u.username.trim().toLowerCase() === cleanUsername);
  if (usernameExists) {
    throw new Error(`Username "${user.username}" is already taken. Please choose another.`);
  }

  const emailExists = users.some((u) => u.email.trim().toLowerCase() === cleanEmail);
  if (emailExists) {
    throw new Error(`Email "${user.email}" is already associated with another user.`);
  }

  const id = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const newUser: SystemUser = {
    ...user,
    id,
    username: cleanUsername,
    email: cleanEmail,
    password: user.password?.trim() || 'admin123',
    is_active: user.is_active ?? true,
    created_at: new Date().toISOString(),
  };

  users.unshift(newUser);
  saveSystemUsers(users);

  // Sync to Supabase user_profiles if available (best-effort)
  try {
    await supabase.from('user_profiles').upsert({
      id: newUser.id,
      email: newUser.email,
      full_name: newUser.login_name,
      role: newUser.role,
      is_active: newUser.is_active,
      linked_institute_id: newUser.linked_institute_id || null,
    }, { onConflict: 'id' });
  } catch (err) {
    // Non-blocking for offline/client-only operation
    console.warn('Supabase user profile sync skipped:', err);
  }

  return newUser;
}

/**
 * Update an existing user.
 */
export async function updateSystemUser(
  id: string,
  updates: Partial<Omit<SystemUser, 'id' | 'created_at'>>
): Promise<SystemUser> {
  const users = getSystemUsers();
  const index = users.findIndex((u) => u.id === id);
  if (index === -1) {
    throw new Error('User not found.');
  }

  // If username changed, check uniqueness
  if (updates.username) {
    const cleanUsername = updates.username.trim().toLowerCase();
    const clash = users.some((u) => u.id !== id && u.username.trim().toLowerCase() === cleanUsername);
    if (clash) throw new Error(`Username "${updates.username}" is already in use.`);
    updates.username = cleanUsername;
  }

  // If email changed, check uniqueness
  if (updates.email) {
    const cleanEmail = updates.email.trim().toLowerCase();
    const clash = users.some((u) => u.id !== id && u.email.trim().toLowerCase() === cleanEmail);
    if (clash) throw new Error(`Email "${updates.email}" is already in use.`);
    updates.email = cleanEmail;
  }

  const updated: SystemUser = {
    ...users[index],
    ...updates,
    updated_at: new Date().toISOString(),
  };

  users[index] = updated;
  saveSystemUsers(users);

  // Sync to Supabase user_profiles if available
  try {
    await supabase.from('user_profiles').update({
      email: updated.email,
      full_name: updated.login_name,
      role: updated.role,
      is_active: updated.is_active,
      linked_institute_id: updated.linked_institute_id || null,
    }).eq('id', updated.id);
  } catch (err) {
    console.warn('Supabase user profile update skipped:', err);
  }

  return updated;
}

/**
 * Disable or Enable a user.
 */
export async function setUserActiveStatus(id: string, isActive: boolean): Promise<SystemUser> {
  return updateSystemUser(id, { is_active: isActive });
}

/**
 * Delete a user (cannot delete protected default admin).
 */
export async function deleteSystemUser(id: string): Promise<void> {
  const users = getSystemUsers();
  const user = users.find((u) => u.id === id);
  if (!user) return;

  if (user.username === 'admin') {
    throw new Error('The default system administrator account ("admin") cannot be deleted.');
  }

  const filtered = users.filter((u) => u.id !== id);
  saveSystemUsers(filtered);

  try {
    await supabase.from('user_profiles').delete().eq('id', id);
  } catch (err) {
    console.warn('Supabase user profile delete skipped:', err);
  }
}

/**
 * Authenticate credentials against system users.
 * Supports login via either Email ID or Username.
 */
export function authenticateSystemUser(
  identifier: string,
  password?: string
): { user: SystemUser; error?: string } {
  const users = getSystemUsers();
  const clean = identifier.trim().toLowerCase();

  const found = users.find(
    (u) => u.email.trim().toLowerCase() === clean || u.username.trim().toLowerCase() === clean
  );

  if (!found) {
    return { user: null as any, error: 'User account not found. Please verify your username or email.' };
  }

  if (found.is_active === false) {
    return {
      user: null as any,
      error: `Account for "${found.login_name || found.username}" has been DISABLED by Central HR Administrator. Access is blocked.`,
    };
  }

  // Password verification: if password supplied and configured, check match
  if (password && found.password) {
    if (password !== found.password) {
      return { user: null as any, error: 'Incorrect password. Please try again.' };
    }
  }

  return { user: found };
}

/**
 * Restore standard initial accounts.
 */
export function resetSystemUsersToDefault(): SystemUser[] {
  saveSystemUsers(DEFAULT_USERS);
  return DEFAULT_USERS;
}
