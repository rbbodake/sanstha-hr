'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { compressLogoImage } from '@/lib/imageUtils';
import { RoleGuard } from '@/components/RoleGuard';
import { 
  Building2, 
  Layers, 
  Receipt, 
  UserCheck, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  Image as ImageIcon, 
  Trash2, 
  UploadCloud, 
  RefreshCw,
  Eye,
  UserCog,
  Shield,
  ShieldCheck,
  Award,
  GraduationCap,
  Plus,
  Key,
  Mail,
  Phone,
  Search,
  Filter,
  Ban,
  Check,
  X,
  Lock,
  UserPlus,
  Edit2,
  AlertCircle
} from 'lucide-react';
import { UserRole } from '@/context/AuthContext';
import {
  SystemUser,
  getSystemUsers,
  createSystemUser,
  updateSystemUser,
  setUserActiveStatus,
  deleteSystemUser,
  resetSystemUsersToDefault
} from '@/lib/userService';
import { Institute } from '@/types/database';

export default function SetupWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // Form State
  const [orgData, setOrgData] = useState({
    id: '',
    name: 'Shri Balasaheb Mane Shikshan Prasarak Mandal, Ambap',
    address: 'Tal. Hatkanangale, Dist. Kolhapur, Pin 416112, Maharashtra State (A/p. Ambap)',
    registration_no: 'Regd. under B.P.T. Act 1950, No. F-1727-Kolhapur',
    registration_date: '02/02/1981',
    tagline: 'Education as a Service',
    logo_url: '',
    president_name: 'Shri Vijaysinh Ashokrao Mane',
    hr_head_name: 'Mrs. Priyanka M. Sutar',
    contact_email: 'hr@sbmsmspm.org',
    contact_phone: '+91 9876543210',
    receipt_prefix: 'REC/2026-27/',
    receipt_starting_no: 1001,
    app_no_prefix: 'REG',
    fee_receipt_prefix: 'FR',
    number_digits: 5,
    year_basis: 'calendar' as 'calendar' | 'financial',
    restart_yearly: true,
    receipt_header_text: 'CENTRAL HR DEPARTMENT • APPLICATION FORM FEE RECEIPT',
    receipt_footer_text: 'This is a computer-generated fee receipt. Please preserve it for the interview.',
  });

  const [categories, setCategories] = useState([
    { name: 'Teaching', fee: 100, description: 'Professors, Assistant Professors, Lecturers, Teachers' },
    { name: 'Non-Teaching', fee: 50, description: 'Clerks, Accountants, Librarians, Lab Assistants' },
    { name: 'House-Keeping', fee: 50, description: 'Peons, Attendants, Security, Support Staff' },
  ]);

  const [newCat, setNewCat] = useState({ name: '', fee: 0, description: '' });

  // Load existing organization settings on mount
  useEffect(() => {
    async function loadExistingSettings() {
      try {
        const { data: existingOrg } = await supabase
          .from('organization_settings')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(1)
          .single();

        if (existingOrg) {
          setOrgData((prev) => ({
            ...prev,
            id: existingOrg.id || '',
            name: existingOrg.name || '',
            address: existingOrg.address || '',
            registration_no: existingOrg.registration_no || '',
            registration_date: existingOrg.registration_date || '',
            tagline: existingOrg.tagline || '',
            logo_url: existingOrg.logo_url || '',
            president_name: existingOrg.president_name || '',
            hr_head_name: existingOrg.hr_head_name || '',
            contact_email: existingOrg.contact_email || '',
            contact_phone: existingOrg.contact_phone || '',
            receipt_prefix: existingOrg.receipt_prefix || 'REC/2026-27/',
            receipt_starting_no: existingOrg.receipt_starting_no || 1001,
            app_no_prefix: existingOrg.app_no_prefix || 'REG',
            fee_receipt_prefix: existingOrg.fee_receipt_prefix || 'FR',
            number_digits: existingOrg.number_digits || 5,
            year_basis: existingOrg.year_basis || 'calendar',
            restart_yearly: existingOrg.restart_yearly ?? true,
            receipt_header_text: existingOrg.receipt_header_text || 'CENTRAL HR DEPARTMENT • APPLICATION FORM FEE RECEIPT',
            receipt_footer_text: existingOrg.receipt_footer_text || 'This is a computer-generated fee receipt. Please preserve it for the interview.',
          }));
        }

        const { data: existingCats } = await supabase
          .from('staff_categories')
          .select('*')
          .eq('is_active', true);

        if (existingCats && existingCats.length > 0) {
          setCategories(
            existingCats.map((c) => ({
              name: c.name,
              fee: c.application_fee,
              description: c.description || '',
            }))
          );
        }
      } catch (err) {
        console.warn('First time setup or no existing settings:', err);
      }
    }

    loadExistingSettings();
  }, []);

  const addCategory = () => {
    if (!newCat.name.trim()) return;
    setCategories([...categories, { ...newCat }]);
    setNewCat({ name: '', fee: 0, description: '' });
  };

  const removeCategory = (index: number) => {
    setCategories(categories.filter((_, i) => i !== index));
  };

  // ── USER MANAGEMENT & RBAC STATE (FEATURE 2) ────────────────────────
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [institutesList, setInstitutesList] = useState<Institute[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'active' | 'disabled'>('all');

  // Modal State for Add / Edit User
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [formUsername, setFormUsername] = useState('admin');
  const [formLoginName, setFormLoginName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formMobile, setFormMobile] = useState('');
  const [formPassword, setFormPassword] = useState('admin123');
  const [formRole, setFormRole] = useState<UserRole>('receptionist');
  const [formLinkedInstId, setFormLinkedInstId] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [userModalError, setUserModalError] = useState<string | null>(null);
  const [userActionNotice, setUserActionNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sync users & check URL param
  useEffect(() => {
    setUsers(getSystemUsers());

    // Fetch institutes for Institute Head role assignment
    async function fetchInstitutes() {
      try {
        const { data } = await supabase
          .from('institutes')
          .select('*')
          .order('official_name', { ascending: true });
        if (data && data.length > 0) {
          setInstitutesList(data);
        }
      } catch (err) {
        console.warn('Error fetching institutes for user management:', err);
      }
    }
    fetchInstitutes();

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('tab') === 'users') {
        setStep(4);
      }
    }
  }, []);

  const refreshUsersList = () => {
    setUsers(getSystemUsers());
  };

  const handleOpenAddUserModal = () => {
    setEditingUserId(null);
    setFormUsername('');
    setFormLoginName('');
    setFormEmail('');
    setFormMobile('');
    setFormPassword('admin123');
    setFormRole('receptionist');
    setFormLinkedInstId('');
    setFormIsActive(true);
    setUserModalError(null);
    setShowUserModal(true);
  };

  const handleOpenEditUserModal = (u: SystemUser) => {
    setEditingUserId(u.id);
    setFormUsername(u.username);
    setFormLoginName(u.login_name);
    setFormEmail(u.email);
    setFormMobile(u.mobile_number || '');
    setFormPassword(u.password || 'admin123');
    setFormRole(u.role);
    setFormLinkedInstId(u.linked_institute_id || '');
    setFormIsActive(u.is_active);
    setUserModalError(null);
    setShowUserModal(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserModalError(null);

    if (!formUsername.trim()) {
      setUserModalError('Username is required.');
      return;
    }
    if (!formLoginName.trim()) {
      setUserModalError('Login Name is required.');
      return;
    }
    if (!formEmail.trim()) {
      setUserModalError('Email ID is required.');
      return;
    }
    if (!formPassword.trim()) {
      setUserModalError('Password is required.');
      return;
    }

    try {
      const linkedInst = institutesList.find((i) => i.id === formLinkedInstId);
      if (editingUserId) {
        await updateSystemUser(editingUserId, {
          username: formUsername,
          login_name: formLoginName,
          email: formEmail,
          mobile_number: formMobile,
          password: formPassword,
          role: formRole,
          linked_institute_id: formRole === 'institute_head' ? formLinkedInstId || undefined : undefined,
          linked_institute_name: formRole === 'institute_head' ? (linkedInst?.official_name || linkedInst?.name) : undefined,
          is_active: formIsActive,
        });
        setUserActionNotice({ type: 'success', text: `User "${formUsername}" updated successfully!` });
      } else {
        await createSystemUser({
          username: formUsername,
          login_name: formLoginName,
          email: formEmail,
          mobile_number: formMobile,
          password: formPassword,
          role: formRole,
          linked_institute_id: formRole === 'institute_head' ? formLinkedInstId || undefined : undefined,
          linked_institute_name: formRole === 'institute_head' ? (linkedInst?.official_name || linkedInst?.name) : undefined,
          is_active: formIsActive,
        });
        setUserActionNotice({ type: 'success', text: `New user "${formUsername}" provisioned successfully!` });
      }

      refreshUsersList();
      setShowUserModal(false);
    } catch (err: any) {
      setUserModalError(err.message || 'Failed to save user.');
    }
  };

  const handleToggleUserStatus = async (user: SystemUser) => {
    try {
      const nextStatus = !user.is_active;
      await setUserActiveStatus(user.id, nextStatus);
      refreshUsersList();
      setUserActionNotice({
        type: 'success',
        text: `User "${user.username}" is now ${nextStatus ? 'ACTIVE' : 'DISABLED'}.`,
      });
    } catch (err: any) {
      setUserActionNotice({ type: 'error', text: err.message || 'Failed to toggle status.' });
    }
  };

  const handleDeleteUserClick = async (user: SystemUser) => {
    if (confirm(`Are you sure you want to delete user "${user.username}" (${user.login_name})?`)) {
      try {
        await deleteSystemUser(user.id);
        refreshUsersList();
        setUserActionNotice({ type: 'success', text: `User "${user.username}" deleted.` });
      } catch (err: any) {
        setUserActionNotice({ type: 'error', text: err.message || 'Failed to delete user.' });
      }
    }
  };

  const handleResetUsers = () => {
    if (confirm('Reset system accounts to default initial users (admin, frontdesk, principal, appointment)?')) {
      resetSystemUsersToDefault();
      refreshUsersList();
      setUserActionNotice({ type: 'success', text: 'System users restored to initial default accounts.' });
    }
  };

  // Handle Logo Upload with Client-Side Compression
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('File size exceeds 2 MB limit. Please select a smaller logo.');
      return;
    }

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      alert('Invalid file format. Please upload PNG, JPG, WEBP, or SVG.');
      return;
    }

    setIsUploadingLogo(true);
    setMessage(null);

    try {
      // 1. Compress client-side (keeps sharp vector/raster quality while shrinking bytes)
      const compressed = await compressLogoImage(file, 600, 600, 0.92);

      // 2. Upload to Supabase 'branding' bucket
      const ext = file.name.split('.').pop() || 'png';
      const fileName = `trust_logo_${Date.now()}.${ext}`;

      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('branding')
        .upload(fileName, compressed, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadErr) throw uploadErr;

      const { data: publicUrlData } = supabase.storage
        .from('branding')
        .getPublicUrl(uploadData.path);

      const publicUrl = publicUrlData.publicUrl;

      // Update state
      setOrgData((prev) => ({ ...prev, logo_url: publicUrl }));

      // Immediately persist to DB if record exists
      if (orgData.id) {
        await supabase
          .from('organization_settings')
          .update({ logo_url: publicUrl, updated_at: new Date().toISOString() })
          .eq('id', orgData.id);
      }

      setMessage({ type: 'success', text: 'Trust Logo uploaded and saved successfully!' });
    } catch (err: any) {
      console.error('Logo upload error:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to upload logo.' });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  // Handle Delete Logo
  const handleDeleteLogo = async () => {
    if (confirm('Are you sure you want to remove the Trust logo? This will revert to the text badge on all letters and receipts.')) {
      setOrgData((prev) => ({ ...prev, logo_url: '' }));
      if (orgData.id) {
        await supabase
          .from('organization_settings')
          .update({ logo_url: null, updated_at: new Date().toISOString() })
          .eq('id', orgData.id);
      }
      setMessage({ type: 'success', text: 'Logo removed successfully.' });
    }
  };

  const handleFinishSetup = async (redirectOnComplete = false) => {
    setLoading(true);
    setMessage(null);

    try {
      const payload = {
        name: orgData.name,
        address: orgData.address,
        registration_no: orgData.registration_no || null,
        registration_date: orgData.registration_date || null,
        tagline: orgData.tagline || null,
        logo_url: orgData.logo_url || null,
        president_name: orgData.president_name || null,
        hr_head_name: orgData.hr_head_name || null,
        contact_email: orgData.contact_email || null,
        contact_phone: orgData.contact_phone || null,
        receipt_prefix: orgData.receipt_prefix || 'REC/2026-27/',
        receipt_starting_no: orgData.receipt_starting_no || 1001,
        app_no_prefix: orgData.app_no_prefix || 'REG',
        fee_receipt_prefix: orgData.fee_receipt_prefix || 'FR',
        number_digits: orgData.number_digits || 5,
        year_basis: orgData.year_basis || 'calendar',
        restart_yearly: orgData.restart_yearly ?? true,
        receipt_header_text: orgData.receipt_header_text || null,
        receipt_footer_text: orgData.receipt_footer_text || null,
        updated_at: new Date().toISOString(),
      };

      // 1. Save or Update Organisation Settings
      if (orgData.id) {
        const { error: orgError } = await supabase
          .from('organization_settings')
          .update(payload)
          .eq('id', orgData.id);

        if (orgError) throw orgError;
      } else {
        const { data: inserted, error: orgError } = await supabase
          .from('organization_settings')
          .insert(payload)
          .select()
          .single();

        if (orgError) throw orgError;
        if (inserted) {
          setOrgData((prev) => ({ ...prev, id: inserted.id }));
        }
      }

      // 2. Insert Staff Categories
      for (const cat of categories) {
        await supabase
          .from('staff_categories')
          .upsert({
            name: cat.name,
            description: cat.description,
            application_fee: cat.fee,
            is_active: true,
          }, { onConflict: 'name' });
      }

      // 3. Insert default payment modes
      const defaultModes = ['Cash', 'UPI / QR Code', 'Demand Draft (DD)', 'Bank Transfer / NEFT'];
      for (const mode of defaultModes) {
        await supabase
          .from('payment_modes')
          .upsert({ name: mode, is_active: true }, { onConflict: 'name' });
      }

      setMessage({ 
        type: 'success', 
        text: redirectOnComplete 
          ? 'Organisation setup completed successfully! Redirecting...' 
          : 'Settings and Trust Logo saved successfully!' 
      });

      if (redirectOnComplete) {
        setTimeout(() => {
          router.push('/');
        }, 1200);
      }

    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Setup failed. Please check table permissions.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <RoleGuard
      allowedRoles={['admin_head_hr']}
      title="Head Central HR Setup Required"
      description="Only Head Central HR Administrators have permission to alter Trust settings, branding logos, receipt numbering schemes, and staff fee categories."
    >
      <div className="min-h-screen bg-slate-100 py-10 px-4">
      <div className={`mx-auto transition-all duration-300 ${step === 4 ? 'max-w-5xl' : 'max-w-3xl'}`}>
        {/* Wizard Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-sky-600 bg-sky-50 px-2.5 py-1 rounded-full">
                Step {step} of 4
              </span>
              <h1 className="text-2xl font-bold text-slate-800 mt-1">Trust Setup, Branding &amp; User RBAC</h1>
              <p className="text-xs text-slate-500">Configure your Trust's institutional branding, fee rules, receipt templates, and staff user access permissions.</p>
            </div>
          </div>

          {/* Stepper Indicator */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className={`p-2.5 rounded-xl text-center text-xs font-medium flex items-center justify-center gap-1.5 transition ${step === 1 ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              <Building2 className="w-4 h-4" /> 1. Organisation &amp; Logo
            </button>
            <button
              type="button"
              onClick={() => setStep(2)}
              className={`p-2.5 rounded-xl text-center text-xs font-medium flex items-center justify-center gap-1.5 transition ${step === 2 ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              <Layers className="w-4 h-4" /> 2. Categories &amp; Fees
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className={`p-2.5 rounded-xl text-center text-xs font-medium flex items-center justify-center gap-1.5 transition ${step === 3 ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              <Receipt className="w-4 h-4" /> 3. Receipt Settings
            </button>
            <button
              type="button"
              onClick={() => setStep(4)}
              className={`p-2.5 rounded-xl text-center text-xs font-medium flex items-center justify-center gap-1.5 transition ${step === 4 ? 'bg-purple-700 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              <UserCog className="w-4 h-4" /> 4. Users &amp; RBAC
            </button>
          </div>
        </div>

        {/* Message Alert */}
        {message && (
          <div className={`p-4 rounded-xl mb-6 text-sm flex items-center gap-2 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            {message.text}
          </div>
        )}

        {/* Form Container */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          {/* STEP 1: Organisation Details & Trust Logo */}
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 border-b pb-2">
                <Building2 className="w-5 h-5 text-sky-600" /> Trust / Organisation Details & Logo
              </h2>

              {/* Dedicated Trust Logo Management Card */}
              <div className="p-4 sm:p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-sky-700" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Official Trust / Sanstha Logo
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">
                    PNG, JPG, SVG • Auto-Compressed • Max 2MB
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-5 bg-white p-4 rounded-xl border border-slate-200">
                  {/* Logo Preview Box */}
                  <div className="w-24 h-24 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center p-2 overflow-hidden flex-shrink-0 relative">
                    {orgData.logo_url ? (
                      <img
                        src={orgData.logo_url}
                        alt="Trust Logo Preview"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="text-center text-slate-400">
                        <ImageIcon className="w-8 h-8 mx-auto mb-1 opacity-50" />
                        <span className="text-[9px] font-bold block">No Logo</span>
                      </div>
                    )}
                  </div>

                  {/* Actions & Information */}
                  <div className="flex-1 space-y-2 text-center sm:text-left">
                    <p className="text-xs text-slate-600 leading-relaxed">
                      This logo appears on all <strong>Fee Receipts (Office & Candidate Copy)</strong>, <strong>Candidate A4 Application Forms</strong>, the <strong>Portal Header</strong>, and <strong>QR Standee Boards</strong>.
                    </p>

                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                      <label className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-sky-700 hover:bg-sky-800 text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer">
                        <UploadCloud className="w-3.5 h-3.5" />
                        {isUploadingLogo ? 'Compressing & Uploading...' : orgData.logo_url ? 'Replace Logo' : 'Upload Logo'}
                        <input
                          type="file"
                          accept="image/png, image/jpeg, image/jpg, image/webp, image/svg+xml"
                          onChange={handleLogoUpload}
                          disabled={isUploadingLogo}
                          className="hidden"
                        />
                      </label>

                      {orgData.logo_url && (
                        <button
                          type="button"
                          onClick={handleDeleteLogo}
                          className="inline-flex items-center gap-1 px-3 py-2 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Trust / Society Full Name *</label>
                <input
                  type="text"
                  value={orgData.name || ''}
                  onChange={(e) => setOrgData({ ...orgData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  placeholder="e.g. Shri Balasaheb Mane Shikshan Prasarak Mandal, Ambap"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Official Address *</label>
                <textarea
                  rows={2}
                  value={orgData.address || ''}
                  onChange={(e) => setOrgData({ ...orgData, address: e.target.value })}
                  className="w-full px-3.5 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  placeholder="Full office address with Taluka, District, and PIN"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Registration / Act Details</label>
                  <input
                    type="text"
                    value={orgData.registration_no || ''}
                    onChange={(e) => setOrgData({ ...orgData, registration_no: e.target.value })}
                    className="w-full px-3.5 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    placeholder="e.g. Regd. under B.P.T. Act 1950, No. F-1727-Kolhapur"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Registration Date</label>
                  <input
                    type="text"
                    value={orgData.registration_date || ''}
                    onChange={(e) => setOrgData({ ...orgData, registration_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    placeholder="e.g. 02/02/1981"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tagline / Department Sub-heading</label>
                  <input
                    type="text"
                    value={orgData.tagline || ''}
                    onChange={(e) => setOrgData({ ...orgData, tagline: e.target.value })}
                    className="w-full px-3.5 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    placeholder="e.g. Education as a Service"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">President / Chairman Name</label>
                  <input
                    type="text"
                    value={orgData.president_name || ''}
                    onChange={(e) => setOrgData({ ...orgData, president_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    placeholder="e.g. Shri Vijaysinh Ashokrao Mane"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Head of Central HR Name</label>
                  <input
                    type="text"
                    value={orgData.hr_head_name || ''}
                    onChange={(e) => setOrgData({ ...orgData, hr_head_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    placeholder="e.g. Mrs. Priyanka M. Sutar"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">HR Contact Email</label>
                  <input
                    type="email"
                    value={orgData.contact_email || ''}
                    onChange={(e) => setOrgData({ ...orgData, contact_email: e.target.value })}
                    className="w-full px-3.5 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    placeholder="hr@trustname.org"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">HR Phone / Mobile Number</label>
                <input
                  type="text"
                  value={orgData.contact_phone || ''}
                  onChange={(e) => setOrgData({ ...orgData, contact_phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  placeholder="+91 9876543210"
                />
              </div>
            </div>
          )}

          {/* STEP 2: Categories and Application Fees */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 border-b pb-2">
                <Layers className="w-5 h-5 text-sky-600" /> Staff Categories & Application Fees
              </h2>
              <p className="text-xs text-slate-500">
                Define the recruitment categories and the application fee charged for each category.
              </p>

              <div className="space-y-3">
                {categories.map((cat, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3.5 bg-slate-50 border rounded-xl">
                    <div>
                      <span className="font-bold text-slate-800 text-sm">{cat.name}</span>
                      <p className="text-xs text-slate-500">{cat.description}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-bold text-sky-600 bg-sky-50 px-3 py-1 rounded-lg border border-sky-100">
                        ₹ {cat.fee}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeCategory(idx)}
                        className="text-rose-500 hover:text-rose-700 p-1 text-xs font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add New Category Sub-Form */}
              <div className="border border-dashed border-slate-300 rounded-xl p-4 bg-white mt-4">
                <h4 className="text-xs font-bold uppercase text-slate-700 mb-3">Add New Category</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <input
                      type="text"
                      value={newCat.name}
                      onChange={(e) => setNewCat({ ...newCat, name: e.target.value })}
                      placeholder="Category Name (e.g. Technical Staff)"
                      className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      value={newCat.fee || ''}
                      onChange={(e) => setNewCat({ ...newCat, fee: Number(e.target.value) })}
                      placeholder="Fee (₹)"
                      className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={newCat.description}
                      onChange={(e) => setNewCat({ ...newCat, description: e.target.value })}
                      placeholder="Roles covered..."
                      className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={addCategory}
                  className="mt-3 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold"
                >
                  + Add Category Row
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Receipt Template & Prefix */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 border-b pb-2">
                <Receipt className="w-5 h-5 text-sky-600" /> Receipt & Numbering Configuration
              </h2>
              <p className="text-xs text-slate-500">
                Configure prefixes and numbering rules for fee receipts and candidate registrations.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Application No. Prefix</label>
                  <input
                    type="text"
                    value={orgData.app_no_prefix || 'REG'}
                    onChange={(e) => setOrgData({ ...orgData, app_no_prefix: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2.5 border rounded-xl text-sm font-mono focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    placeholder="REG"
                  />
                  <span className="text-[11px] text-slate-500">Example: REG-2026-00001</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Fee Receipt Prefix</label>
                  <input
                    type="text"
                    value={orgData.fee_receipt_prefix || 'FR'}
                    onChange={(e) => setOrgData({ ...orgData, fee_receipt_prefix: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2.5 border rounded-xl text-sm font-mono focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    placeholder="FR"
                  />
                  <span className="text-[11px] text-slate-500">Example: FR-2026-00001</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Year Format</label>
                  <select
                    value={orgData.year_basis || 'calendar'}
                    onChange={(e) => setOrgData({ ...orgData, year_basis: e.target.value as 'calendar' | 'financial' })}
                    className="w-full px-3.5 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white"
                  >
                    <option value="calendar">Calendar Year (2026)</option>
                    <option value="financial">Financial Year (2026-27)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Yearly Restart Counter</label>
                  <select
                    value={orgData.restart_yearly ? 'yes' : 'no'}
                    onChange={(e) => setOrgData({ ...orgData, restart_yearly: e.target.value === 'yes' })}
                    className="w-full px-3.5 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white"
                  >
                    <option value="yes">Yes (Restart at 00001 every year)</option>
                    <option value="no">No (Continuous increment forever)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Receipt Title / Header Line</label>
                <input
                  type="text"
                  value={orgData.receipt_header_text || ''}
                  onChange={(e) => setOrgData({ ...orgData, receipt_header_text: e.target.value })}
                  className="w-full px-3.5 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Receipt Footer Note</label>
                <textarea
                  rows={2}
                  value={orgData.receipt_footer_text || ''}
                  onChange={(e) => setOrgData({ ...orgData, receipt_footer_text: e.target.value })}
                  className="w-full px-3.5 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div className="p-3 bg-sky-50 rounded-xl border border-sky-200 text-xs text-sky-800">
                <strong>Duplicate Copies:</strong> Every receipt will automatically be generated in duplicate (one <strong>Office Copy</strong> for filing and one <strong>Candidate Copy</strong>) with institutional Trust Letterhead branding.
              </div>
            </div>
          )}

          {/* STEP 4: Add / Edit / Disable User (User Management & RBAC) */}
          {step === 4 && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <UserCog className="w-5 h-5 text-purple-700" /> Add / Edit / Disable User
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Central User Provisioning &amp; Role-Based Access Control (RBAC) Management
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleOpenAddUserModal}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition shadow-sm"
                  >
                    <Plus className="w-4 h-4" /> Add New User
                  </button>
                  <button
                    type="button"
                    onClick={handleResetUsers}
                    className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition"
                    title="Restore default admin, frontdesk, principal, appointment accounts"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Restore Defaults
                  </button>
                </div>
              </div>

              {/* Action Notice Alert */}
              {userActionNotice && (
                <div
                  className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between ${
                    userActionNotice.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>{userActionNotice.text}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUserActionNotice(null)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Role Definitions & Menu Permissions Overview Matrix */}
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-purple-700" /> Role Definitions &amp; Menu Permissions Matrix
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">Strictly Enforced via RoleGuard</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Role 1: Front Desk Officer */}
                  <div className="bg-white p-3.5 rounded-xl border border-sky-200 shadow-2xs space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
                        <UserCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-sky-950 block">Front Desk Officer</span>
                        <span className="text-[10px] text-sky-700 font-mono">role: receptionist</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-snug">
                      <strong>Access:</strong> Limited to Front Desk Reception, Registration, Walk-in queues, Document Verification, and Fee Receipts.
                    </p>
                    <div className="pt-1 border-t border-slate-100 flex flex-wrap gap-1">
                      <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[9.5px] font-mono text-slate-700">/receptionist</span>
                      <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[9.5px] font-mono text-slate-700">/apply</span>
                      <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[9.5px] font-mono text-slate-700">/qr</span>
                    </div>
                  </div>

                  {/* Role 2: Central HR (Admin) */}
                  <div className="bg-white p-3.5 rounded-xl border border-purple-200 shadow-2xs space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-purple-950 block">Central HR (Admin)</span>
                        <span className="text-[10px] text-purple-700 font-mono">role: admin_head_hr</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-snug">
                      <strong>Access:</strong> Full system-wide administrative access across all modules, trust setup, and master databases.
                    </p>
                    <div className="pt-1 border-t border-slate-100 flex flex-wrap gap-1">
                      <span className="px-1.5 py-0.5 bg-purple-50 text-purple-800 rounded text-[9.5px] font-mono font-bold">All Modules &amp; Setup</span>
                    </div>
                  </div>

                  {/* Role 3: Institute Head */}
                  <div className="bg-white p-3.5 rounded-xl border border-indigo-200 shadow-2xs space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                        <GraduationCap className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-indigo-950 block">Institute Head</span>
                        <span className="text-[10px] text-indigo-700 font-mono">role: institute_head</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-snug">
                      <strong>Access:</strong> Restricted to specific institute/branch management, candidate reviews, physical interview marks, and staff matrix.
                    </p>
                    <div className="pt-1 border-t border-slate-100 flex flex-wrap gap-1">
                      <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[9.5px] font-mono text-slate-700">/institute-portal</span>
                    </div>
                  </div>

                  {/* Role 4: Appointment Officer */}
                  <div className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-2xs space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                        <Award className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-amber-950 block">Appointment Officer</span>
                        <span className="text-[10px] text-amber-700 font-mono">role: appointment_officer</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-snug">
                      <strong>Access:</strong> Dedicated access strictly to the newly independent Appointment &amp; Recruitment module across all institutes.
                    </p>
                    <div className="pt-1 border-t border-slate-100 flex flex-wrap gap-1">
                      <span className="px-1.5 py-0.5 bg-amber-50 text-amber-800 rounded text-[9.5px] font-mono font-bold">/appointment</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* User Search & Filters Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    placeholder="Search by Username, Login Name, Email ID, or Mobile..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none transition"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                    <select
                      value={userRoleFilter}
                      onChange={(e) => setUserRoleFilter(e.target.value)}
                      className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:bg-white focus:outline-none"
                    >
                      <option value="all">All Roles</option>
                      <option value="admin_head_hr">Central HR (Admin)</option>
                      <option value="receptionist">Front Desk Officer</option>
                      <option value="institute_head">Institute Head</option>
                      <option value="appointment_officer">Appointment Officer</option>
                    </select>
                  </div>

                  <select
                    value={userStatusFilter}
                    onChange={(e) => setUserStatusFilter(e.target.value as any)}
                    className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:bg-white focus:outline-none"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active Users Only</option>
                    <option value="disabled">Disabled Users Only</option>
                  </select>
                </div>
              </div>

              {/* Users Registry List / Table */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-3 px-4">User Details</th>
                        <th className="py-3 px-4">Login Name &amp; Contact</th>
                        <th className="py-3 px-4">Assigned Role</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {users
                        .filter((u) => {
                          if (userRoleFilter !== 'all' && u.role !== userRoleFilter) return false;
                          if (userStatusFilter === 'active' && !u.is_active) return false;
                          if (userStatusFilter === 'disabled' && u.is_active) return false;
                          if (userSearchQuery.trim()) {
                            const q = userSearchQuery.toLowerCase();
                            const matchU = u.username.toLowerCase().includes(q);
                            const matchL = u.login_name.toLowerCase().includes(q);
                            const matchE = u.email.toLowerCase().includes(q);
                            const matchM = (u.mobile_number || '').toLowerCase().includes(q);
                            if (!matchU && !matchL && !matchE && !matchM) return false;
                          }
                          return true;
                        })
                        .map((u) => {
                          const isCentralAdmin = u.role === 'admin_head_hr';
                          const isFrontDesk = u.role === 'receptionist';
                          const isInstHead = u.role === 'institute_head';
                          const isApptOfficer = u.role === 'appointment_officer';

                          return (
                            <tr
                              key={u.id}
                              className={`hover:bg-slate-50/80 transition ${
                                !u.is_active ? 'bg-rose-50/20 opacity-75' : ''
                              }`}
                            >
                              {/* Username */}
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-2">
                                  <div
                                    className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${
                                      isCentralAdmin
                                        ? 'bg-purple-100 text-purple-800'
                                        : isApptOfficer
                                        ? 'bg-amber-100 text-amber-800'
                                        : isInstHead
                                        ? 'bg-indigo-100 text-indigo-800'
                                        : 'bg-sky-100 text-sky-800'
                                    }`}
                                  >
                                    {u.username.substring(0, 2).toUpperCase()}
                                  </div>
                                  <div>
                                    <span className="font-mono font-bold text-slate-900 block">
                                      @{u.username}
                                    </span>
                                    <span className="text-[10px] text-slate-400 block font-mono">
                                      Pass: {u.password || 'admin123'}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              {/* Login Name & Contact */}
                              <td className="py-3.5 px-4">
                                <div>
                                  <span className="font-bold text-slate-800 block text-xs">
                                    {u.login_name}
                                  </span>
                                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                                    <span className="flex items-center gap-1">
                                      <Mail className="w-3 h-3 text-slate-400" /> {u.email}
                                    </span>
                                    {u.mobile_number && (
                                      <span className="flex items-center gap-1 font-mono">
                                        <Phone className="w-3 h-3 text-slate-400" /> {u.mobile_number}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* Assigned Role */}
                              <td className="py-3.5 px-4">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                                    isCentralAdmin
                                      ? 'bg-purple-50 text-purple-800 border-purple-200'
                                      : isApptOfficer
                                      ? 'bg-amber-50 text-amber-900 border-amber-200'
                                      : isInstHead
                                      ? 'bg-indigo-50 text-indigo-900 border-indigo-200'
                                      : 'bg-sky-50 text-sky-900 border-sky-200'
                                  }`}
                                >
                                  {isCentralAdmin && <ShieldCheck className="w-3.5 h-3.5 text-purple-700" />}
                                  {isApptOfficer && <Award className="w-3.5 h-3.5 text-amber-700" />}
                                  {isInstHead && <GraduationCap className="w-3.5 h-3.5 text-indigo-700" />}
                                  {isFrontDesk && <UserCheck className="w-3.5 h-3.5 text-sky-700" />}
                                  {isCentralAdmin
                                    ? 'Central HR (Admin)'
                                    : isApptOfficer
                                    ? 'Appointment Officer'
                                    : isInstHead
                                    ? 'Institute Head'
                                    : 'Front Desk Officer'}
                                </span>

                                {isInstHead && u.linked_institute_name && (
                                  <span className="block text-[10px] text-indigo-700 font-semibold mt-1">
                                    Branch: {u.linked_institute_name}
                                  </span>
                                )}
                              </td>

                              {/* Status */}
                              <td className="py-3.5 px-4">
                                {u.is_active ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                    <Check className="w-3 h-3 text-emerald-600" /> Active
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                                    <Ban className="w-3 h-3 text-rose-600" /> Disabled
                                  </span>
                                )}
                              </td>

                              {/* Actions */}
                              <td className="py-3.5 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {/* Edit User Button */}
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditUserModal(u)}
                                    className="p-1.5 text-slate-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition"
                                    title="Edit User Details"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>

                                  {/* Disable / Enable User Toggle Button */}
                                  <button
                                    type="button"
                                    onClick={() => handleToggleUserStatus(u)}
                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition ${
                                      u.is_active
                                        ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                                        : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                    }`}
                                    title={u.is_active ? 'Disable user account' : 'Re-enable user account'}
                                  >
                                    {u.is_active ? 'Disable' : 'Enable'}
                                  </button>

                                  {/* Delete User Button (not for default admin) */}
                                  {u.username !== 'admin' && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteUserClick(u)}
                                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                      title="Delete User"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Add / Edit User Modal */}
              {showUserModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
                  <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 sm:p-7 space-y-5">
                    <div className="flex items-center justify-between border-b pb-3">
                      <div>
                        <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                          <UserCog className="w-5 h-5 text-purple-700" />
                          {editingUserId ? 'Edit User Credentials & Role' : 'Add New User (RBAC)'}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {editingUserId ? 'Modify user information or permissions' : 'Provision a new staff account'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowUserModal(false)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {userModalError && (
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        {userModalError}
                      </div>
                    )}

                    <form className="space-y-4" onSubmit={handleSaveUser}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* 1. Username */}
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                            Username *
                          </label>
                          <input
                            type="text"
                            required
                            value={formUsername}
                            onChange={(e) => setFormUsername(e.target.value)}
                            placeholder="e.g. admin or suresh"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                          />
                          <span className="text-[10px] text-slate-400 mt-0.5 block">Unique login identifier</span>
                        </div>

                        {/* 2. Login Name */}
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                            Login / Display Name *
                          </label>
                          <input
                            type="text"
                            required
                            value={formLoginName}
                            onChange={(e) => setFormLoginName(e.target.value)}
                            placeholder="e.g. Mrs. Priyanka Sutar"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                          />
                          <span className="text-[10px] text-slate-400 mt-0.5 block">Full official name</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* 3. Email ID */}
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                            Email ID *
                          </label>
                          <input
                            type="email"
                            required
                            value={formEmail}
                            onChange={(e) => setFormEmail(e.target.value)}
                            placeholder="e.g. hr@sbmsmspm.org"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                          />
                        </div>

                        {/* 4. Mobile Number */}
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                            Mobile Number
                          </label>
                          <input
                            type="text"
                            value={formMobile}
                            onChange={(e) => setFormMobile(e.target.value)}
                            placeholder="e.g. +91 9876543210"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* 5. Password */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Password *
                        </label>
                        <input
                          type="text"
                          required
                          value={formPassword}
                          onChange={(e) => setFormPassword(e.target.value)}
                          placeholder="e.g. admin123"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none font-mono"
                        />
                        <span className="text-[10px] text-slate-400 mt-0.5 block">Default test password: admin123</span>
                      </div>

                      {/* 6. User Role Assignment */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          User Role Assignment (Dropdown) *
                        </label>
                        <select
                          value={formRole}
                          onChange={(e) => setFormRole(e.target.value as UserRole)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                        >
                          <option value="receptionist">Front Desk Officer (Reception, Walk-in, Fee Register)</option>
                          <option value="admin_head_hr">Central HR (Admin) (Full Master &amp; Trust Setup Access)</option>
                          <option value="institute_head">Institute Head (Campus Reviews &amp; Staff Matrix)</option>
                          <option value="appointment_officer">Appointment Officer (Dedicated to Appointment &amp; Recruitment)</option>
                        </select>
                      </div>

                      {/* Linked Institute (If Role is Institute Head) */}
                      {formRole === 'institute_head' && (
                        <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl space-y-1">
                          <label className="block text-xs font-bold text-indigo-950 uppercase tracking-wider">
                            Assign Specific Institute / College
                          </label>
                          <select
                            value={formLinkedInstId}
                            onChange={(e) => setFormLinkedInstId(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          >
                            <option value="">Select College / Institute...</option>
                            {institutesList.map((inst) => (
                              <option key={inst.id} value={inst.id}>
                                {inst.official_name || inst.name}
                              </option>
                            ))}
                          </select>
                          <span className="text-[10px] text-indigo-700 block">
                            The Institute Head will see candidate submissions and sanctioned matrix for this campus.
                          </span>
                        </div>
                      )}

                      {/* 7. Active / Disabled Checkbox */}
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          id="formIsActive"
                          type="checkbox"
                          checked={formIsActive}
                          onChange={(e) => setFormIsActive(e.target.checked)}
                          className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
                        />
                        <label htmlFor="formIsActive" className="text-xs font-bold text-slate-800 cursor-pointer">
                          Account Active (Uncheck to Disable user and prevent sign-in)
                        </label>
                      </div>

                      <div className="flex items-center justify-end gap-2.5 pt-3 border-t">
                        <button
                          type="button"
                          onClick={() => setShowUserModal(false)}
                          className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition shadow-sm"
                        >
                          {editingUserId ? 'Save Changes' : 'Create User'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Navigation & Action Buttons */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-6 mt-6">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="inline-flex items-center gap-1.5 px-4 py-2 border rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            ) : <div />}

            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={loading}
                onClick={() => handleFinishSetup(false)}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow transition disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Settings'}
              </button>

              {step < 4 ? (
                <button
                  type="button"
                  onClick={() => setStep(step + 1)}
                  className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl shadow transition"
                >
                  Next Step <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleFinishSetup(true)}
                  className="inline-flex items-center gap-1.5 px-7 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow transition disabled:opacity-50"
                >
                  {loading ? 'Saving Setup...' : 'Complete & Finish'} <CheckCircle2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    </RoleGuard>
  );
}
