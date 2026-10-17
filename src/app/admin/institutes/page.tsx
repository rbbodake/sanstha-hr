'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Institute } from '@/types/database';
import { RoleGuard } from '@/components/RoleGuard';
import { 
  Building2, 
  Plus, 
  Search, 
  Eye, 
  Edit3, 
  Trash2, 
  ArrowLeft, 
  MapPin, 
  Phone, 
  Mail, 
  User, 
  GraduationCap, 
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Layers,
  Archive,
  RefreshCw
} from 'lucide-react';

export default function InstitutesListPage() {
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Delete / Archive Modal State
  const [selectedInstituteForDelete, setSelectedInstituteForDelete] = useState<Institute | null>(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [deleteWarning, setDeleteWarning] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchInstitutes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('institutes')
        .select(`
          *,
          institute_approvals (*),
          institute_courses (*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setInstitutes(data);
    } catch (err: any) {
      console.error('Error fetching institutes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstitutes();
  }, []);

  // Distinct institute types for filter pills
  const instituteTypes = Array.from(new Set(institutes.map(i => i.institute_type).filter(Boolean)));

  // Filtered List
  const filteredInstitutes = institutes.filter((inst) => {
    const matchesSearch = 
      (inst.official_name || inst.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inst.short_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inst.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inst.district || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === 'all' || inst.institute_type === typeFilter;
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' ? inst.is_active : !inst.is_active);

    return matchesSearch && matchesType && matchesStatus;
  });

  // Check before delete (Safety Rule 5)
  const openDeleteModal = async (inst: Institute) => {
    setSelectedInstituteForDelete(inst);
    setDeleteConfirmationText('');
    setDeleteWarning(null);

    // Check if institute is referenced in applications or posts
    try {
      const { count: appCount } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('preferred_institute_id', inst.id);

      const { count: postCount } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('institute_id', inst.id);

      const totalLinked = (appCount || 0) + (postCount || 0);

      if (totalLinked > 0) {
        setDeleteWarning(
          `This institute is currently linked to ${totalLinked} existing recruitment records (Applications / Positions). It cannot be permanently deleted. Instead, it will be safely Archived / Marked Inactive to protect all historical records.`
        );
      }
    } catch (e) {
      console.warn('Link check failed:', e);
    }
  };

  // Perform Delete or Archive
  const handleConfirmDeleteOrArchive = async () => {
    if (!selectedInstituteForDelete) return;
    setIsDeleting(true);

    try {
      if (deleteWarning) {
        // Archive (Set is_active = false)
        const { error } = await supabase
          .from('institutes')
          .update({ is_active: false })
          .eq('id', selectedInstituteForDelete.id);
        if (error) throw error;
      } else {
        // Permanent Safe Delete
        const { error } = await supabase
          .from('institutes')
          .delete()
          .eq('id', selectedInstituteForDelete.id);
        if (error) throw error;
      }

      setSelectedInstituteForDelete(null);
      await fetchInstitutes();
    } catch (err: any) {
      alert(err.message || 'Error processing request');
    } finally {
      setIsDeleting(false);
    }
  };

  // Toggle Active/Inactive status directly
  const handleToggleStatus = async (inst: Institute) => {
    try {
      const { error } = await supabase
        .from('institutes')
        .update({ is_active: !inst.is_active })
        .eq('id', inst.id);
      if (error) throw error;
      await fetchInstitutes();
    } catch (err: any) {
      alert(err.message || 'Error updating status');
    }
  };

  return (
    <RoleGuard
      allowedRoles={['admin_head_hr']}
      title="Head Central HR Access Required"
      description="Only Head Central HR Administrators have permission to manage Institutes, Colleges, Regulatory Approvals, and Principal assignments."
    >
      <div className="min-h-screen bg-slate-100 text-slate-900 pb-16">
      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href="/"
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-sky-700" /> Institute / College Master
              </h1>
              <p className="text-[11px] text-slate-500 font-medium">
                Head Central HR • Manage Colleges, Schools, Regulatory Approvals, Principals & Courses
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/institutes/create"
              className="px-4 py-2 bg-sky-700 hover:bg-sky-800 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5 transition"
            >
              <Plus className="w-4 h-4" /> Add New Institute
            </Link>
            <Link
              href="/admin/posts"
              className="px-3.5 py-2 border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition shadow-sm"
            >
              Job Designations
            </Link>
          </div>
        </div>
      </header>

      {/* Main Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-8">
        {/* Search & Filters */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Search institute name, short name, code, district..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Type & Status Filters */}
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                typeFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All Types
            </button>
            {instituteTypes.map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  typeFilter === t
                    ? 'bg-sky-700 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {t}
              </button>
            ))}

            <div className="h-6 w-px bg-slate-300 mx-1" />

            <button
              onClick={() => setStatusFilter(statusFilter === 'all' ? 'active' : statusFilter === 'active' ? 'inactive' : 'all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition ${
                statusFilter === 'active'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : statusFilter === 'inactive'
                  ? 'bg-rose-50 text-rose-800 border-rose-300'
                  : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              Status: {statusFilter.toUpperCase()}
            </button>
          </div>
        </div>

        {/* Institutes Grid / List */}
        {loading ? (
          <div className="p-20 text-center text-slate-500 bg-white rounded-3xl border border-slate-200">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-sky-700 border-t-transparent mx-auto mb-3"></div>
            Loading institutes & colleges...
          </div>
        ) : filteredInstitutes.length === 0 ? (
          <div className="p-16 text-center text-slate-500 bg-white rounded-3xl border border-slate-200 space-y-3">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">No Institutes Found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {searchTerm ? 'No institutes match your search criteria.' : 'No institutes have been added yet. Click "+ Add New Institute" to create the first one.'}
            </p>
            <Link
              href="/admin/institutes/create"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-sky-700 hover:bg-sky-800 text-white rounded-xl text-xs font-bold shadow transition"
            >
              <Plus className="w-4 h-4" /> Add First Institute
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredInstitutes.map((inst) => (
              <div
                key={inst.id}
                className={`bg-white rounded-3xl border p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between ${
                  inst.is_active ? 'border-slate-200' : 'border-rose-200 bg-rose-50/20'
                }`}
              >
                <div>
                  {/* Card Header: Type Badge & Status */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-3 py-1 bg-sky-50 text-sky-800 border border-sky-200 rounded-full text-[11px] font-bold">
                      {inst.institute_type}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        inst.is_active
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}
                    >
                      {inst.is_active ? 'Active' : 'Inactive / Archived'}
                    </span>
                  </div>

                  {/* Official & Short Name */}
                  <h3 className="text-base font-bold text-slate-900 leading-snug">
                    {inst.official_name || inst.name}
                  </h3>
                  {inst.short_name && inst.short_name !== inst.official_name && (
                    <p className="text-xs font-semibold text-sky-700 mt-0.5">
                      Short Name: {inst.short_name}
                    </p>
                  )}

                  {inst.code && (
                    <p className="text-[11px] font-mono text-slate-500 mt-1">
                      Code: {inst.code} {inst.establishment_year ? `• Estd: ${inst.establishment_year}` : ''}
                    </p>
                  )}

                  {/* Address & Contact Snippet */}
                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                    <p className="flex items-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-2">
                        {inst.taluka ? `${inst.taluka}, ${inst.district || ''} - ${inst.pincode || ''}` : (inst.address || 'Address not configured')}
                      </span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{inst.official_email || 'No email'}</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span>{inst.head_designation || 'Principal'}: <strong>{inst.head_name || 'Not assigned'}</strong></span>
                    </p>
                  </div>

                  {/* Approvals & Courses Badges */}
                  <div className="mt-4 flex flex-wrap gap-2 text-[10px]">
                    <span className="px-2 py-1 bg-slate-100 rounded-lg text-slate-700 font-semibold">
                      Approvals: {inst.institute_approvals?.length || 0}
                    </span>
                    <span className="px-2 py-1 bg-slate-100 rounded-lg text-slate-700 font-semibold">
                      Courses: {inst.institute_courses?.length || 0}
                    </span>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                  <Link
                    href={`/admin/institutes/${inst.id}`}
                    className="inline-flex items-center gap-1 text-slate-600 hover:text-sky-700 font-bold"
                  >
                    <Eye className="w-3.5 h-3.5" /> View
                  </Link>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/institutes/${inst.id}/edit`}
                      className="p-1.5 text-slate-600 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition"
                      title="Edit Institute"
                    >
                      <Edit3 className="w-4 h-4" />
                    </Link>

                    <button
                      onClick={() => handleToggleStatus(inst)}
                      className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                      title={inst.is_active ? 'Archive / Deactivate' : 'Reactivate Institute'}
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => openDeleteModal(inst)}
                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                      title="Delete Institute"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Delete / Archive Confirmation Modal */}
      {selectedInstituteForDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-4 border border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              {deleteWarning ? <Archive className="w-6 h-6" /> : <Trash2 className="w-6 h-6" />}
            </div>

            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900">
                {deleteWarning ? 'Archive Institute?' : 'Permanently Delete Institute?'}
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                Institute: <strong>{selectedInstituteForDelete.official_name || selectedInstituteForDelete.name}</strong>
              </p>
            </div>

            {deleteWarning ? (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-1">
                <p className="font-bold">Active Records Protection:</p>
                <p>{deleteWarning}</p>
              </div>
            ) : (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800">
                <p>This institute has no active recruitment records. Permanently deleting will completely remove its profile, approvals, courses, and linked Principal accounts.</p>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t">
              <button
                type="button"
                onClick={() => setSelectedInstituteForDelete(null)}
                className="px-4 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDeleteOrArchive}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow transition ${
                  deleteWarning ? 'bg-amber-600 hover:bg-amber-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {isDeleting ? 'Processing...' : (deleteWarning ? 'Archive Institute' : 'Delete Permanently')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </RoleGuard>
  );
}
