import React from 'react';
import { OrganizationSettings } from '@/types/database';
import { Building2 } from 'lucide-react';

interface TrustLetterheadProps {
  org?: OrganizationSettings | null;
  variant?: 'standard' | 'compact' | 'receipt' | 'print';
  titleBadge?: string;
  copyBadge?: 'OFFICE COPY' | 'CANDIDATE COPY';
  className?: string;
}

export const TrustLetterhead: React.FC<TrustLetterheadProps> = ({
  org,
  variant = 'standard',
  titleBadge,
  copyBadge,
  className = '',
}) => {
  const orgName = org?.name || 'Sanstha / Educational Trust';
  const orgAddress = org?.address || '';
  const orgRegNo = org?.registration_no || '';
  const orgTagline = org?.tagline || '';
  const logoUrl = org?.logo_url;

  // 1. COMPACT VARIANT (for Navbar / Top Headers)
  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={orgName}
            className="w-10 h-10 object-contain rounded-lg flex-shrink-0 bg-white"
          />
        ) : (
          <div className="w-10 h-10 rounded-xl bg-sky-700 flex items-center justify-center text-white font-black text-lg flex-shrink-0 shadow-sm">
            {orgName.charAt(0) || 'S'}
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-sm font-black text-slate-900 tracking-tight uppercase truncate">
            {orgName}
          </h1>
          <p className="text-[11px] text-slate-500 font-medium truncate">
            {orgTagline || 'Central HR Department • Recruitment Portal'}
          </p>
        </div>
      </div>
    );
  }

  // 2. RECEIPT VARIANT (for A4 Landscape Fee Receipts - Left Office & Right Candidate copies)
  if (variant === 'receipt') {
    return (
      <div className={`space-y-2.5 ${className}`}>
        <div className="flex items-start justify-between border-b border-slate-300 pb-2.5 gap-2">
          <div className="flex items-start gap-3 flex-1">
            {logoUrl && (
              <img
                src={logoUrl}
                alt={orgName}
                className="h-11 w-11 sm:h-12 sm:w-12 object-contain rounded flex-shrink-0"
              />
            )}
            <div className="text-left flex-1 space-y-0.5">
              <h2 className="font-bold text-xs sm:text-sm uppercase leading-tight text-slate-900 tracking-tight">
                {orgName}
              </h2>
              {orgAddress && (
                <p className="text-[10px] text-slate-700 leading-tight">
                  {orgAddress}
                </p>
              )}
              {orgRegNo && (
                <p className="text-[9.5px] text-slate-500 font-mono">
                  {orgRegNo}
                </p>
              )}
            </div>
          </div>
          {copyBadge && (
            <span className="px-2.5 py-1 border border-slate-400 font-bold uppercase text-[10px] tracking-wider whitespace-nowrap bg-slate-50 text-slate-800 print:bg-transparent flex-shrink-0">
              {copyBadge}
            </span>
          )}
        </div>

        {titleBadge && (
          <div className="text-center bg-slate-50 py-1 border border-slate-300 rounded print:bg-transparent">
            <span className="text-[10.5px] sm:text-[11px] font-bold text-slate-900 uppercase tracking-wider block">
              {titleBadge}
            </span>
          </div>
        )}
      </div>
    );
  }

  // 3. PRINT VARIANT (for A4 Portrait Candidate Verification & Interview Sheets)
  if (variant === 'print') {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="flex items-center justify-between border-b border-slate-400 pb-2.5 gap-3">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={orgName}
              className="h-14 w-14 object-contain rounded flex-shrink-0 print:block"
            />
          ) : (
            <div className="w-12 h-12 rounded-lg border border-slate-400 flex items-center justify-center text-slate-800 font-black text-xl flex-shrink-0 print:border-slate-600">
              {orgName.charAt(0) || 'S'}
            </div>
          )}
          <div className="text-center flex-1 space-y-0.5">
            <h2 className="font-black text-sm sm:text-base uppercase leading-tight text-slate-950 tracking-tight">
              {orgName}
            </h2>
            {orgAddress && (
              <p className="text-[10.5px] text-slate-700 font-medium leading-tight">
                {orgAddress}
              </p>
            )}
            {orgRegNo && (
              <p className="text-[9.5px] text-slate-600 font-mono">
                {orgRegNo}
              </p>
            )}
          </div>
          {/* Symmetrical spacer / ID box to keep title centered */}
          <div className="w-14 text-right flex-shrink-0">
            <span className="text-[9px] font-mono uppercase text-slate-500 block">HR-FORM</span>
            <span className="text-[9px] font-bold text-slate-700 block">A4-PORTRAIT</span>
          </div>
        </div>

        {titleBadge && (
          <div className="text-center bg-slate-100 py-1 px-2 border border-slate-300 rounded print:bg-slate-50">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-900">
              {titleBadge}
            </span>
          </div>
        )}
      </div>
    );
  }

  // 4. STANDARD VARIANT (for Application Top Hero, QR Standee & Portal Banners)
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm ${className}`}>
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5 text-center sm:text-left">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={orgName}
            className="h-16 w-16 sm:h-20 sm:w-20 object-contain rounded-xl flex-shrink-0 bg-slate-50 border border-slate-200 p-1"
          />
        ) : (
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-sky-700 flex items-center justify-center text-white font-black text-3xl shadow flex-shrink-0">
            {orgName.charAt(0) || 'S'}
          </div>
        )}
        <div className="flex-1 space-y-1">
          <h1 className="text-lg sm:text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight leading-snug">
            {orgName}
          </h1>
          {orgTagline && (
            <p className="text-xs sm:text-sm font-semibold text-sky-800">
              {orgTagline}
            </p>
          )}
          {orgAddress && (
            <p className="text-xs text-slate-600 leading-relaxed">
              {orgAddress}
            </p>
          )}
          {orgRegNo && (
            <p className="text-[11px] text-slate-500 font-mono">
              {orgRegNo}
            </p>
          )}
        </div>
      </div>
      {titleBadge && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
            {titleBadge}
          </span>
          <span className="text-[11px] text-slate-500 font-medium">Official Recruitment Portal</span>
        </div>
      )}
    </div>
  );
};

export default TrustLetterhead;
