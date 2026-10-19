'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth, UserRole } from '@/context/AuthContext';
import {
  Building2,
  UserCheck,
  Briefcase,
  QrCode,
  FileText,
  Settings,
  Shield,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  LogOut,
  User,
  GraduationCap,
  Sparkles,
  LayoutDashboard,
  Receipt,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Lock,
  EyeOff,
  Eye,
  PlusCircle,
  Calendar,
  Award,
  ClipboardList,
  BookOpen,
  Upload,
  Download,
  Users,
  UserPlus,
  MessageSquare,
  FileCheck,
  FilterIcon,
  FilePen,
  UserCog,
  Layers,
  Home,
  ClipboardCheck,
  Star,
  Scale,
  Globe,
} from 'lucide-react';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface NavSubItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeColor?: string;
  exact?: boolean;
  isExternal?: boolean;
  roles?: UserRole[]; // Optional: restricts this item to specific roles within the module
}

export interface SidebarModule {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;        // Tailwind bg class for module header accent
  accentTextColor: string;    // Tailwind text class for icon
  accentBorder: string;       // Tailwind border class
  accentBg: string;           // Subtle bg for expanded state
  badgeLabel: string;
  badgeCls: string;
  roles: UserRole[];           // Which roles can see this module
  items: NavSubItem[];
}

// ─────────────────────────────────────────────
// Sidebar Module Definitions
// ─────────────────────────────────────────────

const SIDEBAR_MODULES: SidebarModule[] = [
  // ── 1. CANDIDATE MODULE ──────────────────────────────────────
  {
    id: 'candidate',
    title: 'Candidate',
    subtitle: 'Walk-in & Applications',
    icon: User,
    accentColor: 'from-teal-600 to-cyan-600',
    accentTextColor: 'text-teal-400',
    accentBorder: 'border-teal-700/40',
    accentBg: 'bg-teal-950/30',
    badgeLabel: 'Public',
    badgeCls: 'bg-teal-900/60 text-teal-300 border-teal-700',
    // guest = candidate self-service; staff roles see it for assisted walk-in entry
    roles: ['guest', 'admin_head_hr', 'receptionist'],
    items: [
      {
        title: 'Candidate Walk-in Form',
        href: '/apply',
        icon: FileText,
        badge: 'Apply',
        badgeColor: 'bg-teal-700/80 text-teal-200',
        exact: true,
      },
      {
        title: 'Remote Pre-Registration',
        href: '/apply/online',
        icon: Globe,
        badge: 'Remote',
        badgeColor: 'bg-amber-700/80 text-amber-200',
        exact: true,
      },
      {
        title: 'Upload Documents',
        href: '/apply/upload',
        icon: Upload,
        badge: 'Docs',
        badgeColor: 'bg-slate-700 text-slate-200',
        exact: true,
      },
      {
        title: 'Download A4 Application Form',
        href: '/apply/download',
        icon: Download,
        badge: 'PDF',
        badgeColor: 'bg-slate-700 text-slate-200',
        exact: true,
      },
      {
        // Status Tracker is CANDIDATE-ONLY — staff never need this; they have the live register
        title: 'Application Status Tracker',
        href: '/apply/status',
        icon: ClipboardCheck,
        badge: 'Status',
        badgeColor: 'bg-emerald-800/70 text-emerald-200',
        exact: true,
        roles: ['guest'], // ← RESTRICTED: only candidates (guest) can see this nav item
      },
    ],
  },


  // ── 2. FRONT DESK MODULE ─────────────────────────────────────
  {
    id: 'frontdesk',
    title: 'Front Desk',
    subtitle: 'Reception & Registration',
    icon: UserCheck,
    accentColor: 'from-sky-600 to-blue-600',
    accentTextColor: 'text-sky-400',
    accentBorder: 'border-sky-700/40',
    accentBg: 'bg-sky-950/30',
    badgeLabel: 'Live',
    badgeCls: 'bg-sky-900/60 text-sky-300 border-sky-700',
    roles: ['receptionist', 'admin_head_hr'],
    items: [
      {
        title: 'Front Desk Live Register',
        href: '/receptionist',
        icon: LayoutDashboard,
        badge: 'Live',
        badgeColor: 'bg-emerald-700/80 text-emerald-200',
        exact: true,
        roles: ['receptionist'], // Only receptionist sees Front Desk Live Register here; admin_head_hr accesses it via Central HR
      },
      {
        title: 'Walk-in Form (Assisted)',
        href: '/apply?mode=assisted',
        icon: UserPlus,
        badge: 'Assisted',
        badgeColor: 'bg-sky-700/70 text-sky-200',
        exact: true,
      },
      {
        // Consolidated Visitor Log & Inquiries + Fee Register into a single streamlined view
        title: 'Fee Register & Daily Inquiries',
        href: '/receptionist/fee-register',
        icon: Receipt,
        badge: 'Register',
        badgeColor: 'bg-indigo-700/80 text-indigo-200',
        exact: true,
      },
      {
        title: 'Office QR Standee Print',
        href: '/qr',
        icon: QrCode,
        badge: 'Print',
        badgeColor: 'bg-slate-700 text-slate-200',
        exact: true,
      },
    ],
  },

  // ── 3. CENTRAL HR MODULE ─────────────────────────────────────
  {
    id: 'central_hr',
    title: 'Central HR',
    subtitle: 'Trust-Level Administration',
    icon: ShieldCheck,
    accentColor: 'from-purple-700 to-violet-700',
    accentTextColor: 'text-purple-400',
    accentBorder: 'border-purple-700/40',
    accentBg: 'bg-purple-950/30',
    badgeLabel: 'Admin',
    badgeCls: 'bg-purple-900/60 text-purple-300 border-purple-700',
    roles: ['admin_head_hr'],
    items: [
      {
        title: 'Central HR Dashboard',
        href: '/',
        icon: Home,
        badge: 'Home',
        badgeColor: 'bg-purple-800/70 text-purple-200',
        exact: true,
      },
      {
        // Consolidated Forward Candidate to Institute + Master Applicant Database into a single entry
        title: 'Master Applicant Database & Forwarding',
        href: '/receptionist',
        icon: Users,
        badge: 'Database',
        badgeColor: 'bg-violet-800/70 text-violet-200',
        exact: true,
      },
      {
        title: 'Trust & Fee Setup Wizard',
        href: '/setup',
        icon: Settings,
        badge: 'Config',
        badgeColor: 'bg-amber-700/80 text-amber-200',
        exact: true,
      },
      {
        title: 'User Management & RBAC',
        href: '/setup?tab=users',
        icon: UserCog,
        badge: 'RBAC',
        badgeColor: 'bg-violet-800/70 text-violet-200',
        exact: true,
      },
      {
        title: 'Job Designations & Roles Admin',
        href: '/admin/posts',
        icon: Briefcase,
        badge: 'Roles',
        badgeColor: 'bg-purple-800/70 text-purple-200',
        exact: true,
      },
      {
        title: 'Institute / College Master Admin',
        href: '/admin/institutes',
        icon: Building2,
        badge: 'Master',
        badgeColor: 'bg-purple-800/70 text-purple-200',
        exact: false,
      },
    ],
  },

  // ── 4. INSTITUTE / BRANCH MODULE ─────────────────────────────
  {
    id: 'institute',
    title: 'Institute / Branch',
    subtitle: 'Principal & Branch Admin',
    icon: GraduationCap,
    accentColor: 'from-indigo-700 to-blue-700',
    accentTextColor: 'text-indigo-400',
    accentBorder: 'border-indigo-700/40',
    accentBg: 'bg-indigo-950/30',
    badgeLabel: 'Principal',
    badgeCls: 'bg-indigo-900/60 text-indigo-300 border-indigo-700',
    roles: ['institute_head', 'admin_head_hr'],
    items: [
      {
        title: 'Candidate Review & Dossier',
        href: '/institute-portal',
        icon: FileCheck,
        badge: 'Review',
        badgeColor: 'bg-emerald-800/70 text-emerald-200',
        exact: true,
      },
      {
        title: 'Staff Strength & Sanctioned Matrix',
        href: '/institute-portal?tab=matrix',
        icon: Scale,
        badge: 'Matrix',
        badgeColor: 'bg-sky-800/70 text-sky-200',
        exact: true,
      },
    ],
  },

  // ── 5. APPOINTMENT & RECRUITMENT MODULE (CENTRAL HR OVERSIGHT) ──
  {
    id: 'appointment',
    title: 'Appointment & Recruitment',
    subtitle: 'Central Decisions & Orders',
    icon: Award,
    accentColor: 'from-amber-600 to-orange-600',
    accentTextColor: 'text-amber-400',
    accentBorder: 'border-amber-700/40',
    accentBg: 'bg-amber-950/25',
    badgeLabel: 'Central HR',
    badgeCls: 'bg-amber-900/60 text-amber-300 border-amber-700',
    roles: ['admin_head_hr', 'appointment_officer'],
    items: [
      {
        title: 'Central Recruitment Overview',
        href: '/appointment',
        icon: LayoutDashboard,
        badge: 'Central',
        badgeColor: 'bg-amber-800/70 text-amber-200',
        exact: true,
      },
      {
        title: 'Interview & Evaluation Queue',
        href: '/appointment?filter=pending',
        icon: Calendar,
        badge: 'Queue',
        badgeColor: 'bg-amber-800/70 text-amber-200',
        exact: true,
      },
      {
        title: 'Selected Candidates & Recommendations',
        href: '/appointment?filter=selected',
        icon: CheckCircle2,
        badge: 'Selected',
        badgeColor: 'bg-emerald-800/70 text-emerald-200',
        exact: true,
      },
      {
        title: 'Management Approved Appointments',
        href: '/appointment?filter=management_approved',
        icon: Award,
        badge: 'Approved',
        badgeColor: 'bg-indigo-800/70 text-indigo-200',
        exact: true,
      },
      {
        title: 'Official Appointment Orders',
        href: '/appointment?tab=orders',
        icon: FileCheck,
        badge: 'Orders',
        badgeColor: 'bg-purple-800/70 text-purple-200',
        exact: true,
      },
    ],
  },
];

// ─────────────────────────────────────────────
// Role Labels & Meta
// ─────────────────────────────────────────────

const ROLE_LABELS: Record<UserRole, {
  label: string;
  shortLabel: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}> = {
  admin_head_hr: {
    label: 'Head Central HR',
    shortLabel: 'Admin HR',
    color: 'bg-purple-700 text-white border-purple-800 hover:bg-purple-800',
    icon: ShieldCheck,
    description: 'Full Master, Designations, Setup & All Institutes Access',
  },
  receptionist: {
    label: 'Front Desk Officer',
    shortLabel: 'Front Desk',
    color: 'bg-sky-700 text-white border-sky-800 hover:bg-sky-800',
    icon: UserCheck,
    description: 'Document Verification, Approval & Fee Receipts Generation',
  },
  institute_head: {
    label: 'Principal / Institute Head',
    shortLabel: 'Principal',
    color: 'bg-indigo-700 text-white border-indigo-800 hover:bg-indigo-800',
    icon: GraduationCap,
    description: 'Institute Openings, Approvals & Candidate Applications',
  },
  appointment_officer: {
    label: 'Appointment Officer',
    shortLabel: 'Appointment',
    color: 'bg-amber-700 text-white border-amber-800 hover:bg-amber-800',
    icon: Award,
    description: 'Dedicated access strictly to Appointment & Recruitment Module',
  },
  guest: {
    label: 'Candidate / Public',
    shortLabel: 'Public Mode',
    color: 'bg-teal-700 text-white border-teal-800 hover:bg-teal-800',
    icon: User,
    description: 'Walk-in Candidate Application & QR Scanner Access',
  },
};

// ─────────────────────────────────────────────
// Helper: Breadcrumb Map
// ─────────────────────────────────────────────

function getBreadcrumbTitle(pathname: string): string {
  if (pathname === '/') return 'Sanstha HR — Central Dashboard';
  if (pathname.startsWith('/appointment')) return 'Appointment & Recruitment — Central HR Section';
  if (pathname === '/receptionist') return 'Front Desk & Live Registration';
  if (pathname === '/receptionist/fee-register') return 'Application Fee Register & Receipts';
  if (pathname === '/institute-portal') return 'Institute Head & Principal Portal';
  if (pathname.startsWith('/admin/institutes/create')) return 'Add New Institute / College';
  if (pathname.includes('/edit')) return 'Edit Institute Profile';
  if (pathname.startsWith('/admin/institutes/')) return 'Institute Detailed Profile';
  if (pathname.startsWith('/admin/institutes')) return 'Institute / College Master';
  if (pathname.startsWith('/admin/posts')) return 'Job Designations & Roles Master';
  if (pathname.startsWith('/setup')) return 'Trust Branding & Setup Wizard (RBAC)';
  if (pathname === '/apply') return 'Candidate Walk-in Application Form';
  if (pathname === '/apply/status') return 'Application Status Tracker';
  if (pathname === '/apply/upload') return 'Document Upload Centre';
  if (pathname === '/apply/download') return 'Download Application Form (A4)';
  if (pathname.startsWith('/qr')) return 'Office QR Standee';
  return 'SmartHR Central ERP';
}

// ─────────────────────────────────────────────
// Sub-item Active Check
// ─────────────────────────────────────────────

function isSubItemActive(item: NavSubItem, pathname: string, currentSearch: string = ''): boolean {
  const [itemPath, itemQuery] = item.href.split('?');

  if (item.exact) {
    if (pathname !== itemPath) return false;
  } else {
    if (itemPath === '/') {
      if (pathname !== '/') return false;
    } else if (!pathname.startsWith(itemPath)) {
      return false;
    }
  }

  // If item expects specific query parameters
  if (itemQuery) {
    const itemSearchParams = new URLSearchParams(itemQuery);
    const currentSearchParams = new URLSearchParams(currentSearch);
    for (const [key, val] of itemSearchParams.entries()) {
      if (currentSearchParams.get(key) !== val) {
        return false;
      }
    }
    return true;
  }

  // If item has NO query parameters, but current URL has query params that identify a sibling variant
  if (currentSearch && currentSearch !== '?') {
    const currentSearchParams = new URLSearchParams(currentSearch);
    if (
      currentSearchParams.has('mode') ||
      currentSearchParams.has('tab') ||
      currentSearchParams.has('filter') ||
      currentSearchParams.has('view')
    ) {
      return false;
    }
  }

  return true;
}

// ─────────────────────────────────────────────
// Module Icon Colors Map (for collapsed tooltip dots)
// ─────────────────────────────────────────────

const MODULE_GRADIENT_MAP: Record<string, string> = {
  candidate: 'from-teal-500 to-cyan-500',
  frontdesk: 'from-sky-500 to-blue-500',
  central_hr: 'from-purple-500 to-violet-500',
  institute: 'from-indigo-500 to-blue-600',
  appointment: 'from-amber-500 to-orange-500',
};

// ─────────────────────────────────────────────
// AppShell Component
// ─────────────────────────────────────────────

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, role, isLoading, switchRole, logout } = useAuth();

  // ── URL Search Tracking for Query-Aware Active Highlights ──
  const [currentSearch, setCurrentSearch] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentSearch(window.location.search);
    }
  }, [pathname]);

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentSearch(window.location.search);
    };
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  // ── Sidebar Layout States ──
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // ── Role Switcher Dropdown ──
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);

  // ── Module Accordion Open State (set of module IDs) ──
  const [openModules, setOpenModules] = useState<Set<string>>(new Set());

  // ── Restore sidebar layout prefs from localStorage ──
  useEffect(() => {
    try {
      const savedCollapse = localStorage.getItem('smarthr_sidebar_collapsed');
      if (savedCollapse !== null) setIsCollapsed(savedCollapse === 'true');
      const savedHidden = localStorage.getItem('smarthr_sidebar_hidden');
      if (savedHidden !== null) setIsHidden(savedHidden === 'true');
    } catch (e) {
      console.warn(e);
    }
  }, []);

  // ── Auto-expand module containing the current active route ──
  useEffect(() => {
    const newOpen = new Set<string>();
    for (const mod of SIDEBAR_MODULES) {
      if (!mod.roles.includes(role)) continue;
      const hasActive = mod.items.some((item) => isSubItemActive(item, pathname, currentSearch));
      if (hasActive) newOpen.add(mod.id);
    }
    if (newOpen.size > 0) {
      setOpenModules((prev) => {
        const merged = new Set(prev);
        newOpen.forEach((id) => merged.add(id));
        return merged;
      });
    }
  }, [pathname, currentSearch, role]);

  // ── Toggle a module accordion ──
  const toggleModule = useCallback((moduleId: string) => {
    setOpenModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  }, []);

  // ── Sidebar collapse/hide toggles ──
  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    try { localStorage.setItem('smarthr_sidebar_collapsed', String(next)); } catch (e) {}
  };

  const toggleHidden = () => {
    const next = !isHidden;
    setIsHidden(next);
    try { localStorage.setItem('smarthr_sidebar_hidden', String(next)); } catch (e) {}
  };

  // ── Route Protection Gating ──
  const isPublic = pathname === '/login' || pathname === '/qr' || pathname === '/apply' || pathname.startsWith('/apply/');

  // Auto-redirect unauthenticated users away from protected routes to login
  useEffect(() => {
    if (!isLoading && !session && !isPublic) {
      router.replace('/login');
    }
  }, [isLoading, session, isPublic, router]);

  // ── Skip AppShell on login page ──
  if (pathname === '/login') return <>{children}</>;

  // Loading screen for protected routes while session state is initializing
  if (isLoading && !isPublic) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-2xl mb-4 animate-pulse">
          <Shield className="w-7 h-7" />
        </div>
        <p className="text-white font-bold text-sm tracking-wide">SmartHR Central ERP</p>
        <p className="text-slate-400 text-xs mt-1">Verifying staff credentials…</p>
      </div>
    );
  }

  // Gatekeeper placeholder for unauthenticated users on protected routes
  if (!isLoading && !session && !isPublic) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-3xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-2xl mb-4">
          <Lock className="w-7 h-7" />
        </div>
        <p className="text-white font-bold text-base">Authentication Required</p>
        <p className="text-slate-400 text-xs mt-1 mb-5">Please sign in with your staff account to access this module.</p>
        <Link
          href="/login"
          className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition shadow-lg inline-flex items-center gap-2"
        >
          <Lock className="w-3.5 h-3.5" /> Sign In to Portal
        </Link>
      </div>
    );
  }

  const currentRoleInfo = ROLE_LABELS[role] || ROLE_LABELS.guest;
  const RoleIcon = currentRoleInfo.icon;

  // ── Filter modules visible to current role ──
  const visibleModules = SIDEBAR_MODULES.filter((mod) => mod.roles.includes(role));

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col antialiased selection:bg-sky-500 selection:text-white">

      {/* ── Mobile Backdrop ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Floating Restore Button (when sidebar fully hidden) ── */}
      {isHidden && (
        <button
          onClick={toggleHidden}
          className="no-print fixed bottom-6 left-6 z-30 flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-2xl shadow-2xl hover:bg-sky-700 transition duration-200 border border-slate-700 font-bold text-xs group"
          title="Show Navigation Panel"
        >
          <Menu className="w-4 h-4 group-hover:rotate-180 transition-transform duration-300" />
          <span>Show Menu</span>
        </button>
      )}

      {/* ══════════════════════════════════════════
          TOP NAVBAR
      ══════════════════════════════════════════ */}
      <header className="no-print sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm h-16 flex items-center justify-between px-3 sm:px-5">

        {/* Left: Hamburger + Collapse + Breadcrumb */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"
            title="Open Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Desktop: Collapse to Icon */}
          <button
            onClick={toggleCollapse}
            className="hidden lg:flex p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition items-center gap-1 text-xs font-semibold"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar to Icons'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          {/* Desktop: Hide/Show Panel */}
          <button
            onClick={toggleHidden}
            className="hidden lg:flex p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition items-center gap-1.5 text-xs font-semibold"
            title={isHidden ? 'Show Left Panel' : 'Hide Left Panel'}
          >
            {isHidden ? <Eye className="w-4 h-4 text-sky-600" /> : <EyeOff className="w-4 h-4" />}
            <span className="hidden xl:inline">{isHidden ? 'Show Panel' : 'Hide Panel'}</span>
          </button>

          <div className="h-5 w-px bg-slate-200 mx-1 hidden sm:block" />

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="hidden md:flex items-center gap-1.5 flex-shrink-0">
              <Shield className="w-3.5 h-3.5 text-sky-600" />
              <span className="text-[11px] font-bold text-slate-400">SBMSM</span>
              <span className="text-slate-300">/</span>
            </div>
            <span className="text-xs sm:text-sm font-extrabold text-slate-800 tracking-tight truncate">
              {getBreadcrumbTitle(pathname)}
            </span>
          </div>
        </div>

        {/* Right: Quick Actions + Role Switcher */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">

          {/* Quick pill — Walk-in Form */}
          <Link
            href="/apply"
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-xl text-xs font-bold transition shadow-sm"
          >
            <PlusCircle className="w-3.5 h-3.5 text-teal-600" />
            <span>Walk-in</span>
          </Link>

          {/* Quick pill — QR */}
          <Link
            href="/qr"
            className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-xl text-xs font-bold transition shadow-sm"
          >
            <QrCode className="w-3.5 h-3.5 text-purple-600" />
            <span>QR</span>
          </Link>

          {/* ── Role Switcher (Staff) or Staff Login Button (Guest) ── */}
          {session ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowRoleDropdown((prev) => !prev)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border transition shadow-sm ${currentRoleInfo.color}`}
              title="Click to switch active role and preview other modules"
            >
              <RoleIcon className="w-3.5 h-3.5" />
              <span>{currentRoleInfo.label}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showRoleDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showRoleDropdown && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowRoleDropdown(false)}
                />
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-3.5 py-2 border-b border-slate-100">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Switch Active Module Role</p>
                    <p className="text-[11px] text-slate-500 font-medium leading-tight mt-0.5">Change role to view assigned modules & access rights</p>
                  </div>
                  <div className="p-1.5 space-y-1">
                    {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => {
                      const info = ROLE_LABELS[r];
                      const Icon = info.icon;
                      const isActive = role === r;
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => {
                            switchRole(r);
                            setShowRoleDropdown(false);
                          }}
                          className={`w-full flex items-start gap-2.5 p-2.5 rounded-xl text-left transition ${
                            isActive ? 'bg-sky-50 text-sky-950 font-bold border border-sky-200' : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${isActive ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold flex items-center justify-between">
                              <span>{info.label}</span>
                              {isActive && <CheckCircle2 className="w-3.5 h-3.5 text-sky-600" />}
                            </div>
                            <p className="text-[10px] text-slate-400 font-normal leading-tight mt-0.5">{info.description}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-sm"
            >
              <Lock className="w-3.5 h-3.5 text-sky-400" />
              <span>Staff Login</span>
            </Link>
          )}
       </div>
      </header>

      {/* ══════════════════════════════════════════
          MAIN LAYOUT BODY
      ══════════════════════════════════════════ */}
      <div className="flex-1 flex w-full relative">

        {/* ══════════════════════════════════════
            LEFT SIDEBAR
        ══════════════════════════════════════ */}
        {!isHidden && (
          <aside
            className={`
              no-print bg-slate-900 text-slate-200 border-r border-slate-800
              flex flex-col transition-all duration-300 ease-in-out z-30
              ${isCollapsed ? 'w-[72px]' : 'w-72'}
              fixed lg:sticky top-16 h-[calc(100vh-4rem)]
              ${mobileOpen ? 'translate-x-0 !w-72' : '-translate-x-full lg:translate-x-0'}
            `}
          >
            {/* ── Sidebar Brand Header ── */}
            <div className={`flex-shrink-0 border-b border-slate-800 ${(!isCollapsed || mobileOpen) ? 'p-4' : 'p-3'}`}>
              {(!isCollapsed || mobileOpen) ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-sky-900/30 flex-shrink-0">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div className="overflow-hidden">
                      <div className="text-xs font-black text-white tracking-wider uppercase leading-tight">SmartHR ERP</div>
                      <div className="text-[10px] text-sky-400 font-semibold truncate">SBMSM Mandal, Ambap</div>
                    </div>
                  </div>
                  {/* Close on Mobile */}
                  <button
                    onClick={() => setMobileOpen(false)}
                    className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 flex-shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-lg">
                    <Shield className="w-5 h-5" />
                  </div>
                </div>
              )}
            </div>

            {/* ── Role Badge Strip ── */}
            {(!isCollapsed || mobileOpen) && (
              <div className="flex-shrink-0 px-4 py-2 bg-slate-950/50 border-b border-slate-800/60">
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse`} />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Session</span>
                </div>
                <div className={`mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[10px] font-bold ${
                  role === 'admin_head_hr' ? 'bg-purple-900/50 text-purple-300 border-purple-700' :
                  role === 'receptionist' ? 'bg-sky-900/50 text-sky-300 border-sky-700' :
                  role === 'institute_head' ? 'bg-indigo-900/50 text-indigo-300 border-indigo-700' :
                  'bg-teal-900/50 text-teal-300 border-teal-700'
                }`}>
                  <RoleIcon className="w-2.5 h-2.5" />
                  <span>{currentRoleInfo.label}</span>
                </div>
              </div>
            )}

            {/* ── Scrollable Nav Modules ── */}
            <div className="flex-1 overflow-y-auto py-3 space-y-1 custom-scrollbar">

              {visibleModules.length === 0 && (!isCollapsed || mobileOpen) && (
                <div className="px-4 py-8 text-center">
                  <Lock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-500 font-medium">No modules accessible for this role.</p>
                </div>
              )}

              {visibleModules.map((mod) => {
                const ModIcon = mod.icon;
                const isOpen = openModules.has(mod.id);
                const hasActiveItem = mod.items.some((item) => isSubItemActive(item, pathname, currentSearch));
                const isIconOnly = isCollapsed && !mobileOpen;

                return (
                  <div key={mod.id} className="px-2">

                    {/* ── Module Header / Toggle Button ── */}
                    {isIconOnly ? (
                      /* ── COLLAPSED: Icon-only button with tooltip ── */
                      <div className="relative group">
                        <button
                          onClick={() => {
                            // On collapsed mode, navigate to the first item accessible to current role
                            const accessibleItems = mod.items.filter(
                              (item) => !item.roles || item.roles.includes(role)
                            );
                            if (accessibleItems.length > 0) {
                              const targetHref = accessibleItems[0].href;
                              const [, q] = targetHref.split('?');
                              setCurrentSearch(q ? `?${q}` : '');
                              router.push(targetHref);
                              setMobileOpen(false);
                            }
                          }}
                          className={`w-full flex items-center justify-center p-2.5 rounded-xl transition-all duration-150 ${
                            hasActiveItem
                              ? 'bg-slate-700/80 ring-1 ring-slate-600'
                              : 'hover:bg-slate-800'
                          }`}
                          title={mod.title}
                        >
                          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${MODULE_GRADIENT_MAP[mod.id]} flex items-center justify-center shadow-lg`}>
                            <ModIcon className="w-4 h-4 text-white" />
                          </div>
                          {hasActiveItem && (
                            <div className="absolute right-0.5 top-1/2 -translate-y-1/2 w-1 h-6 bg-sky-400 rounded-l-sm" />
                          )}
                        </button>

                        {/* Hover Tooltip */}
                        <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap">
                          <div className="bg-slate-800 border border-slate-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-xl">
                            {mod.title}
                            <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-2 h-2 bg-slate-800 border-l border-b border-slate-700 rotate-45" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* ── EXPANDED: Full module accordion header ── */
                      <button
                        onClick={() => toggleModule(mod.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group relative ${
                          hasActiveItem && !isOpen
                            ? 'bg-slate-800/80 text-white'
                            : isOpen
                            ? 'bg-slate-800/60 text-white'
                            : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                        }`}
                      >
                        {/* Module Icon */}
                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${MODULE_GRADIENT_MAP[mod.id]} flex items-center justify-center shadow-md flex-shrink-0 transition-transform group-hover:scale-105`}>
                          <ModIcon className="w-4 h-4 text-white" />
                        </div>

                        {/* Module Title + Subtitle */}
                        <div className="flex-1 text-left overflow-hidden">
                          <div className="text-xs font-black tracking-tight leading-tight truncate">{mod.title}</div>
                          <div className="text-[10px] text-slate-400 font-medium truncate leading-tight mt-0.5">{mod.subtitle}</div>
                        </div>

                        {/* Role Badge */}
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border flex-shrink-0 ${mod.badgeCls}`}>
                          {mod.badgeLabel}
                        </span>

                        {/* Chevron */}
                        <div className="flex-shrink-0 ml-0.5">
                          {isOpen
                            ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                            : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                          }
                        </div>

                        {/* Active accent bar */}
                        {hasActiveItem && (
                          <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-sky-400 rounded-r" />
                        )}
                      </button>
                    )}

                    {/* ── Sub-Feature Dropdown (expanded items) ── */}
                    {!isIconOnly && isOpen && (
                      <div className={`mt-1 ml-2 pl-3 border-l-2 ${mod.accentBorder} space-y-0.5 pb-2`}>
                        {mod.items
                          // Per-item role filter: if item.roles is defined, only show to roles in that list
                          .filter((item) => !item.roles || item.roles.includes(role))
                          .map((item) => {
                          const ItemIcon = item.icon;
                          const active = isSubItemActive(item, pathname, currentSearch);

                          return (
                            <Link
                              key={`${mod.id}-${item.href}-${item.title}`}
                              href={item.href}
                              onClick={() => {
                                setMobileOpen(false);
                                const [, q] = item.href.split('?');
                                setCurrentSearch(q ? `?${q}` : '');
                              }}
                              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold transition-all duration-150 group/item relative ${
                                active
                                  ? 'bg-sky-600 text-white shadow-md shadow-sky-900/30 font-bold'
                                  : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-100'
                              }`}
                            >
                              <ItemIcon className={`w-3.5 h-3.5 flex-shrink-0 transition-transform group-hover/item:scale-110 ${
                                active ? 'text-white' : `${mod.accentTextColor} group-hover/item:text-white`
                              }`} />

                              <span className="flex-1 truncate leading-tight">{item.title}</span>

                              {item.badge && (
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${
                                  active ? 'bg-sky-500 text-white' : item.badgeColor || 'bg-slate-700 text-slate-300'
                                }`}>
                                  {item.badge}
                                </span>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Separator before footer actions */}
              {(!isCollapsed || mobileOpen) && visibleModules.length > 0 && (
                <div className="px-4 pt-2">
                  <div className="border-t border-slate-800/70" />
                </div>
              )}
            </div>

            {/* ── Sidebar Footer: User Card + Actions ── */}
            <div className="flex-shrink-0 p-3 border-t border-slate-800 bg-slate-950/60">
              {session ? (
                (!isCollapsed || mobileOpen) ? (
                  <div className="space-y-2">
                    {/* User card */}
                    <div className="px-2.5 py-2 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow flex-shrink-0">
                        <User className="w-4 h-4" />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <div className="text-xs font-bold text-white truncate">
                          {session.full_name}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                          <span className="truncate font-medium">{currentRoleInfo.label}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action row */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={logout}
                        className="w-full flex items-center justify-center gap-2 p-2 rounded-xl bg-slate-800 hover:bg-rose-900/70 text-slate-400 hover:text-rose-300 transition border border-slate-700/60 text-xs font-semibold"
                        title="Sign Out"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Collapsed footer */
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center border border-slate-700/60" title={`Current: ${currentRoleInfo.label}`}>
                      <RoleIcon className="w-4 h-4 text-sky-400" />
                    </div>
                    <button
                      onClick={logout}
                      className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-rose-900/70 text-slate-400 hover:text-rose-300 flex items-center justify-center transition border border-slate-700/60"
                      title="Sign Out"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                )
              ) : (
                (!isCollapsed || mobileOpen) ? (
                  <div className="space-y-2">
                    <div className="px-2.5 py-2 rounded-2xl bg-teal-950/60 border border-teal-800/60 flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-teal-600/80 flex items-center justify-center text-white font-bold text-xs shadow flex-shrink-0">
                        <User className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <div className="text-xs font-bold text-teal-200 truncate">Candidate Portal</div>
                        <div className="text-[10px] text-teal-400 font-medium">Walk-in &amp; Applications</div>
                      </div>
                    </div>
                    <Link
                      href="/login"
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-sky-700 hover:bg-sky-600 text-white text-xs font-bold transition shadow-sm"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Staff Sign In</span>
                    </Link>
                  </div>
                ) : (
                  <Link
                    href="/login"
                    className="w-10 h-10 rounded-xl bg-sky-700 hover:bg-sky-600 text-white flex items-center justify-center transition shadow-sm mx-auto"
                    title="Staff Sign In"
                  >
                    <Lock className="w-4 h-4" />
                  </Link>
                )
              )}
            </div>
          </aside>
        )}

        {/* ══════════════════════════════════════
            MAIN PAGE CONTENT
        ══════════════════════════════════════ */}
        <main className="flex-1 w-full overflow-x-hidden min-h-[calc(100vh-4rem)] flex flex-col justify-between">
          <div className="w-full flex-1">
            {children}
          </div>

          {/* Institutional Footer */}
          <footer className="no-print bg-white border-t border-slate-200 py-4 px-6 text-center text-xs text-slate-500 mt-12">
            <p className="font-bold text-slate-700">
              Shri Balasaheb Mane Shikshan Prasarak Mandal, Ambap — Central HR Department
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Recruitment · Document Verification · Fee Receipts · Sanstha ERP System
            </p>
          </footer>
        </main>
      </div>

      {/* ── Global scrollbar style injection ── */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 99px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
      `}</style>
    </div>
  );
}
