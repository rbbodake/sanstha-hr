'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { OrganizationSettings, StaffCategory, PaymentMode } from '@/types/database';
import { TrustLetterhead } from '@/components/TrustLetterhead';
import { RoleGuard } from '@/components/RoleGuard';
import { matchesApplicationNumberSearch } from '@/lib/applicationNumberService';
import {
  ArrowLeft,
  Printer,
  Download,
  Search,
  Filter,
  RefreshCw,
  IndianRupee,
  CheckCircle2,
  XCircle,
  Calendar,
  CreditCard,
  Building2,
  FileSpreadsheet,
  AlertTriangle
} from 'lucide-react';

interface FeeReceiptRow {
  id: string;
  receipt_no: string;
  application_id: string;
  amount: number;
  amount_in_words?: string;
  payment_mode?: string;
  reference_no?: string;
  issued_at: string;
  is_cancelled: boolean;
  cancelled_at?: string;
  cancellation_reason?: string;
  applications?: {
    id: string;
    application_no: string;
    candidate_name: string;
    contact_no: string;
    email_id?: string;
    program_stream?: string;
    course_name?: string;
    specialization?: string;
    custom_post_title?: string;
    category_id?: string;
    post_id?: string;
    staff_categories?: {
      name: string;
    };
    posts?: {
      title: string;
    };
    institutes?: {
      name: string;
      official_name: string;
    };
  };
}

export default function FeeRegisterPage() {
  const [receipts, setReceipts] = useState<FeeReceiptRow[]>([]);
  const [org, setOrg] = useState<OrganizationSettings | null>(null);
  const [categories, setCategories] = useState<StaffCategory[]>([]);
  const [paymentModes, setPaymentModes] = useState<PaymentMode[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedMode, setSelectedMode] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'valid' | 'cancelled'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch all receipts and master settings
  const fetchFeeRegisterData = async () => {
    setLoading(true);
    try {
      // 1. Organization settings
      const { data: orgData } = await supabase
        .from('organization_settings')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();
      if (orgData) setOrg(orgData);

      // 2. Staff categories
      const { data: catData } = await supabase.from('staff_categories').select('*').eq('is_active', true);
      if (catData) setCategories(catData);

      // 3. Payment modes
      const { data: modeData } = await supabase.from('payment_modes').select('*').eq('is_active', true);
      if (modeData) setPaymentModes(modeData);

      // 4. All Fee Receipts with Application & Category joins
      const { data: receiptData, error: recError } = await supabase
        .from('fee_receipts')
        .select(`
          *,
          applications (
            id,
            application_no,
            candidate_name,
            contact_no,
            email_id,
            program_stream,
            course_name,
            specialization,
            custom_post_title,
            category_id,
            post_id,
            staff_categories ( name ),
            posts ( title ),
            institutes ( name, official_name )
          )
        `)
        .order('issued_at', { ascending: false });

      if (recError) {
        console.error('Error fetching fee receipts:', recError);
      } else if (receiptData) {
        setReceipts(receiptData as unknown as FeeReceiptRow[]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeeRegisterData();
  }, []);

  // Handle Date Preset Changes
  const handlePresetChange = (preset: 'all' | 'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom') => {
    setDatePreset(preset);
    const today = new Date();
    const toDateStr = (d: Date) => d.toISOString().split('T')[0];

    if (preset === 'today') {
      const todayStr = toDateStr(today);
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'yesterday') {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yestStr = toDateStr(yesterday);
      setStartDate(yestStr);
      setEndDate(yestStr);
    } else if (preset === 'this_week') {
      const weekStart = new Date(today);
      const day = weekStart.getDay() || 7; // Sunday is 7
      weekStart.setDate(weekStart.getDate() - day + 1); // Monday
      setStartDate(toDateStr(weekStart));
      setEndDate(toDateStr(today));
    } else if (preset === 'this_month') {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(toDateStr(monthStart));
      setEndDate(toDateStr(today));
    } else if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    }
  };

  // Filtered Receipts Calculation
  const filteredReceipts = useMemo(() => {
    return receipts.filter((row) => {
      // 1. Date Filter
      if (startDate || endDate) {
        const rowDate = row.issued_at ? row.issued_at.split('T')[0] : '';
        if (startDate && rowDate < startDate) return false;
        if (endDate && rowDate > endDate) return false;
      }

      // 2. Status Filter
      if (statusFilter === 'valid' && row.is_cancelled) return false;
      if (statusFilter === 'cancelled' && !row.is_cancelled) return false;

      // 3. Payment Mode Filter
      if (selectedMode !== 'all') {
        const rowMode = (row.payment_mode || 'Cash').toLowerCase();
        if (rowMode !== selectedMode.toLowerCase()) return false;
      }

      // 4. Staff Category Filter
      if (selectedCategory !== 'all') {
        const catName = row.applications?.staff_categories?.name || '';
        if (catName.toLowerCase() !== selectedCategory.toLowerCase()) return false;
      }

      // 5. Search Term (Receipt No, App No, Candidate Name, Ref No, Contact)
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const receiptNo = (row.receipt_no || '').toLowerCase();
        const appNo = (row.applications?.application_no || '').toLowerCase();
        const candName = (row.applications?.candidate_name || '').toLowerCase();
        const refNo = (row.reference_no || '').toLowerCase();
        const contact = (row.applications?.contact_no || '').toLowerCase();

        const match =
          receiptNo.includes(q) ||
          matchesApplicationNumberSearch(row.applications?.application_no, q) ||
          appNo.includes(q) ||
          candName.includes(q) ||
          refNo.includes(q) ||
          contact.includes(q);

        if (!match) return false;
      }

      return true;
    });
  }, [receipts, startDate, endDate, statusFilter, selectedMode, selectedCategory, searchTerm]);

  // Tally & Financial Summary Calculations
  const metrics = useMemo(() => {
    let totalValidAmount = 0;
    let validCount = 0;
    let cashAmount = 0;
    let cashCount = 0;
    let digitalAmount = 0;
    let digitalCount = 0;
    let cancelledAmount = 0;
    let cancelledCount = 0;

    filteredReceipts.forEach((row) => {
      const amt = Number(row.amount) || 0;
      if (row.is_cancelled) {
        cancelledAmount += amt;
        cancelledCount += 1;
      } else {
        totalValidAmount += amt;
        validCount += 1;
        const mode = (row.payment_mode || 'Cash').toLowerCase();
        if (mode === 'cash') {
          cashAmount += amt;
          cashCount += 1;
        } else {
          digitalAmount += amt;
          digitalCount += 1;
        }
      }
    });

    return {
      totalValidAmount,
      validCount,
      cashAmount,
      cashCount,
      digitalAmount,
      digitalCount,
      cancelledAmount,
      cancelledCount,
      totalEntries: filteredReceipts.length,
    };
  }, [filteredReceipts]);

  // Track candidates who have multiple receipts/applications by mobile number
  const candidateReceiptCounts = useMemo(() => {
    const counts = new Map<string, number>();
    receipts.forEach((r) => {
      const p = r.applications?.contact_no?.replace(/\D/g, '').slice(-10);
      if (p && p.length === 10) {
        counts.set(p, (counts.get(p) || 0) + 1);
      }
    });
    return counts;
  }, [receipts]);

  // Export to Excel / CSV with UTF-8 BOM
  const handleExportCSV = () => {
    if (filteredReceipts.length === 0) {
      alert('No fee receipt records found to export for the selected filter.');
      return;
    }

    const headers = [
      'Sr. No.',
      'Receipt Number',
      'Receipt Date',
      'Receipt Time',
      'Application Number',
      'Candidate Name',
      'Contact Number',
      'Staff Category',
      'Post Applied',
      'Discipline / Stream',
      'Payment Mode',
      'Transaction / Ref No.',
      'Fee Amount (INR)',
      'Receipt Status',
      'Cancellation Reason',
    ];

    const rows = filteredReceipts.map((row, idx) => {
      const issuedDate = row.issued_at ? new Date(row.issued_at) : null;
      const dateStr = issuedDate ? issuedDate.toLocaleDateString('en-GB') : '—';
      const timeStr = issuedDate ? issuedDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—';
      const postName = row.applications?.posts?.title || row.applications?.custom_post_title || 'General';
      const catName = row.applications?.staff_categories?.name || 'General';

      return [
        (idx + 1).toString(),
        `"${row.receipt_no}"`,
        `"${dateStr}"`,
        `"${timeStr}"`,
        `"${row.applications?.application_no || '—'}"`,
        `"${(row.applications?.candidate_name || '—').replace(/"/g, '""')}"`,
        `"${row.applications?.contact_no || '—'}"`,
        `"${catName}"`,
        `"${postName.replace(/"/g, '""')}"`,
        `"${(row.applications?.program_stream || '—').replace(/"/g, '""')}"`,
        `"${row.payment_mode || 'Cash'}"`,
        `"${(row.reference_no || '—').replace(/"/g, '""')}"`,
        (Number(row.amount) || 0).toFixed(2),
        `"${row.is_cancelled ? 'CANCELLED' : 'VALID / ACTIVE'}"`,
        `"${(row.cancellation_reason || '').replace(/"/g, '""')}"`,
      ];
    });

    // Add Summary Tally Rows at bottom
    rows.push([]);
    rows.push(['', '', '', '', '', '', '', '', '', '', 'VALID RECEIPTS TOTAL (INR)', '', metrics.totalValidAmount.toFixed(2), `${metrics.validCount} Receipts`, '']);
    rows.push(['', '', '', '', '', '', '', '', '', '', 'CASH COLLECTION TOTAL (INR)', '', metrics.cashAmount.toFixed(2), `${metrics.cashCount} Receipts`, '']);
    rows.push(['', '', '', '', '', '', '', '', '', '', 'ONLINE / DIGITAL TOTAL (INR)', '', metrics.digitalAmount.toFixed(2), `${metrics.digitalCount} Receipts`, '']);
    if (metrics.cancelledCount > 0) {
      rows.push(['', '', '', '', '', '', '', '', '', '', 'CANCELLED RECEIPTS TOTAL (INR)', '', metrics.cancelledAmount.toFixed(2), `${metrics.cancelledCount} Receipts`, '']);
    }

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().split('T')[0];
    link.href = url;
    link.setAttribute('download', `SmartHR_Fee_Register_${timestamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Helper formatting
  const formatDateLabel = () => {
    if (startDate && endDate) {
      if (startDate === endDate) return `Date: ${new Date(startDate).toLocaleDateString('en-GB')}`;
      return `Period: ${new Date(startDate).toLocaleDateString('en-GB')} to ${new Date(endDate).toLocaleDateString('en-GB')}`;
    }
    if (startDate) return `From: ${new Date(startDate).toLocaleDateString('en-GB')}`;
    if (endDate) return `Up to: ${new Date(endDate).toLocaleDateString('en-GB')}`;
    return 'All Records (Cumulative)';
  };

  return (
    <RoleGuard
      allowedRoles={['admin_head_hr', 'receptionist']}
      title="Front Desk / Admin Access Required"
      description="Only Central HR Front Desk and Head Central HR Administrators have permission to access the Fee Collection Register and print audit logs."
    >
      <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 8mm;
          }
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .print-container {
            display: block !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
          }
        }
      `}</style>

      {/* Screen-Only Header Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/receptionist"
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"
              title="Back to Front Desk Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <IndianRupee className="w-5 h-5 text-emerald-700" />
                <h1 className="text-base sm:text-lg font-bold text-slate-900">
                  Recruitment Fee Register & Tally Audit
                </h1>
                <span className="text-[11px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                  Accounts Portal
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Official collection accountability, payment filter, tally particulars & audit report
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchFeeRegisterData}
              className="p-2 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-100 transition"
              title="Refresh Register"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5 transition"
            >
              <FileSpreadsheet className="w-4 h-4" /> Export Excel / CSV
            </button>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-sky-800 hover:bg-sky-900 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5 transition"
            >
              <Printer className="w-4 h-4" /> Print Register (A4)
            </button>
          </div>
        </div>
      </header>

      {/* Main Interactive Screen Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6 no-print">
        
        {/* 1. Tally & Financial Reconciliation KPI Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-white shadow-sm">
            <div className="flex items-center justify-between text-emerald-800 text-xs font-bold">
              <span>Total Valid Collection</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-950 mt-1.5">
              ₹{metrics.totalValidAmount.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-emerald-700 mt-1 font-medium">
              {metrics.validCount} Valid Fee Receipts
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50/50 to-white shadow-sm">
            <div className="flex items-center justify-between text-sky-800 text-xs font-bold">
              <span>Cash Collection (Counter)</span>
              <IndianRupee className="w-4 h-4 text-sky-600" />
            </div>
            <div className="text-2xl font-black text-sky-950 mt-1.5">
              ₹{metrics.cashAmount.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-sky-700 mt-1 font-medium">
              {metrics.cashCount} Cash Receipts
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/50 to-white shadow-sm">
            <div className="flex items-center justify-between text-indigo-800 text-xs font-bold">
              <span>UPI / Online / Bank</span>
              <CreditCard className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-black text-indigo-950 mt-1.5">
              ₹{metrics.digitalAmount.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-indigo-700 mt-1 font-medium">
              {metrics.digitalCount} Digital Receipts
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50/50 to-white shadow-sm">
            <div className="flex items-center justify-between text-rose-800 text-xs font-bold">
              <span>Cancelled Receipts</span>
              <XCircle className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-2xl font-black text-rose-950 mt-1.5">
              ₹{metrics.cancelledAmount.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-rose-700 mt-1 font-medium">
              {metrics.cancelledCount} Cancelled (Audit Preserved)
            </div>
          </div>
        </div>

        {/* 2. Comprehensive Filter Controls */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-600" />
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-800">
                Filter & Audit Criteria
              </h2>
            </div>
            {(startDate || endDate || selectedMode !== 'all' || selectedCategory !== 'all' || statusFilter !== 'all' || searchTerm) && (
              <button
                onClick={() => {
                  setDatePreset('all');
                  setStartDate('');
                  setEndDate('');
                  setSelectedMode('all');
                  setSelectedCategory('all');
                  setStatusFilter('all');
                  setSearchTerm('');
                }}
                className="text-xs text-sky-700 hover:text-sky-900 font-bold"
              >
                Reset All Filters
              </button>
            )}
          </div>

          {/* Date Range Presets */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Date Period Preset
            </label>
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'all', label: 'All Dates' },
                { id: 'today', label: 'Today' },
                { id: 'yesterday', label: 'Yesterday' },
                { id: 'this_week', label: 'This Week' },
                { id: 'this_month', label: 'This Month' },
                { id: 'custom', label: 'Custom Range' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => handlePresetChange(p.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    datePreset === p.id
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date Picker Range + Filters Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
            {/* Start Date */}
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                From Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setDatePreset('custom');
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                To Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setDatePreset('custom');
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {/* Payment Mode Filter */}
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                Payment Mode
              </label>
              <select
                value={selectedMode}
                onChange={(e) => setSelectedMode(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="all">All Payment Modes</option>
                <option value="Cash">Cash</option>
                <option value="UPI / QR Code">UPI / QR Code</option>
                <option value="Net Banking">Net Banking</option>
                <option value="Debit/Credit Card">Debit/Credit Card</option>
                <option value="Demand Draft / Cheque">Demand Draft / Cheque</option>
                {paymentModes.map((m) => (
                  <option key={m.id} value={m.name}>{m.name}</option>
                ))}
              </select>
            </div>

            {/* Staff Category Filter */}
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                Staff Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                Receipt Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="all">All Statuses (Active & Cancelled)</option>
                <option value="valid">Active / Valid Receipts Only</option>
                <option value="cancelled">Cancelled Receipts Only</option>
              </select>
            </div>
          </div>

          {/* Quick Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by Receipt No, Application No, Candidate Name, Contact, or Payment Reference..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
            />
          </div>
        </div>

        {/* 3. Tabular Fee Register on Screen */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                Fee Collection Entries ({filteredReceipts.length} Records)
              </h3>
              <p className="text-[11px] text-slate-500">
                {formatDateLabel()} • Total Net: ₹{metrics.totalValidAmount.toLocaleString('en-IN')}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-sky-600" />
              Loading fee register entries...
            </div>
          ) : filteredReceipts.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              No fee receipts found matching the selected filter criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <th className="py-3 px-3 w-10 text-center">#</th>
                    <th className="py-3 px-3">Receipt No & Date</th>
                    <th className="py-3 px-3">App No</th>
                    <th className="py-3 px-3">Candidate Name</th>
                    <th className="py-3 px-3">Category & Post</th>
                    <th className="py-3 px-3">Payment Mode & Ref</th>
                    <th className="py-3 px-3 text-right">Fee Amount</th>
                    <th className="py-3 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredReceipts.map((row, idx) => {
                    const issuedDate = row.issued_at ? new Date(row.issued_at) : null;
                    const dateStr = issuedDate ? issuedDate.toLocaleDateString('en-GB') : '—';
                    const timeStr = issuedDate ? issuedDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '';

                    return (
                      <tr key={row.id} className={`hover:bg-slate-50/80 ${row.is_cancelled ? 'bg-rose-50/40 text-slate-500' : ''}`}>
                        <td className="py-2.5 px-3 text-center text-slate-400 text-[11px]">{idx + 1}</td>
                        <td className="py-2.5 px-3">
                          <strong className="font-mono text-slate-900 text-xs block">{row.receipt_no}</strong>
                          <span className="text-[10px] text-slate-500">{dateStr} {timeStr}</span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-mono font-semibold text-slate-800 text-xs">
                            {row.applications?.application_no || '—'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          {(() => {
                            const p = row.applications?.contact_no?.replace(/\D/g, '').slice(-10);
                            const isMulti = p && (candidateReceiptCounts.get(p) || 0) > 1;
                            return (
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <strong className="text-slate-900 block">{row.applications?.candidate_name || '—'}</strong>
                                  {isMulti && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                      <AlertTriangle className="w-2.5 h-2.5 text-amber-700" /> Multi-App
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-500">{row.applications?.contact_no || ''}</span>
                              </div>
                            );
                          })()}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="text-slate-800 font-semibold block text-xs">
                            {row.applications?.posts?.title || row.applications?.custom_post_title || 'General'}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {row.applications?.staff_categories?.name || 'General'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-semibold text-slate-800 text-xs block">
                            {row.payment_mode || 'Cash'}
                          </span>
                          {row.reference_no && (
                            <span className="text-[10px] font-mono text-sky-700 block">
                              Ref: {row.reference_no}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <strong className={`font-mono text-xs ${row.is_cancelled ? 'line-through text-rose-600' : 'text-slate-900'}`}>
                            ₹{(Number(row.amount) || 0).toFixed(2)}
                          </strong>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {row.is_cancelled ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200" title={row.cancellation_reason || 'Cancelled'}>
                              Cancelled
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Valid
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {/* Table Footer Totals */}
                <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900">
                  <tr>
                    <td colSpan={6} className="py-3 px-4 text-right uppercase tracking-wider text-xs">
                      Grand Total Collection (Valid Receipts):
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-sm text-emerald-800">
                      ₹{metrics.totalValidAmount.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-center text-xs text-slate-600">
                      {metrics.validCount} Active
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* ================= OFFICIAL A4 LANDSCAPE PRINTABLE AUDIT STATEMENT ================= */}
      <div className="hidden print-container font-sans text-xs bg-white text-black p-4 space-y-3">
        {/* 1. Official Trust Letterhead with Badge */}
        <TrustLetterhead
          org={org}
          variant="print"
          titleBadge="OFFICIAL RECRUITMENT APPLICATION FEE REGISTER & TALLY STATEMENT"
        />

        {/* 2. Audit Filter Metadata Subheader */}
        <div className="border border-black p-2 bg-slate-50 text-[10.5px] grid grid-cols-4 gap-2">
          <div>
            <span className="font-bold block uppercase text-[9px] text-slate-700">Audit Period:</span>
            <strong>{formatDateLabel()}</strong>
          </div>
          <div>
            <span className="font-bold block uppercase text-[9px] text-slate-700">Generated On:</span>
            <span>{new Date().toLocaleString('en-GB')}</span>
          </div>
          <div>
            <span className="font-bold block uppercase text-[9px] text-slate-700">Filter Applied:</span>
            <span>Mode: {selectedMode}, Cat: {selectedCategory}</span>
          </div>
          <div>
            <span className="font-bold block uppercase text-[9px] text-slate-700">Total Valid Receipts:</span>
            <strong className="text-emerald-900 font-mono">{metrics.validCount} (₹{metrics.totalValidAmount.toFixed(2)})</strong>
          </div>
        </div>

        {/* 3. Register Table */}
        <table className="w-full border-collapse border border-black text-[10px]">
          <thead>
            <tr className="bg-slate-200 border-b border-black font-bold">
              <th className="border border-black p-1 text-center w-8">Sr.</th>
              <th className="border border-black p-1 text-left w-24">Receipt No.</th>
              <th className="border border-black p-1 text-left w-20">Date</th>
              <th className="border border-black p-1 text-left w-24">App No.</th>
              <th className="border border-black p-1 text-left">Candidate Name</th>
              <th className="border border-black p-1 text-left">Staff Category & Post</th>
              <th className="border border-black p-1 text-left w-28">Payment Mode & Ref</th>
              <th className="border border-black p-1 text-right w-20">Amount (₹)</th>
              <th className="border border-black p-1 text-center w-16">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredReceipts.map((row, idx) => {
              const issuedDate = row.issued_at ? new Date(row.issued_at) : null;
              const dateStr = issuedDate ? issuedDate.toLocaleDateString('en-GB') : '—';
              const postName = row.applications?.posts?.title || row.applications?.custom_post_title || 'General';
              const catName = row.applications?.staff_categories?.name || 'General';

              return (
                <tr key={row.id} className={`border-b border-slate-300 ${row.is_cancelled ? 'bg-slate-100 text-slate-500' : ''}`}>
                  <td className="border border-black p-1 text-center font-mono">{idx + 1}</td>
                  <td className="border border-black p-1 font-mono font-bold">{row.receipt_no}</td>
                  <td className="border border-black p-1">{dateStr}</td>
                  <td className="border border-black p-1 font-mono">{row.applications?.application_no || '—'}</td>
                  <td className="border border-black p-1">
                    <span className="font-bold uppercase block">{row.applications?.candidate_name || '—'}</span>
                    {(() => {
                      const p = row.applications?.contact_no?.replace(/\D/g, '').slice(-10);
                      if (p && (candidateReceiptCounts.get(p) || 0) > 1) {
                        return <span className="text-[8px] font-bold text-amber-900 block font-sans">[Multi-App]</span>;
                      }
                      return null;
                    })()}
                  </td>
                  <td className="border border-black p-1">
                    {catName} - {postName}
                  </td>
                  <td className="border border-black p-1">
                    {row.payment_mode || 'Cash'}
                    {row.reference_no && <span className="block text-[8.5px] font-mono">Ref: {row.reference_no}</span>}
                  </td>
                  <td className="border border-black p-1 text-right font-mono font-bold">
                    {row.is_cancelled ? `[CANCELLED ₹${(Number(row.amount) || 0).toFixed(2)}]` : (Number(row.amount) || 0).toFixed(2)}
                  </td>
                  <td className="border border-black p-1 text-center font-bold text-[9px]">
                    {row.is_cancelled ? 'CANCELLED' : 'VALID'}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-200 font-bold border-t-2 border-black">
              <td colSpan={7} className="border border-black p-1.5 text-right uppercase text-[10.5px]">
                Grand Total Net Realized Amount:
              </td>
              <td className="border border-black p-1.5 text-right font-mono text-xs">
                ₹{metrics.totalValidAmount.toFixed(2)}
              </td>
              <td className="border border-black p-1.5 text-center font-mono text-[9px]">
                {metrics.validCount} Nos
              </td>
            </tr>
          </tfoot>
        </table>

        {/* 4. Tally Reconciliation Summary Breakdown Box */}
        <div className="border border-black p-2 bg-slate-50 text-[10.5px] grid grid-cols-4 gap-3">
          <div className="border-r border-slate-300 pr-2">
            <span className="block text-[9.5px] uppercase font-bold text-slate-700">Cash Collection:</span>
            <strong className="font-mono text-xs">₹{metrics.cashAmount.toFixed(2)}</strong> ({metrics.cashCount} Receipts)
          </div>
          <div className="border-r border-slate-300 pr-2">
            <span className="block text-[9.5px] uppercase font-bold text-slate-700">UPI / Digital Collection:</span>
            <strong className="font-mono text-xs">₹{metrics.digitalAmount.toFixed(2)}</strong> ({metrics.digitalCount} Receipts)
          </div>
          <div className="border-r border-slate-300 pr-2">
            <span className="block text-[9.5px] uppercase font-bold text-slate-700">Cancelled Collection:</span>
            <strong className="font-mono text-xs text-rose-800">₹{metrics.cancelledAmount.toFixed(2)}</strong> ({metrics.cancelledCount} Receipts)
          </div>
          <div>
            <span className="block text-[9.5px] uppercase font-bold text-slate-700">Net Deposited into Trust Account:</span>
            <strong className="font-mono text-xs text-emerald-900">₹{metrics.totalValidAmount.toFixed(2)}</strong>
          </div>
        </div>

        {/* 5. 3 Official Signatures Block for Audit */}
        <div className="pt-8 grid grid-cols-3 gap-8 text-center text-[10.5px]">
          <div>
            <div className="border-b border-black pb-8"></div>
            <strong className="block mt-1 uppercase text-slate-900">Cashier / Front Desk</strong>
            <span className="text-[9px] text-slate-600 block">Verified & Handed Over</span>
          </div>

          <div>
            <div className="border-b border-black pb-8"></div>
            <strong className="block mt-1 uppercase text-slate-900">Central Accountant / Tally Auditor</strong>
            <span className="text-[9px] text-slate-600 block">Verified in Accounts & Tally</span>
          </div>

          <div>
            <div className="border-b border-black pb-8"></div>
            <strong className="block mt-1 uppercase text-slate-900">Head Central HR / Trust Secretary</strong>
            <span className="text-[9px] text-slate-600 block">Sanstha HR Directorate</span>
          </div>
        </div>
      </div>
    </div>
    </RoleGuard>
  );
}
