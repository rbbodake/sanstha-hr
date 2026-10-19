import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { numberToWordsINR } from '@/lib/numberToWords';

/**
 * POST /api/frontdesk/settle-fee
 * 
 * Front Desk Walk-In Fee Settlement:
 * When an online pre-registered candidate physically arrives at the front desk:
 * 1. Collects the fee and records payment details.
 * 2. Generates an official Sanstha Fee Receipt.
 * 3. Converts registration_status from 'DRAFT_PENDING_FEE' to 'COMPLETED_PAID'.
 * 4. Updates application status to 'fee_paid' and logs the front desk audit action.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      application_id,
      receipt_no,
      amount,
      payment_mode = 'Cash',
      reference_no,
      collected_by_user_id,
      collected_by_name = 'Front Desk Officer',
      remarks = 'Fee collected and documents verified at Front Desk counter.',
      caller_role,
    } = body;

    const role = request.headers.get('x-user-role') || caller_role;
    const allowedRoles = ['receptionist', 'admin_head_hr'];
    if (role && !allowedRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Forbidden: Only Front Desk staff and Central HR can process fee settlements.' },
        { status: 403 }
      );
    }

    if (!application_id) {
      return NextResponse.json({ error: 'Missing required field: application_id' }, { status: 400 });
    }

    if (!receipt_no) {
      return NextResponse.json({ error: 'Missing required field: receipt_no' }, { status: 400 });
    }

    const feeAmount = parseFloat(amount) || 0;
    const now = new Date().toISOString();
    const amountInWords = numberToWordsINR(feeAmount);

    // 1. Fetch current application to verify existence
    const { data: appData, error: fetchErr } = await supabase
      .from('applications')
      .select('*')
      .eq('id', application_id)
      .single();

    if (fetchErr || !appData) {
      return NextResponse.json(
        { error: `Application not found: ${fetchErr?.message || application_id}` },
        { status: 404 }
      );
    }

    // 2. Insert Official Fee Receipt
    const receiptInsertPayload: Record<string, any> = {
      receipt_no: receipt_no.trim(),
      application_id,
      amount: feeAmount,
      amount_in_words: amountInWords,
      payment_mode: payment_mode.trim(),
      reference_no: reference_no?.trim() || null,
      issued_by: collected_by_user_id || null,
      issued_at: now,
      is_cancelled: false,
    };

    const { data: newReceipt, error: receiptError } = await supabase
      .from('fee_receipts')
      .insert(receiptInsertPayload)
      .select()
      .single();

    if (receiptError) {
      console.error('Error inserting fee receipt:', receiptError);
      return NextResponse.json(
        { error: `Failed to issue fee receipt: ${receiptError.message}` },
        { status: 500 }
      );
    }

    // 3. Update Application Status to Active & Completed Paid
    const appUpdatePayload: Record<string, any> = {
      registration_status: 'COMPLETED_PAID',
      fee_receipt_no: receipt_no.trim(),
      collected_by_user_id: collected_by_user_id || null,
      collected_at: now,
      status: 'fee_paid',
      verified_at: now,
      verified_by: collected_by_user_id || null,
      verification_remarks: remarks.trim(),
      updated_at: now,
    };

    let updatedApp: any = null;
    const { data: updateData, error: updateError } = await supabase
      .from('applications')
      .update(appUpdatePayload)
      .eq('id', application_id)
      .select(`
        *,
        posts (*),
        staff_categories (*),
        fee_receipts (*)
      `)
      .single();

    if (updateError) {
      // In case registration_status column doesn't exist yet, retry updating baseline fields
      console.warn('Notice updating registration_status:', updateError.message);
      delete appUpdatePayload.registration_status;
      delete appUpdatePayload.fee_receipt_no;
      delete appUpdatePayload.collected_by_user_id;
      delete appUpdatePayload.collected_at;

      const { data: retryData, error: retryErr } = await supabase
        .from('applications')
        .update(appUpdatePayload)
        .eq('id', application_id)
        .select(`*, posts (*), staff_categories (*), fee_receipts (*)`)
        .single();

      if (retryErr) {
        return NextResponse.json({ error: retryErr.message }, { status: 500 });
      }
      updatedApp = retryData;
    } else {
      updatedApp = updateData;
    }

    // 4. Create Audit Log
    try {
      const logPayload = {
        application_id,
        action: 'status_changed',
        actor_name: collected_by_name,
        actor_role: role || 'receptionist',
        remarks: `Physical walk-in fee settlement completed. Receipt #${receipt_no} (₹${feeAmount} via ${payment_mode}). Application converted to verified fee_paid.`,
        created_at: now,
      };
      await supabase.from('application_workflow_logs').insert(logPayload);
    } catch (logErr) {
      console.warn('Audit log write warning:', logErr);
    }

    return NextResponse.json({
      success: true,
      message: `Fee of ₹${feeAmount} collected successfully. Application converted to active verified status.`,
      receipt: newReceipt,
      application: updatedApp,
    });
  } catch (err: any) {
    console.error('Front Desk Fee Settlement failed:', err);
    return NextResponse.json(
      { error: err?.message || 'Fee settlement processing failed' },
      { status: 500 }
    );
  }
}
