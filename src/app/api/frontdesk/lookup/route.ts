import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET/POST /api/frontdesk/lookup
 * 
 * Allows Front Desk staff ('receptionist') and Central HR ('admin_head_hr') to search
 * candidates specifically by:
 *  - Phone number (e.g. 9876543210)
 *  - Temporary Application ID (e.g. TMP-2026-00001)
 *  - National ID / Aadhaar number (full 12 digits or last 4 digits)
 *  - Application Number (e.g. 2026-OCT-00001)
 * 
 * NOTE: Blank or unbounded queries are strictly prohibited so Front Desk staff cannot
 * mass-browse the full remote pre-registration queue.
 */
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('query') || '';
  const callerRole = request.headers.get('x-user-role') || request.nextUrl.searchParams.get('role');
  return performLookup(query, callerRole);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const query = body?.query || '';
    const callerRole = request.headers.get('x-user-role') || body?.role;
    return performLookup(query, callerRole);
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

async function performLookup(rawQuery: string, callerRole?: string | null) {
  const clean = (rawQuery || '').trim();

  // Role Gate: Must be staff (receptionist or admin_head_hr)
  const allowedRoles = ['receptionist', 'admin_head_hr'];
  if (callerRole && !allowedRoles.includes(callerRole)) {
    return NextResponse.json(
      { error: 'Forbidden: Front Desk lookup requires staff authorization.' },
      { status: 403 }
    );
  }

  // Length guard: prevent wildcard queries
  if (!clean || clean.length < 3) {
    return NextResponse.json(
      {
        error: 'Search query too short. Please provide at least 3 characters (Phone Number, Aadhaar, or Temporary Application ID).',
        candidates: []
      },
      { status: 400 }
    );
  }

  const phoneQuery = clean.replace(/\D/g, '');
  const isNumericPhone = phoneQuery.length >= 10;
  const isAadhaarNumber = phoneQuery.length === 12;
  const isTempIdQuery = clean.toUpperCase().includes('TMP') || clean.toUpperCase().includes('TEMP');

  try {
    // 1. Fetch candidates matching any of the candidate identifiers
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

    if (isTempIdQuery) {
      // Query by temporary application id or application_no
      queryBuilder = queryBuilder.or(`temp_id.ilike.%${clean}%,application_no.ilike.%${clean}%`);
    } else if (isAadhaarNumber) {
      // Query by Aadhaar
      queryBuilder = queryBuilder.or(`aadhaar_full.eq.${phoneQuery},aadhaar_masked.ilike.%${phoneQuery.slice(-4)}%,contact_no.ilike.%${phoneQuery.slice(-10)}%`);
    } else if (isNumericPhone) {
      const tenDigits = phoneQuery.slice(-10);
      queryBuilder = queryBuilder.or(`contact_no.ilike.%${tenDigits}%,temp_id.ilike.%${clean}%,application_no.ilike.%${clean}%`);
    } else {
      // General term: temp_id, application_no, candidate_name, or contact_no
      queryBuilder = queryBuilder.or(`temp_id.ilike.%${clean}%,application_no.ilike.%${clean}%,contact_no.ilike.%${clean}%,candidate_name.ilike.%${clean}%`);
    }

    const { data: candidates, error } = await queryBuilder.limit(20);

    if (error) {
      // Fallback: If temp_id column doesn't exist yet in Supabase, query without temp_id
      if (error.message.includes('temp_id')) {
        const { data: fallbackCandidates, error: fbErr } = await supabase
          .from('applications')
          .select(`*, posts (*), staff_categories (*), fee_receipts (*)`)
          .or(`application_no.ilike.%${clean}%,contact_no.ilike.%${clean}%,candidate_name.ilike.%${clean}%`)
          .limit(20);

        if (fbErr) throw fbErr;
        return NextResponse.json({ candidates: fallbackCandidates || [], count: fallbackCandidates?.length || 0 });
      }
      throw error;
    }

    // Enhance response with fee status classification
    const enriched = (candidates || []).map((cand) => {
      const isRemotePending = cand.source_type === 'ONLINE_REMOTE' && cand.registration_status === 'DRAFT_PENDING_FEE';
      const prescribedFee = cand.staff_categories?.application_fee ?? 200;
      return {
        ...cand,
        is_remote_pending_fee: isRemotePending,
        prescribed_fee: prescribedFee
      };
    });

    return NextResponse.json({
      candidates: enriched,
      count: enriched.length,
      query: clean
    });
  } catch (err: any) {
    console.error('Error during front desk candidate lookup:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to complete candidate lookup' },
      { status: 500 }
    );
  }
}
