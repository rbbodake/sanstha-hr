'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Post, StaffCategory } from '@/types/database';
import { RoleGuard } from '@/components/RoleGuard';
import { useAuth } from '@/context/AuthContext';
import { Briefcase, Plus, Check, X, Shield, ArrowLeft, Layers, AlertCircle, Sparkles, Edit3, Settings2 } from 'lucide-react';

const programStreamOptions = [
  'All Programs / General',
  'Engineering & Technology',
  'Management (MBA / MMS)',
  'Computer Applications (MCA)',
  'Pharmacy',
  'BAMS (Ayurveda)',
  'BHMS (Homeopathy)',
  'Nursing & Health Sciences',
  'Education (B.Ed / D.Ed / M.Ed)',
  'Industrial Training Institute (ITI / Vocational)',
  'Arts, Commerce & Science (General Degree)',
  'Junior College / Higher Secondary',
  'School Education (CBSE / State)',
  'Other'
];

export default function JobDesignationsPage() {
  const { role } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<StaffCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState({
    title: '',
    category_id: '',
    program_stream: 'All Programs / General',
    qualification_requirement: '',
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedFilterCategory, setSelectedFilterCategory] = useState<string>('all');

  // Edit Category Fees Modal State
  const [showFeeModal, setShowFeeModal] = useState(false);
  const [editableCategories, setEditableCategories] = useState<StaffCategory[]>([]);
  const [savingFees, setSavingFees] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: catData } = await supabase
        .from('staff_categories')
        .select('*')
        .order('name');
      if (catData) {
        setCategories(catData);
        setEditableCategories(catData);
      }

      const { data: postData } = await supabase
        .from('posts')
        .select('*, staff_categories(*)')
        .order('created_at', { ascending: false });
      if (postData) setPosts(postData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.title.trim() || !newPost.category_id) return;
    setSaving(true);

    try {
      const { error } = await supabase.from('posts').insert({
        title: newPost.title.trim(),
        category_id: newPost.category_id,
        program_stream: newPost.program_stream || 'All Programs / General',
        qualification_requirement: newPost.qualification_requirement.trim(),
        is_active: true,
      });

      if (error) throw error;

      setNewPost({ title: '', category_id: '', program_stream: 'All Programs / General', qualification_requirement: '' });
      setShowAddModal(false);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Error saving designation');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCategoryFees = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingFees(true);
    try {
      for (const cat of editableCategories) {
        await supabase
          .from('staff_categories')
          .update({ application_fee: cat.application_fee })
          .eq('id', cat.id);
      }
      setShowFeeModal(false);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Error updating category fees');
    } finally {
      setSavingFees(false);
    }
  };

  const togglePostActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('posts')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Error updating status');
    }
  };

  const filteredPosts = selectedFilterCategory === 'all'
    ? posts
    : posts.filter((p) => p.category_id === selectedFilterCategory);

  return (
    <RoleGuard
      allowedRoles={['admin_head_hr', 'institute_head']}
      title="Access Restricted"
      description="Only Head Central HR Administrators and Institute Heads have permission to view and manage job designations."
    >
      <div className="min-h-screen bg-slate-100 text-slate-900 pb-12 font-sans">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href={role === 'institute_head' ? '/institute-portal' : '/'}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-sky-700" /> Job Designations & Roles
              </h1>
              <p className="text-[11px] text-slate-500">
                {role === 'institute_head' ? 'Institute Head • Map & Add Academic or Support Designations' : 'Head Central HR • Manage Recruitment Designations, Categories & Application Fees'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {role === 'admin_head_hr' && (
              <button
                onClick={() => {
                  setEditableCategories(categories);
                  setShowFeeModal(true);
                }}
                className="px-3.5 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5"
              >
                <Settings2 className="w-4 h-4 text-slate-600" /> Category Fees
              </button>
            )}
            {role === 'institute_head' ? (
              <Link
                href="/institute-portal"
                className="px-3.5 py-2 border border-purple-300 bg-purple-50 text-purple-800 hover:bg-purple-100 rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5"
              >
                Institute Portal
              </Link>
            ) : (
              <Link
                href="/admin/institutes"
                className="px-3.5 py-2 border border-sky-300 bg-sky-50 text-sky-800 hover:bg-sky-100 rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5"
              >
                Institutes Master
              </Link>
            )}
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-sky-700 hover:bg-sky-800 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5 transition"
            >
              <Plus className="w-4 h-4" /> Add Designation
            </button>
            <Link
              href="/receptionist"
              className="px-3.5 py-2 border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition shadow-sm"
            >
              Front Desk
            </Link>
          </div>
        </div>
      </header>

      {/* Main Area */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-8">
        {/* Category Filter Pills & Fees */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedFilterCategory('all')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                selectedFilterCategory === 'all'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              All Designations ({posts.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedFilterCategory(cat.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                  selectedFilterCategory === cat.id
                    ? 'bg-sky-700 text-white shadow-sm'
                    : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                {cat.name} (Fee: ₹{cat.application_fee})
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              setEditableCategories(categories);
              setShowFeeModal(true);
            }}
            className="text-xs font-bold text-sky-800 hover:underline flex items-center gap-1"
          >
            <Edit3 className="w-3.5 h-3.5" /> Change Fee Rules
          </button>
        </div>

        {/* Designations Table */}
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-16 text-center text-slate-500 text-sm">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-sky-700 border-t-transparent mx-auto mb-3"></div>
              Loading designation records...
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="p-16 text-center text-slate-500 text-sm">
              No designations found. Click <strong>"Add Designation"</strong> above to create one.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold tracking-wider">
                  <th className="py-4 px-6">Job Designation / Role Title</th>
                  <th className="py-4 px-6">Staff Category</th>
                  <th className="py-4 px-6">Application Fee</th>
                  <th className="py-4 px-6">Required Qualifications / Notes</th>
                  <th className="py-4 px-6 text-center">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPosts.map((post) => (
                  <tr key={post.id} className="hover:bg-slate-50 transition">
                    <td className="py-4 px-6">
                      <span className="font-bold text-slate-900 text-sm block">
                        {post.title}
                      </span>
                      {post.program_stream && post.program_stream !== 'All Programs / General' && (
                        <span className="inline-block mt-1 px-2 py-0.5 bg-purple-50 text-purple-700 font-semibold rounded text-[10px] border border-purple-100">
                          {post.program_stream}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span className="px-3 py-1 bg-slate-100 text-slate-800 font-bold rounded-lg border border-slate-200 text-[11px]">
                        {post.staff_categories?.name || 'Unassigned'}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-black text-emerald-700 text-sm">
                      ₹ {post.staff_categories?.application_fee ?? 0}
                    </td>
                    <td className="py-4 px-6 text-slate-600 max-w-xs truncate">
                      {post.qualification_requirement || '—'}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold ${
                          post.is_active
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}
                      >
                        {post.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => togglePostActive(post.id, post.is_active)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                          post.is_active
                            ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                        }`}
                      >
                        {post.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* 1. Add New Designation Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
              <h3 className="font-bold text-slate-900 text-base">Add New Job Designation</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  * Job Designation / Role Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Assistant Professor - Physics"
                  value={newPost.title}
                  onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  * Staff Category (Decides Application Fee)
                </label>
                <select
                  required
                  value={newPost.category_id}
                  onChange={(e) => setNewPost({ ...newPost, category_id: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="">Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} (Application Fee: ₹{cat.application_fee})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Academic Discipline / Program Stream
                </label>
                <select
                  value={newPost.program_stream}
                  onChange={(e) => setNewPost({ ...newPost, program_stream: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  {programStreamOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Required Qualification / Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Ph.D. / M.Tech in relevant branch"
                  value={newPost.qualification_requirement}
                  onChange={(e) => setNewPost({ ...newPost, qualification_requirement: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-sky-700 hover:bg-sky-800 text-white rounded-xl text-xs font-bold shadow disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Designation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Manage Staff Category Fees Modal */}
      {showFeeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-sky-700" />
                <h3 className="font-bold text-slate-900 text-base">Manage Category Application Fees</h3>
              </div>
              <button
                onClick={() => setShowFeeModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              Set the standard application form fee for each recruitment category under the Trust.
            </p>

            <form onSubmit={handleSaveCategoryFees} className="space-y-4">
              {editableCategories.map((cat, idx) => (
                <div key={cat.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-4">
                  <div>
                    <span className="font-bold text-slate-900 text-xs block">{cat.name}</span>
                    <span className="text-[10px] text-slate-500 block">{cat.description || 'Recruitment Category'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-slate-600">₹</span>
                    <input
                      type="number"
                      min="0"
                      required
                      value={cat.application_fee}
                      onChange={(e) => {
                        const updated = [...editableCategories];
                        updated[idx].application_fee = parseFloat(e.target.value) || 0;
                        setEditableCategories(updated);
                      }}
                      className="w-20 px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-right bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    />
                  </div>
                </div>
              ))}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowFeeModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingFees}
                  className="px-5 py-2 bg-sky-700 hover:bg-sky-800 text-white rounded-xl text-xs font-bold shadow disabled:opacity-50"
                >
                  {savingFees ? 'Saving...' : 'Save Category Fees'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </RoleGuard>
  );
}
