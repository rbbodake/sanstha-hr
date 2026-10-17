'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { TrustLetterhead } from '@/components/TrustLetterhead';
import {
  ArrowLeft,
  Upload,
  CheckCircle2,
  AlertCircle,
  FileText,
  Trash2,
  Loader2,
  ShieldCheck,
  FolderOpen,
  ImageIcon,
  File,
  Lock,
  ShieldAlert,
  Send,
  AlertTriangle,
} from 'lucide-react';
import {
  getCandidateSession,
  isApplicationLocked,
  CandidateSession,
} from '@/lib/candidateSession';

// â”€â”€â”€ Document Slot Definition â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
type DocSlot = {
  id: string;
  labelEn: string;
  labelMr: string;
  accept: string;
  bucket: string;
  prefix: string;
  required: boolean;
  hint?: string;
};

const DOC_SLOTS: DocSlot[] = [
  { id: 'photo', labelEn: 'Passport Photograph', labelMr: 'à¤ªà¤¾à¤¸à¤ªà¥‹à¤°à¥à¤Ÿ à¤«à¥‹à¤Ÿà¥‹', accept: 'image/*', bucket: 'candidate-photos', prefix: 'photo', required: false, hint: 'Clear recent passport-size photo (JPG/PNG)' },
  { id: 'aadhaar', labelEn: 'Aadhaar Card (Front & Back)', labelMr: 'à¤†à¤§à¤¾à¤° à¤•à¤¾à¤°à¥à¤¡ (à¤¸à¤®à¥‹à¤° à¤µ à¤®à¤¾à¤—à¥€à¤² à¤¬à¤¾à¤œà¥‚)', accept: 'image/*,.pdf', bucket: 'candidate-documents', prefix: 'aadhaar', required: false, hint: 'Scan or clear photo of both sides' },
  { id: 'pan', labelEn: 'PAN Card', labelMr: 'à¤ªà¥…à¤¨ à¤•à¤¾à¤°à¥à¤¡', accept: 'image/*,.pdf', bucket: 'candidate-documents', prefix: 'pan', required: false, hint: 'Scan or photo of PAN card' },
  { id: 'ssc', labelEn: 'SSC / 10th Marksheet', labelMr: 'à¥§à¥¦à¤µà¥€ à¤—à¥à¤£à¤ªà¤¤à¥à¤°à¤¿à¤•à¤¾', accept: 'image/*,.pdf', bucket: 'candidate-documents', prefix: 'ssc_marksheet', required: false, hint: 'Board certificate or mark statement' },
  { id: 'hsc', labelEn: 'HSC / 12th Marksheet', labelMr: 'à¥§à¥¨à¤µà¥€ à¤—à¥à¤£à¤ªà¤¤à¥à¤°à¤¿à¤•à¤¾', accept: 'image/*,.pdf', bucket: 'candidate-documents', prefix: 'hsc_marksheet', required: false },
  { id: 'diploma', labelEn: 'Diploma Mark Sheet / Passing Certificate', labelMr: 'पदविका गुणपत्रिका / प्रमाणपत्र', accept: 'image/*,.pdf', bucket: 'candidate-documents', prefix: 'diploma_certificate', required: false },
  { id: 'graduation', labelEn: 'Graduation Degree / Marksheet', labelMr: 'à¤ªà¤¦à¤µà¥€ à¤ªà¥à¤°à¤®à¤¾à¤£à¤ªà¤¤à¥à¤° / à¤—à¥à¤£à¤ªà¤¤à¥à¤°à¤¿à¤•à¤¾', accept: 'image/*,.pdf', bucket: 'candidate-documents', prefix: 'graduation', required: false, hint: 'B.E. / B.Tech / B.A. / B.Com / B.Sc. etc.' },
  { id: 'postgrad', labelEn: 'Post Graduation Marksheet / Degree', labelMr: 'à¤ªà¤¦à¤µà¥à¤¯à¥à¤¤à¥à¤¤à¤° à¤—à¥à¤£à¤ªà¤¤à¥à¤°à¤¿à¤•à¤¾ / à¤ªà¤¦à¤µà¥€', accept: 'image/*,.pdf', bucket: 'candidate-documents', prefix: 'postgrad', required: false, hint: 'M.E. / M.Tech / M.A. / M.Com / M.Sc. etc.' },
  { id: 'phd', labelEn: 'Ph.D. Award Certificate', labelMr: 'à¤ªà¥€à¤à¤š.à¤¡à¥€. à¤ªà¥à¤°à¤®à¤¾à¤£à¤ªà¤¤à¥à¤°', accept: 'image/*,.pdf', bucket: 'candidate-documents', prefix: 'phd', required: false },
  { id: 'net_set', labelEn: 'NET / SET / GATE Certificate', labelMr: 'NET / SET / GATE à¤ªà¥à¤°à¤®à¤¾à¤£à¤ªà¤¤à¥à¤°', accept: 'image/*,.pdf', bucket: 'candidate-documents', prefix: 'net_set', required: false },
  { id: 'caste_cert', labelEn: 'Caste / Category Certificate', labelMr: 'à¤œà¤¾à¤¤ / à¤ªà¥à¤°à¤µà¤°à¥à¤— à¤ªà¥à¤°à¤®à¤¾à¤£à¤ªà¤¤à¥à¤°', accept: 'image/*,.pdf', bucket: 'candidate-documents', prefix: 'caste_cert', required: false, hint: 'SC / ST / OBC / NT / EWS certificate from competent authority' },
  { id: 'pwd_cert', labelEn: 'PwD / Disability Certificate', labelMr: 'à¤¦à¤¿à¤µà¥à¤¯à¤¾à¤‚à¤—à¤¤à¥à¤µ à¤ªà¥à¤°à¤®à¤¾à¤£à¤ªà¤¤à¥à¤°', accept: 'image/*,.pdf', bucket: 'candidate-documents', prefix: 'pwd_cert', required: false },
  { id: 'experience_cert', labelEn: 'Experience / Relieving Certificate', labelMr: 'à¤…à¤¨à¥à¤­à¤µ / à¤¸à¥‡à¤µà¤¾à¤®à¥à¤•à¥à¤¤à¥€ à¤ªà¥à¤°à¤®à¤¾à¤£à¤ªà¤¤à¥à¤°', accept: 'image/*,.pdf', bucket: 'candidate-documents', prefix: 'experience_cert', required: false, hint: 'From previous employer(s)' },
  { id: 'resume', labelEn: 'Resume / CV', labelMr: 'à¤¬à¤¾à¤¯à¥‹à¤¡à¤¾à¤Ÿà¤¾ / à¤°à¥‡à¤à¥à¤¯à¥à¤®à¥‡', accept: '.pdf,image/*', bucket: 'candidate-resumes', prefix: 'resume', required: false, hint: 'Detailed CV in PDF or clear image format (Max 5 MB)' },
];

const SLOT_COLUMN: Record<string, string> = {
  photo: 'photo_url',
  aadhaar: 'aadhaar_doc_url',
  pan: 'pan_doc_url',
  resume: 'resume_url',
  caste_cert: 'caste_cert_url',
};

const EDUCATION_SLOT_MATCH: Record<string, (level: string) => boolean> = {
  ssc: (level) => level.toLowerCase().includes('s.s.c') || level.toLowerCase().includes('below 10th'),
  hsc: (level) => level.toLowerCase().includes('h.s.c'),
  diploma: (level) => level.toLowerCase().includes('diploma'),
  graduation: (level) => level.includes('Graduation (UG)'),
  postgrad: (level) => level.includes('Post Graduation (PG)'),
  phd: (level) => level.includes('Ph.D'),
  net_set: (level) => level.includes('NET'),
};
async function uploadToStorage(bucket: string, file: File, prefix: string, appNo: string): Promise<string> {
  const ext = file.name.split('.').pop();
  const fileName = `${appNo}_${prefix}_${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(fileName, file, { upsert: true });
  if (error) throw new Error(error.message);
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
  return urlData?.publicUrl || '';
}

// â”€â”€â”€ Confirmation Dialog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ConfirmSubmitDialog({
  lang,
  onConfirm,
  onCancel,
  submitting,
}: {
  lang: 'en' | 'mr';
  onConfirm: () => void;
  onCancel: () => void;
  submitting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="max-w-sm w-full bg-white rounded-3xl p-6 shadow-2xl space-y-5 border border-slate-200">
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h3 className="text-base font-black text-slate-900">
            {lang === 'mr' ? 'à¤…à¤°à¥à¤œ à¤…à¤‚à¤¤à¤¿à¤® à¤•à¤°à¤£à¥à¤¯à¤¾à¤šà¥€ à¤ªà¥à¤·à¥à¤Ÿà¥€ à¤•à¤°à¤¾' : 'Confirm Final Submission'}
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            {lang === 'mr'
              ? 'à¤•à¥ƒà¤ªà¤¯à¤¾ à¤ªà¥à¤·à¥à¤Ÿà¥€ à¤•à¤°à¤¾ à¤•à¥€ à¤†à¤ªà¤£ à¤ªà¥à¤°à¤µà¤¿à¤·à¥à¤Ÿ à¤•à¥‡à¤²à¥‡à¤²à¥€ à¤¸à¤°à¥à¤µ à¤®à¤¾à¤¹à¤¿à¤¤à¥€ à¤†à¤£à¤¿ à¤…à¤ªà¤²à¥‹à¤¡ à¤•à¥‡à¤²à¥‡à¤²à¥€ à¤¸à¤°à¥à¤µ à¤•à¤¾à¤—à¤¦à¤ªà¤¤à¥à¤°à¥‡ à¤…à¤šà¥‚à¤• à¤†à¤¹à¥‡à¤¤. à¤à¤•à¤¦à¤¾ à¤¸à¤¾à¤¦à¤° à¤•à¥‡à¤²à¥à¤¯à¤¾à¤¨à¤‚à¤¤à¤° à¤†à¤ªà¤£ à¤¹à¤¾ à¤…à¤°à¥à¤œ à¤¯à¤¾à¤ªà¥à¤¢à¥‡ à¤¸à¤‚à¤ªà¤¾à¤¦à¤¿à¤¤ à¤•à¤°à¥‚ à¤¶à¤•à¤£à¤¾à¤° à¤¨à¤¾à¤¹à¥€.'
              : 'Please confirm that all entered details and uploaded documents are correct. Once submitted, you will no longer be able to edit this application.'}
          </p>
        </div>

        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2">
          <Lock className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-rose-800 font-semibold leading-relaxed">
            {lang === 'mr'
              ? 'à¤¸à¤¾à¤¦à¤°à¥€à¤•à¤°à¤£à¤¾à¤¨à¤‚à¤¤à¤° à¤…à¤°à¥à¤œ à¤²à¥‰à¤• à¤¹à¥‹à¤ˆà¤². à¤•à¥‹à¤£à¤¤à¤¾à¤¹à¥€ à¤¬à¤¦à¤² à¤•à¤°à¤£à¥à¤¯à¤¾à¤¸à¤¾à¤ à¥€ Front Desk à¤¶à¥€ à¤¸à¤‚à¤ªà¤°à¥à¤• à¤•à¤°à¤¾à¤µà¤¾ à¤²à¤¾à¤—à¥‡à¤².'
              : 'The application will be locked after submission. Any corrections will require Front Desk assistance.'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="py-3 border-2 border-slate-200 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-50 transition disabled:opacity-50"
          >
            {lang === 'mr' ? 'à¤ªà¤°à¤¤ à¤œà¤¾' : 'Go Back'}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            className="py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-xl transition shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> {lang === 'mr' ? 'à¤¸à¤¾à¤¦à¤° à¤¹à¥‹à¤¤ à¤†à¤¹à¥‡...' : 'Submitting...'}</>
            ) : (
              <><Send className="w-4 h-4" /> {lang === 'mr' ? 'à¤¹à¥‹à¤¯, à¤¸à¤¾à¤¦à¤° à¤•à¤°à¤¾' : 'Yes, Submit'}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// â”€â”€â”€ Main Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function CandidateUploadPage() {
  const [lang, setLang] = useState<'en' | 'mr'>('en');

  // â”€â”€ Session & ownership state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [session, setSession] = useState<CandidateSession | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [appStatus, setAppStatus] = useState<string>('');
  const [isLocked, setIsLocked] = useState(false);

  // â”€â”€ Upload state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [fileMap, setFileMap] = useState<Record<string, File | null>>({});
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<Record<string, 'ok' | 'error' | 'skip'>>({});
  const [storedUrls, setStoredUrls] = useState<Record<string, string>>({});
  const [uploadError, setUploadError] = useState<string | null>(null);

  // â”€â”€ Final submission state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [finalSubmitting, setFinalSubmitting] = useState(false);
  const [finalSubmitError, setFinalSubmitError] = useState<string | null>(null);
  const [finalSubmitDone, setFinalSubmitDone] = useState(false);

  // â”€â”€ On mount: read candidate session and verify ownership â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    const sess = getCandidateSession();
    if (!sess) {
      setSessionLoading(false);
      return;
    }
    setSession(sess);
    supabase
      .from('applications')
      .select('*, application_education(id, level, doc_url)')
      .eq('id', sess.appId)
      .eq('application_no', sess.appNo)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) console.error('Unable to load previously uploaded documents:', error.message);
        if (data) {
          setAppStatus(data.status);
          setIsLocked(isApplicationLocked(data.status));
          const urls: Record<string, string> = {};
          if (data.photo_url) urls.photo = data.photo_url;
          if (data.aadhaar_doc_url) urls.aadhaar = data.aadhaar_doc_url;
          if (data.pan_doc_url) urls.pan = data.pan_doc_url;
          if (data.resume_url) urls.resume = data.resume_url;
          if ((data as any).caste_cert_url) urls.caste_cert = (data as any).caste_cert_url;
          for (const education of data.application_education || []) {
            const slot = Object.entries(EDUCATION_SLOT_MATCH).find(([, matches]) => matches(education.level))?.[0];
            if (slot && education.doc_url) urls[slot] = education.doc_url;
          }
          setStoredUrls(urls);
          setUploadResults(Object.fromEntries(Object.keys(urls).map((slot) => [slot, 'ok'])));
        }
        setSessionLoading(false);
      });
  }, []);

  const handleFileChange = (slotId: string, file: File | null) => {
    if (file && file.size > 5 * 1024 * 1024) {
      alert(lang === 'mr' ? 'à¤«à¤¾à¤ˆà¤²à¤šà¤¾ à¤†à¤•à¤¾à¤° à¥« MB à¤ªà¥‡à¤•à¥à¤·à¤¾ à¤œà¤¾à¤¸à¥à¤¤ à¤†à¤¹à¥‡.' : 'File size exceeds 5 MB limit.');
      return;
    }
    setFileMap((prev) => ({ ...prev, [slotId]: file }));
    setUploadResults((prev) => ({ ...prev, [slotId]: file ? 'skip' : (storedUrls[slotId] ? 'ok' : 'skip') }));
  };

  // Save documents to storage + update DB (but don't change status)
  const handleSaveDocuments = async () => {
    if (!session || isLocked) return;
    const hasAny = Object.values(fileMap).some(Boolean);
    if (!hasAny) {
      alert(lang === 'mr' ? 'à¤•à¥ƒà¤ªà¤¯à¤¾ à¤•à¤¿à¤®à¤¾à¤¨ à¤à¤• à¤¦à¤¸à¥à¤¤à¤à¤µà¤œ à¤¨à¤¿à¤µà¤¡à¤¾.' : 'Please select at least one document to upload.');
      return;
    }
    setUploading(true);
    setUploadError(null);
    const results: Record<string, 'ok' | 'error' | 'skip'> = {};
    const dbUpdates: Record<string, string> = {};
    const uploadedUrls: Record<string, string> = {};

    for (const slot of DOC_SLOTS) {
      const file = fileMap[slot.id];
      if (!file) { results[slot.id] = 'skip'; continue; }
      try {
        const url = await uploadToStorage(slot.bucket, file, slot.prefix, session.appNo);
        results[slot.id] = 'ok';
        uploadedUrls[slot.id] = url;
        if (SLOT_COLUMN[slot.id]) dbUpdates[SLOT_COLUMN[slot.id]] = url;
        if (EDUCATION_SLOT_MATCH[slot.id]) {
          const { data: rows, error: rowsError } = await supabase
            .from('application_education')
            .select('id, level')
            .eq('application_id', session.appId);
          if (rowsError) throw rowsError;
          const education = (rows || []).find((row) => EDUCATION_SLOT_MATCH[slot.id](row.level));
          if (education?.id) {
            const { error } = await supabase.from('application_education').update({ doc_url: url }).eq('id', education.id);
            if (error) throw error;
          } else {
            const { error } = await supabase.from('application_education').insert({
              application_id: session.appId,
              level: slot.labelEn,
              degree_name: slot.labelEn,
              doc_url: url,
            });
            if (error) throw error;
          }
        }
      } catch {
        results[slot.id] = 'error';
      }
    }

    if (Object.keys(dbUpdates).length > 0) {
      const { error } = await supabase
        .from('applications')
        .update({ ...dbUpdates, updated_at: new Date().toISOString() })
        .eq('id', session.appId)
        .eq('application_no', session.appNo);
      if (error) {
        if (error.message.includes('caste_cert_url')) {
          const { caste_cert_url, ...fallbackUpdates } = dbUpdates;
          if (Object.keys(fallbackUpdates).length > 0) {
            await supabase
              .from('applications')
              .update({ ...fallbackUpdates, updated_at: new Date().toISOString() })
              .eq('id', session.appId)
              .eq('application_no', session.appNo);
          }
        } else {
          setUploadError(error.message);
        }
      }
    }

    setStoredUrls((previous) => ({ ...previous, ...uploadedUrls }));
    setUploadResults(results);
    const anyError = Object.values(results).some((r) => r === 'error');
    if (anyError) {
      setUploadError(
        lang === 'mr'
          ? 'à¤•à¤¾à¤¹à¥€ à¤«à¤¾à¤ˆà¤²à¥à¤¸ à¤…à¤ªà¤²à¥‹à¤¡ à¤¹à¥‹à¤Š à¤¶à¤•à¤²à¥à¤¯à¤¾ à¤¨à¤¾à¤¹à¥€à¤¤. à¤ªà¥à¤¨à¥à¤¹à¤¾ à¤ªà¥à¤°à¤¯à¤¤à¥à¤¨ à¤•à¤°à¤¾.'
          : 'Some files could not be uploaded. Check your connection and retry.'
      );
    }
    setUploading(false);
  };

  // Final submission: status draft â†’ submitted
  const handleFinalSubmit = async () => {
    if (!session) return;
    setFinalSubmitting(true);
    setFinalSubmitError(null);
    try {
      const { error } = await supabase
        .from('applications')
        .update({
          status: 'submitted',
          updated_at: new Date().toISOString(),
        })
        .eq('id', session.appId)
        .eq('application_no', session.appNo)
        .eq('status', 'draft'); // safety: only transition from draft

      if (error) throw error;

      setAppStatus('submitted');
      setIsLocked(true);
      setShowConfirmDialog(false);
      setFinalSubmitDone(true);
    } catch (err: any) {
      setFinalSubmitError(
        err.message || (lang === 'mr' ? 'à¤…à¤°à¥à¤œ à¤¸à¤¾à¤¦à¤° à¤•à¤°à¤¤à¤¾à¤¨à¤¾ à¤¤à¥à¤°à¥à¤Ÿà¥€ à¤†à¤²à¥€.' : 'Failed to submit application.')
      );
      setShowConfirmDialog(false);
    }
    setFinalSubmitting(false);
  };

  const selectedCount = Object.values(fileMap).filter(Boolean).length;
  const uploadedCount = Object.values(uploadResults).filter((r) => r === 'ok').length;
  const isDraft = appStatus === 'draft';

  // â”€â”€ FINAL SUBMIT SUCCESS SCREEN â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (finalSubmitDone && session) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-7 shadow-2xl text-center space-y-5 border border-slate-200">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              {lang === 'mr' ? 'à¤…à¤°à¥à¤œ à¤¯à¤¶à¤¸à¥à¤µà¥€à¤°à¥€à¤¤à¥à¤¯à¤¾ à¤¸à¤¾à¤¦à¤° à¤à¤¾à¤²à¤¾!' : 'Application Submitted Successfully!'}
            </h2>
            <p className="text-sm font-mono font-bold text-sky-800 mt-1 tracking-wider">{session.appNo}</p>
          </div>

          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-left space-y-2">
            <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="w-4 h-4" />
              {lang === 'mr' ? 'à¤…à¤°à¥à¤œ à¤¬à¤‚à¤¦ à¤à¤¾à¤²à¤¾ à¤†à¤¹à¥‡' : 'Application Locked'}
            </p>
            <p className="text-xs text-emerald-900 leading-relaxed">
              {lang === 'mr'
                ? 'à¤†à¤ªà¤²à¤¾ à¤…à¤°à¥à¤œ à¤…à¤‚à¤¤à¤¿à¤® à¤°à¥‚à¤ªà¤¾à¤¨à¥‡ à¤¸à¤¾à¤¦à¤° à¤à¤¾à¤²à¤¾ à¤†à¤¹à¥‡. à¤¯à¤¾à¤ªà¥à¤¢à¥‡ à¤…à¤°à¥à¤œà¤¾à¤¤ à¤•à¥‹à¤£à¤¤à¤¾à¤¹à¥€ à¤¬à¤¦à¤² à¤•à¤°à¤¤à¤¾ à¤¯à¥‡à¤£à¤¾à¤° à¤¨à¤¾à¤¹à¥€. HR à¤Ÿà¥€à¤® à¤²à¤µà¤•à¤°à¤š à¤†à¤ªà¤²à¥à¤¯à¤¾à¤¶à¥€ à¤¸à¤‚à¤ªà¤°à¥à¤• à¤¸à¤¾à¤§à¥‡à¤².'
                : 'Your application has been finalized and locked. No further edits are possible. The HR team will contact you for the next steps.'}
            </p>
          </div>

          {uploadedCount > 0 && (
            <div className="p-4 bg-sky-50 border border-sky-200 rounded-2xl text-left space-y-1">
              <p className="text-[11px] font-bold text-sky-800 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                {lang === 'mr' ? 'à¤…à¤ªà¤²à¥‹à¤¡ à¤à¤¾à¤²à¥‡à¤²à¥‡ à¤¦à¤¸à¥à¤¤à¤à¤µà¤œ:' : 'Documents Uploaded:'}
              </p>
              {DOC_SLOTS.filter((s) => uploadResults[s.id] === 'ok').map((s) => (
                <div key={s.id} className="flex items-center gap-1.5 text-xs text-sky-900 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  {lang === 'mr' ? s.labelMr : s.labelEn}
                </div>
              ))}
            </div>
          )}

          <div className="text-left text-xs text-slate-600 bg-slate-50 rounded-xl p-3.5 border border-slate-200 leading-relaxed">
            {lang === 'mr'
              ? 'à¤®à¥‚à¤³ à¤ªà¥à¤°à¤®à¤¾à¤£à¤ªà¤¤à¥à¤°à¥‡ à¤˜à¥‡à¤Šà¤¨ Front Desk à¤•à¤¾à¤‰à¤‚à¤Ÿà¤°à¤²à¤¾ à¤­à¥‡à¤Ÿ à¤¦à¥à¤¯à¤¾ à¤†à¤£à¤¿ à¤…à¤°à¥à¤œ à¤¶à¥à¤²à¥à¤• à¤ªà¤¾à¤µà¤¤à¥€ à¤®à¤¿à¤³à¤µà¤¾.'
              : 'Visit the Front Desk counter with original certificates and collect your application fee receipt.'}
          </div>

          <Link
            href="/"
            className="block w-full py-3.5 bg-sky-700 hover:bg-sky-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition"
          >
            {lang === 'mr' ? 'à¤®à¥à¤–à¥à¤¯à¤ªà¥ƒà¤·à¥à¤ à¤¾à¤µà¤° à¤ªà¤°à¤¤ à¤œà¤¾' : 'Return to Portal'}
          </Link>
        </div>
      </div>
    );
  }

  // â”€â”€ MAIN PAGE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <>
      {/* Confirmation Dialog */}
      {showConfirmDialog && session && (
        <ConfirmSubmitDialog
          lang={lang}
          onConfirm={handleFinalSubmit}
          onCancel={() => setShowConfirmDialog(false)}
          submitting={finalSubmitting}
        />
      )}

      <div className="min-h-screen bg-slate-100 pb-20 font-sans">
        {/* Header */}
        <header className="px-3 sm:px-4 py-2.5 sm:py-3.5 border-b border-slate-200 bg-white sticky top-0 z-30 shadow-sm">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-2">
            <Link href="/apply" className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-sky-700 transition py-1">
              <ArrowLeft className="w-4 h-4" />
              {lang === 'mr' ? 'à¤…à¤°à¥à¤œ à¤ªà¥ƒà¤·à¥à¤ ' : 'Application Form'}
            </Link>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-300 shadow-inner">
              <button type="button" onClick={() => setLang('en')} className={`px-3 py-1 rounded-lg text-xs font-bold transition ${lang === 'en' ? 'bg-sky-700 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>English</button>
              <button type="button" onClick={() => setLang('mr')} className={`px-3 py-1 rounded-lg text-xs font-bold transition ${lang === 'mr' ? 'bg-sky-700 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>à¤®à¤°à¤¾à¤ à¥€</button>
            </div>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-3 sm:px-4 pt-4 sm:pt-6 space-y-5">
          <TrustLetterhead org={null} variant="standard" titleBadge={lang === 'mr' ? 'à¤¦à¤¸à¥à¤¤à¤à¤µà¤œ à¤…à¤ªà¤²à¥‹à¤¡ à¤µ à¤…à¤°à¥à¤œ à¤¸à¤¾à¤¦à¤°à¥€à¤•à¤°à¤£' : 'DOCUMENT UPLOAD & APPLICATION SUBMISSION'} />

          {/* Loading */}
          {sessionLoading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
            </div>
          )}

          {/* â”€â”€ NO SESSION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {!sessionLoading && !session && (
            <div className="bg-white rounded-2xl sm:rounded-3xl p-7 shadow-sm border-2 border-amber-300 space-y-5 text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  {lang === 'mr' ? 'à¤ªà¥à¤°à¤µà¥‡à¤¶ à¤¨à¤¾à¤•à¤¾à¤°à¤²à¤¾' : 'Access Not Authorized'}
                </h2>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-sm mx-auto">
                  {lang === 'mr'
                    ? 'à¤¦à¤¸à¥à¤¤à¤à¤µà¤œ à¤…à¤ªà¤²à¥‹à¤¡ à¤•à¤°à¤£à¥à¤¯à¤¾à¤¸à¤¾à¤ à¥€ à¤†à¤ªà¤£ à¤ªà¥à¤°à¤¥à¤® Walk-in Application Form à¤­à¤°à¤£à¥‡ à¤†à¤µà¤¶à¥à¤¯à¤• à¤†à¤¹à¥‡. à¤¤à¥à¤¯à¤¾à¤š à¤¬à¥à¤°à¤¾à¤‰à¤à¤° à¤Ÿà¥…à¤¬à¤®à¤§à¥à¤¯à¥‡ à¤¯à¤¶à¤¸à¥à¤µà¥€ à¤¸à¥à¤•à¥à¤°à¥€à¤¨à¤µà¤°à¥‚à¤¨ à¤¯à¤¾ à¤ªà¥ƒà¤·à¥à¤ à¤¾à¤µà¤° à¤¯à¤¾.'
                    : 'To upload documents, you must have just submitted your application in this browser session. This page is only accessible directly from the Application Success Screen.'}
                </p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 text-left space-y-1.5">
                <p className="font-bold text-slate-800">{lang === 'mr' ? 'à¤•à¤¾à¤¯ à¤•à¤°à¤¾à¤µà¥‡:' : 'What to do:'}</p>
                <p>1. {lang === 'mr' ? 'à¤¨à¤µà¥à¤¯à¤¾à¤¨à¥‡ Walk-in Application Form à¤­à¤°à¤¾.' : 'Submit a new Walk-in Application Form.'}</p>
                <p>2. {lang === 'mr' ? 'à¤¯à¤¶à¤¸à¥à¤µà¥€ à¤¸à¥à¤•à¥à¤°à¥€à¤¨à¤µà¤°à¥€à¤² "Upload Documents & Submit" à¤¬à¤Ÿà¤£à¤¾à¤µà¤° à¤•à¥à¤²à¤¿à¤• à¤•à¤°à¤¾.' : 'Click "Upload Documents & Submit" on the Success Screen immediately after submission.'}</p>
                <p>3. {lang === 'mr' ? 'à¤•à¤¿à¤‚à¤µà¤¾ Front Desk à¤•à¤¾à¤‰à¤‚à¤Ÿà¤°à¤µà¤° à¤®à¥‚à¤³ à¤¦à¤¸à¥à¤¤à¤à¤µà¤œ à¤˜à¥‡à¤Šà¤¨ à¤œà¤¾.' : 'Alternatively, bring original documents to the Front Desk counter for staff-assisted upload.'}</p>
              </div>
              <Link href="/apply" className="inline-flex items-center gap-2 px-6 py-3 bg-sky-700 hover:bg-sky-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition shadow-sm">
                {lang === 'mr' ? 'Walk-in Form à¤­à¤°à¤¾' : 'Go to Application Form'}
              </Link>
            </div>
          )}

          {/* â”€â”€ SESSION EXISTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {!sessionLoading && session && (
            <>
              {/* Application identity card */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    {lang === 'mr' ? 'à¤…à¤§à¤¿à¤•à¥ƒà¤¤ à¤¸à¤¤à¥à¤° â€” à¤†à¤ªà¤²à¤¾ à¤…à¤°à¥à¤œ' : 'Authorised Session â€” Your Application'}
                  </p>
                  <p className="text-sm font-black font-mono text-slate-900 tracking-widest">{session.appNo}</p>
                </div>
                <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold flex-shrink-0 border ${
                  isLocked
                    ? 'bg-rose-100 text-rose-800 border-rose-300'
                    : isDraft
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                }`}>
                  {isLocked ? <><Lock className="w-3 h-3" /> {lang === 'mr' ? 'à¤²à¥‰à¤•' : 'Locked'}</> : isDraft ? `ðŸ“ ${lang === 'mr' ? 'à¤¡à¥à¤°à¤¾à¤«à¥à¤Ÿ' : 'Draft'}` : `âœ“ ${lang === 'mr' ? 'à¤¸à¤¾à¤¦à¤°' : 'Submitted'}`}
                </span>
              </div>

              {/* Final submit error */}
              {finalSubmitError && (
                <div className="flex items-start gap-2 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-semibold">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />{finalSubmitError}
                </div>
              )}

              {/* â”€â”€ LOCKED BANNER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
              {isLocked && (
                <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-5 flex items-start gap-3">
                  <Lock className="w-6 h-6 text-emerald-700 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-black text-emerald-900 text-sm">
                      {lang === 'mr' ? 'à¤…à¤°à¥à¤œ à¤¸à¤¾à¤¦à¤° à¤à¤¾à¤²à¤¾ à¤†à¤¹à¥‡ â€” à¤¸à¤‚à¤ªà¤¾à¤¦à¤¨ à¤¬à¤‚à¤¦' : 'Application Submitted & Locked'}
                    </p>
                    <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                      {lang === 'mr'
                        ? `à¤†à¤ªà¤²à¤¾ à¤…à¤°à¥à¤œ "${appStatus.replace(/_/g, ' ')}" à¤¸à¥à¤¥à¤¿à¤¤à¥€à¤¤ à¤†à¤¹à¥‡. à¤¦à¤¸à¥à¤¤à¤à¤µà¤œ à¤…à¤ªà¤²à¥‹à¤¡ à¤•à¤¿à¤‚à¤µà¤¾ à¤®à¤¾à¤¹à¤¿à¤¤à¥€ à¤¬à¤¦à¤² à¤•à¤°à¤¤à¤¾ à¤¯à¥‡à¤£à¤¾à¤° à¤¨à¤¾à¤¹à¥€. à¤…à¤§à¤¿à¤• à¤®à¤¾à¤¹à¤¿à¤¤à¥€à¤¸à¤¾à¤ à¥€ Front Desk à¤¶à¥€ à¤¸à¤‚à¤ªà¤°à¥à¤• à¤•à¤°à¤¾.`
                        : `Your application is in "${appStatus.replace(/_/g, ' ')}" status. Document uploads and modifications are no longer permitted. Contact the Front Desk for any corrections.`}
                    </p>
                  </div>
                </div>
              )}

              {/* â”€â”€ DRAFT: Upload Grid + Verify & Submit â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
              {isLocked && (
                <section className="bg-white rounded-2xl p-5 border border-slate-200 space-y-3">
                  <h3 className="text-sm font-black text-slate-900">Previously Uploaded Documents</h3>
                  {DOC_SLOTS.filter((slot) => storedUrls[slot.id]).length ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {DOC_SLOTS.filter((slot) => storedUrls[slot.id]).map((slot) => (
                        <a key={slot.id} href={storedUrls[slot.id]} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 p-3 rounded-xl border border-emerald-200 bg-emerald-50 text-xs font-bold text-emerald-900">
                          <span>{slot.labelEn} · Uploaded</span><span className="text-sky-800 underline">View / Preview</span>
                        </a>
                      ))}
                    </div>
                  ) : <p className="text-xs text-slate-500">No document attachments were saved with this application.</p>}
                </section>
              )}
              {!isLocked && (
                <>
                  {/* Draft notice */}
                  <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-2xl">
                    <AlertTriangle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-900 leading-relaxed">
                      <strong>{lang === 'mr' ? 'à¤¡à¥à¤°à¤¾à¤«à¥à¤Ÿ à¤…à¤°à¥à¤œ: ' : 'Draft Application: '}</strong>
                      {lang === 'mr'
                        ? 'à¤†à¤ªà¤²à¥‡ à¤¦à¤¸à¥à¤¤à¤à¤µà¤œ à¤…à¤ªà¤²à¥‹à¤¡ à¤•à¤°à¤¾ à¤†à¤£à¤¿ à¤¨à¤‚à¤¤à¤° "Verify & Submit Application" à¤¬à¤Ÿà¤£à¤¾à¤µà¤° à¤•à¥à¤²à¤¿à¤• à¤•à¤°à¤¾. à¤¸à¤¾à¤¦à¤°à¥€à¤•à¤°à¤£à¤¾à¤¨à¤‚à¤¤à¤° à¤…à¤°à¥à¤œ à¤¬à¤‚à¤¦ à¤¹à¥‹à¤ˆà¤².'
                        : 'Upload your documents below, then click "Verify & Submit Application" to formally submit. The form will be locked after submission.'}
                    </p>
                  </div>

                  {/* Document Upload Grid */}
                  <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-sm border border-slate-200 space-y-4">
                    <div className="flex items-center gap-2.5 border-b border-slate-100 pb-2.5">
                      <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">ðŸ“Ž</div>
                      <div>
                        <h3 className="text-sm sm:text-base font-bold text-slate-900">
                          {lang === 'mr' ? 'à¤¦à¤¸à¥à¤¤à¤à¤µà¤œ à¤¨à¤¿à¤µà¤¡à¤¾ à¤µ à¤…à¤ªà¤²à¥‹à¤¡ à¤•à¤°à¤¾' : 'Select & Upload Documents'}
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          {lang === 'mr'
                            ? 'à¤à¤• à¤•à¤¿à¤‚à¤µà¤¾ à¤…à¤§à¤¿à¤• à¤¦à¤¸à¥à¤¤à¤à¤µà¤œ à¤¨à¤¿à¤µà¤¡à¤¾ (à¤ªà¥à¤°à¤¤à¥à¤¯à¥‡à¤• à¤œà¤¾à¤¸à¥à¤¤à¥€à¤¤ à¤œà¤¾à¤¸à¥à¤¤ à¥« MB)'
                            : 'Select one or more documents (max 5 MB each â€” JPG, PNG, PDF)'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {DOC_SLOTS.map((slot) => {
                        const file = fileMap[slot.id];
                        const result = uploadResults[slot.id];
                        return (
                          <div
                            key={slot.id}
                            className={`p-3.5 rounded-2xl border transition ${
                              result === 'ok' ? 'bg-emerald-50 border-emerald-300' :
                              result === 'error' ? 'bg-rose-50 border-rose-300' :
                              file ? 'bg-sky-50 border-sky-300' :
                              'bg-slate-50 border-slate-200'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex items-start gap-2">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                  result === 'ok' ? 'bg-emerald-100 text-emerald-600' :
                                  file ? 'bg-sky-100 text-sky-700' :
                                  'bg-slate-200 text-slate-500'
                                }`}>
                                  {result === 'ok' ? <CheckCircle2 className="w-4 h-4" /> :
                                   file?.type?.startsWith('image/') ? <ImageIcon className="w-4 h-4" /> :
                                   file ? <FileText className="w-4 h-4" /> : <File className="w-4 h-4" />}
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-slate-800 leading-tight">{lang === 'mr' ? slot.labelMr : slot.labelEn}</p>
                                  {slot.hint && !file && <p className="text-[10px] text-slate-400 mt-0.5">{slot.hint}</p>}
                                  {file && <p className="text-[10px] text-sky-700 font-semibold mt-0.5 truncate max-w-[160px]">{file.name} Â· {(file.size / 1024).toFixed(0)} KB</p>}
                                  {result === 'ok' && <p className="text-[10px] text-emerald-700 font-bold mt-0.5">âœ“ {lang === 'mr' ? 'à¤…à¤ªà¤²à¥‹à¤¡ à¤à¤¾à¤²à¥‡' : 'Uploaded'}</p>}
                                  {result === 'error' && <p className="text-[10px] text-rose-700 font-bold mt-0.5">âœ— {lang === 'mr' ? 'à¤…à¤ªà¤²à¥‹à¤¡ à¤…à¤¯à¤¶à¤¸à¥à¤µà¥€' : 'Upload failed'}</p>}
                                </div>
                              </div>
                              {storedUrls[slot.id] && (
                                <a href={storedUrls[slot.id]} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-sky-700 hover:text-sky-900 underline">
                                  View / Preview
                                </a>
                              )}
                              {file && !uploading && (
                                <button
                                  type="button"
                                  onClick={() => handleFileChange(slot.id, null)}
                                  className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-100 rounded-lg transition flex-shrink-0"
                                  title="Remove"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                            {!isLocked && (
                              <label className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition ${
                                file
                                  ? 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                                  : 'bg-white border border-slate-300 text-slate-700 hover:border-sky-400 hover:text-sky-700'
                              }`}>
                                <FolderOpen className="w-3.5 h-3.5" />
                                {file || storedUrls[slot.id] ? 'Replace File' : 'Choose File'}
                                <input
                                  type="file"
                                  accept={slot.accept}
                                  className="hidden"
                                  disabled={uploading}
                                  onChange={(e) => handleFileChange(slot.id, e.target.files?.[0] || null)}
                                />
                              </label>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {uploadError && (
                      <div className="flex items-start gap-2 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-semibold">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />{uploadError}
                      </div>
                    )}

                    {/* Save Documents Button */}
                    <button
                      type="button"
                      onClick={handleSaveDocuments}
                      disabled={uploading || selectedCount === 0}
                      className="w-full py-3.5 bg-gradient-to-r from-sky-800 via-sky-700 to-sky-900 hover:from-sky-900 hover:to-sky-950 text-white rounded-2xl text-sm font-black uppercase tracking-wider shadow-lg transition disabled:opacity-40 flex items-center justify-center gap-2 active:scale-[0.99]"
                    >
                      {uploading ? (
                        <><Loader2 className="w-5 h-5 animate-spin" /><span>{lang === 'mr' ? 'à¤…à¤ªà¤²à¥‹à¤¡ à¤¹à¥‹à¤¤ à¤†à¤¹à¥‡...' : 'Uploading Documents...'}</span></>
                      ) : (
                        <><Upload className="w-5 h-5" /><span>{selectedCount > 0
                          ? (lang === 'mr' ? `${selectedCount} à¤¦à¤¸à¥à¤¤à¤à¤µà¤œ à¤œà¤¤à¤¨ à¤•à¤°à¤¾` : `Save ${selectedCount} Document${selectedCount > 1 ? 's' : ''}`)
                          : (lang === 'mr' ? 'à¤¦à¤¸à¥à¤¤à¤à¤µà¤œ à¤¨à¤¿à¤µà¤¡à¤¾' : 'Select Documents to Upload')
                        }</span></>
                      )}
                    </button>
                  </div>

                  {/* â”€â”€ VERIFY & SUBMIT SECTION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                  <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-sm border-2 border-emerald-200 space-y-4">
                    <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                        <Send className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-900">
                          {lang === 'mr' ? 'à¤…à¤°à¥à¤œ à¤…à¤‚à¤¤à¤¿à¤® à¤¸à¤¾à¤¦à¤°à¥€à¤•à¤°à¤£' : 'Final Application Submission'}
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          {lang === 'mr'
                            ? 'à¤¸à¤°à¥à¤µ à¤®à¤¾à¤¹à¤¿à¤¤à¥€ à¤µ à¤¦à¤¸à¥à¤¤à¤à¤µà¤œ à¤¤à¤ªà¤¾à¤¸à¤¾ â€” à¤à¤•à¤¦à¤¾ à¤¸à¤¾à¤¦à¤° à¤•à¥‡à¤²à¥à¤¯à¤¾à¤¨à¤‚à¤¤à¤° à¤¬à¤¦à¤² à¤•à¤°à¤¤à¤¾ à¤¯à¥‡à¤£à¤¾à¤° à¤¨à¤¾à¤¹à¥€'
                            : 'Review all details & documents â€” changes are not possible after submission'}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs text-slate-700">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span>{lang === 'mr' ? 'à¤†à¤ªà¤£ Walk-in Application Form à¤®à¤§à¥à¤¯à¥‡ à¤­à¤°à¤²à¥‡à¤²à¥€ à¤®à¤¾à¤¹à¤¿à¤¤à¥€ à¤¬à¤°à¥‹à¤¬à¤° à¤†à¤¹à¥‡ à¤¯à¤¾à¤šà¥€ à¤–à¤¾à¤¤à¥à¤°à¥€ à¤•à¤°à¤¾.' : 'Confirm that all personal and academic details filled in the application form are accurate.'}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className={`w-4 h-4 flex-shrink-0 mt-0.5 ${uploadedCount > 0 ? 'text-emerald-500' : 'text-slate-300'}`} />
                        <span className={uploadedCount > 0 ? '' : 'text-slate-400'}>
                          {lang === 'mr'
                            ? `à¤¦à¤¸à¥à¤¤à¤à¤µà¤œ à¤…à¤ªà¤²à¥‹à¤¡ à¤à¤¾à¤²à¥‡ à¤†à¤¹à¥‡à¤¤ ${uploadedCount > 0 ? `(${uploadedCount} à¤œà¤¤à¤¨)` : '(à¤…à¤¦à¥à¤¯à¤¾à¤ª à¤…à¤ªà¤²à¥‹à¤¡ à¤•à¥‡à¤²à¥‡à¤²à¥‡ à¤¨à¤¾à¤¹à¥€à¤¤ â€” à¤µà¤°à¥‚à¤¨ à¤…à¤ªà¤²à¥‹à¤¡ à¤•à¤°à¤¾)'}` 
                            : `Documents uploaded ${uploadedCount > 0 ? `(${uploadedCount} saved)` : '(none yet â€” upload above first)'}`}
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span>{lang === 'mr' ? 'à¤¸à¤¾à¤¦à¤°à¥€à¤•à¤°à¤£à¤¾à¤¨à¤‚à¤¤à¤° à¤®à¥‚à¤³ à¤ªà¥à¤°à¤®à¤¾à¤£à¤ªà¤¤à¥à¤°à¥‡ à¤˜à¥‡à¤Šà¤¨ Front Desk à¤•à¤¾à¤‰à¤‚à¤Ÿà¤°à¤²à¤¾ à¤­à¥‡à¤Ÿ à¤¦à¥à¤¯à¤¾à¤µà¥€.' : 'After submission, visit the Front Desk counter with original certificates.'}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowConfirmDialog(true)}
                      className="w-full py-4 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-2xl text-sm font-black uppercase tracking-wider shadow-xl transition flex items-center justify-center gap-2.5 active:scale-[0.99]"
                    >
                      <Send className="w-5 h-5" />
                      {lang === 'mr' ? 'Verify & Submit Application' : 'Verify & Submit Application'}
                    </button>

                    <p className="text-center text-[10px] text-slate-400 leading-relaxed">
                      {lang === 'mr'
                        ? 'âš ï¸ à¤à¤•à¤¦à¤¾ à¤¸à¤¾à¤¦à¤° à¤•à¥‡à¤²à¥à¤¯à¤¾à¤¨à¤‚à¤¤à¤° à¤…à¤°à¥à¤œà¤¾à¤¤ à¤•à¥‹à¤£à¤¤à¤¾à¤¹à¥€ à¤¬à¤¦à¤² à¤•à¤°à¤¤à¤¾ à¤¯à¥‡à¤£à¤¾à¤° à¤¨à¤¾à¤¹à¥€.'
                        : 'âš ï¸ Once submitted, no changes can be made to this application.'}
                    </p>
                  </div>
                </>
              )}
            </>
          )}
        </main>
      </div>
    </>
  );
}
