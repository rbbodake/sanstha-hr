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
  Eye
} from 'lucide-react';

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
      <div className="max-w-3xl mx-auto">
        {/* Wizard Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-sky-600 bg-sky-50 px-2.5 py-1 rounded-full">
                Step {step} of 3
              </span>
              <h1 className="text-2xl font-bold text-slate-800 mt-1">Trust Setup & Branding Settings</h1>
              <p className="text-xs text-slate-500">Configure your Trust's institutional branding, logo, fee rules, and receipt templates.</p>
            </div>
          </div>

          {/* Stepper Indicator */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className={`p-2.5 rounded-xl text-center text-xs font-medium flex items-center justify-center gap-1.5 transition ${step === 1 ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              <Building2 className="w-4 h-4" /> 1. Organisation & Logo
            </button>
            <button
              type="button"
              onClick={() => setStep(2)}
              className={`p-2.5 rounded-xl text-center text-xs font-medium flex items-center justify-center gap-1.5 transition ${step === 2 ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              <Layers className="w-4 h-4" /> 2. Categories & Fees
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className={`p-2.5 rounded-xl text-center text-xs font-medium flex items-center justify-center gap-1.5 transition ${step === 3 ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              <Receipt className="w-4 h-4" /> 3. Receipt Settings
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

              {step < 3 ? (
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
