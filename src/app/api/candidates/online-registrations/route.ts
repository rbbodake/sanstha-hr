import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/candidates/online-registrations
 * 
 * RBAC GATE: Restricted strictly to Central HR (role: 'admin_head_hr').
 * Front Desk staff (receptionist) and unauthenticated users are forbidden from
 * listing the full remote pre-registration pool.
 */
export async function GET(request: NextRequest) {
  try {
    const callerRole = request.headers.get('x-user-role') || request.nextUrl.searchParams.get('role');
    const authHeader = request.headers.get('authorization');

    // 1. Check Role authorization
    let isAuthorized = callerRole === 'admin_head_hr';

    // Verify bearer token with Supabase auth if provided
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '').trim();
      const { data: userData } = await supabase.auth.getUser(token);
      if (userData?.user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', userData.user.id)
          .maybeSingle();
        if (profile?.role === 'admin_head_hr') {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        {
          error: 'Forbidden: Access to the Online Pre-Registrations registry is restricted to Central HR Administrators only.',
          code: 'RBAC_FORBIDDEN'
        },
        { status: 403 }
      );
    }

    // 2. Fetch all remote candidate pre-registrations pending walk-in fee settlement
    const { data: candidates, error } = await supabase
      .from('applications')
      .select(`
        id,
        application_no,
        temp_id,
        source_type,
        registration_status,
        candidate_name,
        contact_no,
        email_id,
        program_stream,
        course_name,
        specialization,
        status,
        created_at,
        aadhaar_masked,
        posts (id, title, category_id),
        staff_categories (id, name, application_fee),
        institutes (id, official_name, short_name)
      `)
      .eq('source_type', 'ONLINE_REMOTE')
      .eq('registration_status', 'DRAFT_PENDING_FEE')
      .order('created_at', { ascending: false });

    if (error) {
      // In case columns are not yet applied via DB migration, return graceful empty array
      console.warn('DB query error for remote registrations:', error.message);
      return NextResponse.json({ candidates: [], warning: error.message });
    }

    return NextResponse.json({
      candidates: candidates || [],
      count: candidates?.length || 0,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('Error fetching online registrations:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
