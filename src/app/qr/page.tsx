'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import { supabase } from '@/lib/supabase';
import { OrganizationSettings } from '@/types/database';
import { TrustLetterhead } from '@/components/TrustLetterhead';
import { Printer, ArrowLeft, Download, Sparkles } from 'lucide-react';

export default function OfficeQRCodePage() {
  const [org, setOrg] = useState<OrganizationSettings | null>(null);
  const [applyUrl, setApplyUrl] = useState<string>('http://localhost:3000/apply');

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.origin) {
      setApplyUrl(`${window.location.origin}/apply`);
    }

    async function loadOrg() {
      const { data } = await supabase
        .from('organization_settings')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();
      if (data) setOrg(data);
    }
    loadOrg();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const canvas = document.getElementById('qr-canvas-download') as HTMLCanvasElement;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `Candidate-Walkin-QR-${org?.name ? org.name.replace(/[^a-zA-Z0-9]/g, '_') : 'Sanstha'}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="min-h-screen bg-slate-100 py-10 px-4 print:p-0 print:bg-white flex flex-col items-center justify-center">
      {/* Top Bar for Desktop */}
      <div className="max-w-xl w-full mb-6 flex items-center justify-between no-print">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl shadow-sm hover:bg-slate-50 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Home Portal
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow transition"
            title="Download QR Code image as high-res PNG"
          >
            <Download className="w-4 h-4" /> Download PNG
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow transition"
          >
            <Printer className="w-4 h-4" /> Print Standee Poster
          </button>
        </div>
      </div>

      {/* Standee Board Card */}
      <div className="max-w-xl w-full bg-white border-2 border-slate-300 rounded-3xl p-8 sm:p-12 shadow-xl print:shadow-none print:border-4 print:border-black print:rounded-none text-center">
        {/* Top Header */}
        <div className="border-b-2 border-slate-900 pb-6 mb-6">
          <TrustLetterhead org={org} variant="print" />
        </div>

        {/* Central Title */}
        <div className="mb-6">
          <span className="bg-sky-900 text-white px-5 py-1.5 rounded-full text-xs font-black uppercase tracking-widest print:bg-black inline-block shadow-sm">
            Central HR Department
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-950 mt-4 tracking-tight">
            CANDIDATE SELF REGISTRATION
          </h1>
          <p className="text-xs text-slate-600 mt-1.5 font-medium">
            Scan using any smartphone camera or Google Lens to fill out the form
          </p>
        </div>

        {/* Crisp QR Code Board */}
        <div className="my-6 flex justify-center">
          <div className="p-5 bg-white border-4 border-slate-900 rounded-3xl shadow-md inline-block print:border-4 print:border-black min-w-[280px] min-h-[280px] flex items-center justify-center">
            <QRCodeSVG
              value={applyUrl || 'http://localhost:3000/apply'}
              size={240}
              level="H"
              includeMargin={true}
            />
            {/* Hidden canvas for PNG export */}
            <div className="hidden">
              <QRCodeCanvas
                id="qr-canvas-download"
                value={applyUrl || 'http://localhost:3000/apply'}
                size={800}
                level="H"
                includeMargin={true}
              />
            </div>
          </div>
        </div>

        {/* Step Guide for Candidates */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-left max-w-md mx-auto text-xs text-slate-800 space-y-2 print:bg-transparent print:border-slate-400">
          <p className="font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-sky-700" /> Walk-in Candidate Steps:
          </p>
          <p className="flex items-start gap-1.5">
            <span className="font-bold text-slate-900">1.</span> <strong>Scan QR:</strong> Open your smartphone camera and point at this QR.
          </p>
          <p className="flex items-start gap-1.5">
            <span className="font-bold text-slate-900">2.</span> <strong>Fill Form:</strong> Provide your details, Ph.D. / qualifications, and upload document scans.
          </p>
          <p className="flex items-start gap-1.5">
            <span className="font-bold text-slate-900">3.</span> <strong>Document Verification:</strong> Present your Application Number to the Front Desk Counter with your original marksheets and certificates.
          </p>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
          <span className="font-bold text-slate-800">SmartHR Recruitment Portal</span>
          <span className="text-[10px] text-slate-400 font-mono">{applyUrl || 'http://localhost:3000/apply'}</span>
        </div>
      </div>
    </div>
  );
}
