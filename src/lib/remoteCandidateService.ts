import { supabase } from '@/lib/supabase';
import { Application, FeeReceipt } from '@/types/database';
import { saveLocalApplicationOverride } from '@/lib/workflowService';
import { numberToWordsINR } from '@/lib/numberToWords';

export interface SettleFeeParams {
  applicationId: string;
  receiptNo: string;
  amount: number;
  paymentMode: string;
  referenceNo?: string;
  collectedByUserId?: string;
  collectedByName?: string;
  remarks?: string;
  callerRole?: string;
}

/**
 * Client service to fetch online pre-registrations.
 * Only Central HR (admin_head_hr) is authorized.
 */
export async function getOnlinePreRegistrations(callerRole: string): Promise<Application[]> {
  if (callerRole !== 'admin_head_hr') {
    throw new Error('Access Denied: Only Central HR can view the full online pre-registrations list.');
  }

  try {
    const res = await fetch(`/api/candidates/online-registrations?role=${encodeURIComponent(callerRole)}`, {
      headers: {
        'x-user-role': callerRole,
      },
    });
    if (res.ok) {
      const json = await res.json();
      return json.candidates || [];
    }
  } catch (e) {
    console.warn('API call fallback, fetching via Supabase client directly:', e);
  }

  // Direct Supabase fallback
  const { data, error } = await supabase
    .from('applications')
    .select(`
      *,
      posts (*),
      staff_categories (*),
      institutes:preferred_institute_id (*)
    `)
    .eq('source_type', 'ONLINE_REMOTE')
    .eq('registration_status', 'DRAFT_PENDING_FEE')
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('Direct fetch error for remote applications:', error.message);
    return [];
  }

  return (data as Application[]) || [];
}

/**
 * Searches candidate records for Front Desk Walk-In fee collection.
 * Works with Phone Number, Aadhaar Number, or Temporary ID.
 */
export async function lookupCandidateForFrontDesk(query: string, callerRole: string): Promise<Application[]> {
  const clean = query.trim();
  if (clean.length < 3) return [];

  try {
    const res = await fetch(`/api/frontdesk/lookup?query=${encodeURIComponent(clean)}&role=${encodeURIComponent(callerRole)}`, {
      headers: {
        'x-user-role': callerRole,
      },
    });
    if (res.ok) {
      const json = await res.json();
      return json.candidates || [];
    }
  } catch (e) {
    console.warn('API lookup fallback:', e);
  }

  // Direct client-side lookup fallback
  const phoneDigits = clean.replace(/\D/g, '');
  let queryBuilder = supabase
    .from('applications')
    .select(`
      *,
      posts (*),
      staff_categories (*),
      fee_receipts (*),
      application_education (*),
      application_experience (*),
      institutes:preferred_institute_id (*)
    `);

  if (clean.toUpperCase().includes('TMP')) {
    queryBuilder = queryBuilder.or(`temp_id.ilike.%${clean}%,application_no.ilike.%${clean}%`);
  } else if (phoneDigits.length >= 10) {
    const tenDigits = phoneDigits.slice(-10);
    queryBuilder = queryBuilder.or(`contact_no.ilike.%${tenDigits}%,temp_id.ilike.%${clean}%,application_no.ilike.%${clean}%`);
  } else {
    queryBuilder = queryBuilder.or(`contact_no.ilike.%${clean}%,temp_id.ilike.%${clean}%,application_no.ilike.%${clean}%,candidate_name.ilike.%${clean}%`);
  }

  const { data, error } = await queryBuilder.limit(20);
  if (error) {
    console.warn('Client-side candidate lookup fallback failed:', error.message);
    return [];
  }

  return (data as Application[]) || [];
}

/**
 * Executes the Front Desk Fee Settlement and converts candidate to active verified status.
 */
export async function settleFrontDeskFee(params: SettleFeeParams): Promise<{
  success: boolean;
  receipt?: FeeReceipt;
  application?: Application;
  error?: string;
}> {
  const now = new Date().toISOString();

  // Try API route first
  try {
    const res = await fetch('/api/frontdesk/settle-fee', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': params.callerRole || 'receptionist',
      },
      body: JSON.stringify({
        application_id: params.applicationId,
        receipt_no: params.receiptNo,
        amount: params.amount,
        payment_mode: params.paymentMode,
        reference_no: params.referenceNo,
        collected_by_user_id: params.collectedByUserId,
        collected_by_name: params.collectedByName,
        remarks: params.remarks,
        caller_role: params.callerRole,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      // Also save local overrides for immediate reactivity across open tabs
      saveLocalApplicationOverride(params.applicationId, {
        registration_status: 'COMPLETED_PAID',
        source_type: 'ONLINE_REMOTE',
        status: 'fee_paid',
        fee_receipt_no: params.receiptNo,
        collected_by_user_id: params.collectedByUserId,
        collected_at: now,
      });

      return {
        success: true,
        receipt: data.receipt,
        application: data.application,
      };
    }
  } catch (apiErr) {
    console.warn('API settle-fee endpoint unreachable, trying client fallback:', apiErr);
  }

  // Supabase direct client fallback
  try {
    const amountInWords = numberToWordsINR(params.amount);

    const { data: receiptData, error: receiptErr } = await supabase
      .from('fee_receipts')
      .insert({
        receipt_no: params.receiptNo,
        application_id: params.applicationId,
        amount: params.amount,
        amount_in_words: amountInWords,
        payment_mode: params.paymentMode,
        reference_no: params.referenceNo || null,
        issued_by: params.collectedByUserId || null,
        issued_at: now,
        is_cancelled: false,
      })
      .select()
      .single();

    if (receiptErr) throw receiptErr;

    const updates: Partial<Application> = {
      registration_status: 'COMPLETED_PAID',
      fee_receipt_no: params.receiptNo,
      collected_by_user_id: params.collectedByUserId,
      collected_at: now,
      status: 'fee_paid',
      verified_at: now,
      verified_by: params.collectedByUserId,
      verification_remarks: params.remarks || 'Fee collected and verified at Front Desk counter.',
    };

    saveLocalApplicationOverride(params.applicationId, updates);

    const { data: updatedApp, error: appErr } = await supabase
      .from('applications')
      .update(updates)
      .eq('id', params.applicationId)
      .select(`*, posts (*), staff_categories (*), fee_receipts (*)`)
      .single();

    if (appErr) {
      // In case columns don't exist yet in DB schema
      const safeUpdates = {
        status: 'fee_paid',
        verified_at: now,
        verified_by: params.collectedByUserId,
        verification_remarks: params.remarks || 'Fee collected and verified at Front Desk counter.',
      };
      await supabase.from('applications').update(safeUpdates).eq('id', params.applicationId);
    }

    return {
      success: true,
      receipt: receiptData as FeeReceipt,
      application: updatedApp as Application,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to process fee settlement.',
    };
  }
}
