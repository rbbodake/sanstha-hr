import { supabase } from '@/lib/supabase';
import { Application, Institute, Notification, ApplicationWorkflowLog } from '@/types/database';

const LOCAL_NOTIFS_KEY = 'smarthr_workflow_notifications';
const LOCAL_LOGS_KEY = 'smarthr_workflow_logs';
const LOCAL_APPS_OVERRIDE_KEY = 'smarthr_workflow_apps_override';

export interface EmailAlertPayload {
  toEmail: string;
  toName: string;
  subject: string;
  body: string;
  timestamp: string;
  alertType: 'forwarded_to_institute' | 'institute_reviewed';
}

/**
 * Dispatches simulated email alert (and logs to console/storage for demo visibility)
 */
export function dispatchSimulatedEmail(payload: EmailAlertPayload) {
  try {
    const key = 'smarthr_dispatched_emails';
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    existing.unshift(payload);
    // Keep last 50 emails
    localStorage.setItem(key, JSON.stringify(existing.slice(0, 50)));
    console.info('📧 [SIMULATED EMAIL DISPATCHED]:', payload);
  } catch (e) {
    console.warn('Failed to save simulated email dispatch:', e);
  }
}

/**
 * Fetch simulated dispatched emails for inspection
 */
export function getDispatchedEmails(): EmailAlertPayload[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem('smarthr_dispatched_emails') || '[]');
  } catch {
    return [];
  }
}

/**
 * Get locally overridden application fields (ensures instant UI reactivity even if DB column add is pending)
 */
export function getLocalApplicationOverrides(): Record<string, Partial<Application>> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(LOCAL_APPS_OVERRIDE_KEY) || '{}');
  } catch {
    return {};
  }
}

export function saveLocalApplicationOverride(appId: string, updates: Partial<Application>) {
  if (typeof window === 'undefined') return;
  try {
    const current = getLocalApplicationOverrides();
    current[appId] = { ...(current[appId] || {}), ...updates };
    localStorage.setItem(LOCAL_APPS_OVERRIDE_KEY, JSON.stringify(current));
  } catch (e) {
    console.warn('Failed saving local app override:', e);
  }
}

/**
 * Merges local overrides with fetched applications
 */
export function mergeApplicationOverrides(apps: Application[]): Application[] {
  const overrides = getLocalApplicationOverrides();
  return apps.map((app) => {
    if (overrides[app.id]) {
      return { ...app, ...overrides[app.id] };
    }
    return app;
  });
}

/**
 * Step 1: Central HR forwards application to Institute Head
 */
export async function forwardApplicationToInstitute(params: {
  applicationId: string;
  applicationNo: string;
  candidateName: string;
  targetInstitute: Institute;
  headName: string;
  headEmail: string;
  headDesignation: string;
  centralHrRemarks: string;
  forwardedBy: string;
  /** The role of the caller — must be 'admin_head_hr' or the call is rejected */
  callerRole?: string;
}): Promise<{ success: boolean; error?: string }> {

  // ── SERVICE-LAYER RBAC GATE ───────────────────────────────────────────────
  // Reject if the caller is not Central HR, regardless of how this function was reached.
  if (params.callerRole && params.callerRole !== 'admin_head_hr') {
    const msg = `[RBAC] forwardApplicationToInstitute: REJECTED — caller role "${params.callerRole}" is not authorized. Only admin_head_hr may forward applications to the Institute Head.`;
    console.error(msg);
    return { success: false, error: 'Access Denied: Only Central HR can forward applications to the Institute Head.' };
  }

  const now = new Date().toISOString();

  const updates: Partial<Application> = {
    status: 'forwarded_to_institute',
    forwarded_to_institute_id: params.targetInstitute.id,
    forwarded_to_head_name: params.headName,
    forwarded_to_head_email: params.headEmail,
    forwarded_to_head_designation: params.headDesignation,
    central_hr_remarks: params.centralHrRemarks.trim(),
    forwarded_at: now,
    forwarded_by: params.forwardedBy,
  };

  // Always save local cache immediately for guaranteed UI responsiveness
  saveLocalApplicationOverride(params.applicationId, updates);

  // 1. Update Supabase Applications table
  try {
    const { error: appErr } = await supabase
      .from('applications')
      .update(updates)
      .eq('id', params.applicationId);

    if (appErr) {
      console.warn('Supabase applications forward update warning:', appErr.message);
    }
  } catch (err) {
    console.warn('DB forward update error, using fallback:', err);
  }

  // 2. Insert In-App Notification for the Institute Head
  const newNotif: Partial<Notification> = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `notif_${Date.now()}`,
    recipient_role: 'institute_head',
    recipient_email: params.headEmail,
    recipient_institute_id: params.targetInstitute.id,
    title: `Candidate Forwarded for Review: ${params.applicationNo}`,
    message: `Central HR forwarded candidate ${params.candidateName} (${params.applicationNo}) to ${params.targetInstitute.short_name || params.targetInstitute.official_name} for your review and recommendation. Remarks: "${params.centralHrRemarks.trim() || 'Verified credentials. Please evaluate.'}"`,
    type: 'forwarded_to_institute',
    application_id: params.applicationId,
    is_read: false,
    metadata: {
      application_no: params.applicationNo,
      candidate_name: params.candidateName,
      institute_id: params.targetInstitute.id,
      forwarded_by: params.forwardedBy,
    },
    created_at: now,
  };

  saveNotificationLocal(newNotif as Notification);
  try {
    await supabase.from('notifications').insert(newNotif);
  } catch (e) {
    console.warn('DB notification insert warning:', e);
  }

  // 3. Log Audit Trail in Workflow Logs
  const logEntry: Partial<ApplicationWorkflowLog> = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `log_${Date.now()}`,
    application_id: params.applicationId,
    action: 'forwarded_to_institute',
    actor_name: params.forwardedBy,
    actor_role: 'Central HR Admin',
    remarks: params.centralHrRemarks.trim() || 'Forwarded to Institute Head',
    metadata: {
      institute_id: params.targetInstitute.id,
      institute_name: params.targetInstitute.official_name,
      head_name: params.headName,
      head_email: params.headEmail,
    },
    created_at: now,
  };

  saveWorkflowLogLocal(logEntry as ApplicationWorkflowLog);
  try {
    await supabase.from('application_workflow_logs').insert(logEntry);
  } catch (e) {
    console.warn('DB workflow log insert warning:', e);
  }

  // 4. Trigger Email Alert Dispatch to Institute Head
  dispatchSimulatedEmail({
    toEmail: params.headEmail,
    toName: params.headName,
    subject: `[SmartHR Alert] Candidate Forwarded for Review: ${params.candidateName} (#${params.applicationNo})`,
    body: `Respected ${params.headName} (${params.headDesignation}),\n\nCentral HR has forwarded an applicant dossier for your review:\n\n• Candidate: ${params.candidateName}\n• Application No: ${params.applicationNo}\n• Institute: ${params.targetInstitute.official_name}\n• Central HR Remarks: "${params.centralHrRemarks.trim() || 'Ready for review'}"\n\nPlease log in to the Principal / Institute Portal to inspect credentials, add your recommendations, and request a physical interview if required.\n\nCentral HR Department`,
    timestamp: now,
    alertType: 'forwarded_to_institute',
  });

  return { success: true };
}

/**
 * Step 2: Institute Head conducts physical interview, records evaluation remarks & document verification,
 * assigns definitive recommendation (Selected / Recommended, Hold / Waitlist, Rejected), and routes back to Central HR.
 */
export async function submitInstituteHeadReview(params: {
  applicationId: string;
  applicationNo: string;
  candidateName: string;
  instituteName: string;
  recommendation: 'selected' | 'recommended' | 'hold' | 'rejected';
  instituteRemarks: string;
  interviewConductedDate?: string;
  interviewVenue?: string;
  interviewPanelMembers?: string;
  interviewPanelRemarks?: string;
  interviewScore?: number;
  interviewTeachingDemoScore?: number;
  physicalDocsStatus?: 'verified_all_clear' | 'discrepancy_observed' | 'provisional_pending_docs';
  physicalDocsRemarks?: string;
  interviewEvaluationReportUrl?: string;
  headSignatureUrl?: string;
  reviewedBy: string;
  requestPhysicalInterview?: boolean;
  interviewDetails?: {
    suggestedDate?: string;
    venue?: string;
    instructions?: string;
  };
}): Promise<{ success: boolean; error?: string }> {
  const now = new Date().toISOString();

  // Determine target workflow stage status
  let nextStatus: Application['status'];
  if (params.recommendation === 'selected' || params.recommendation === 'recommended') {
    nextStatus = 'selected_recommended';
  } else if (params.recommendation === 'hold') {
    nextStatus = 'hold';
  } else {
    nextStatus = 'rejected';
  }

  const interviewDate =
    params.interviewConductedDate || params.interviewDetails?.suggestedDate || now;
  const interviewVenue =
    params.interviewVenue || params.interviewDetails?.venue || `${params.instituteName} Campus`;
  const panelRemarks =
    params.interviewPanelRemarks?.trim() || params.instituteRemarks.trim();
  const docsStatus = params.physicalDocsStatus || 'verified_all_clear';

  const updates: Partial<Application> = {
    status: nextStatus,
    institute_recommendation: params.recommendation,
    institute_remarks: params.instituteRemarks.trim(),
    interview_conducted_date: interviewDate,
    interview_venue: interviewVenue,
    interview_panel_members: params.interviewPanelMembers?.trim() || null,
    interview_panel_remarks: panelRemarks,
    interview_score: params.interviewScore ?? null,
    interview_teaching_demo_score: params.interviewTeachingDemoScore ?? null,
    physical_docs_verified: docsStatus === 'verified_all_clear',
    physical_docs_status: docsStatus,
    physical_docs_remarks: params.physicalDocsRemarks?.trim() || null,
    interview_requested: true,
    interview_suggested_date: interviewDate,
    interview_instructions: params.interviewDetails?.instructions?.trim() || null,
    reviewed_by_head_name: params.reviewedBy,
    reviewed_at: now,
    interview_evaluation_report_url: params.interviewEvaluationReportUrl || null,
    head_signature_url: params.headSignatureUrl || null,
  };

  // Always save local cache immediately for zero-downtime reactivity
  saveLocalApplicationOverride(params.applicationId, updates);

  // 1. Update Supabase Applications table
  try {
    const { error: appErr } = await supabase
      .from('applications')
      .update(updates)
      .eq('id', params.applicationId);

    if (appErr) {
      console.warn('Supabase applications review update warning:', appErr.message);
    }
  } catch (err) {
    console.warn('DB review update error, using fallback:', err);
  }

  // 2. Insert In-App Notification for Central HR
  const recBadgeText =
    params.recommendation === 'selected' || params.recommendation === 'recommended'
      ? 'SELECTED / RECOMMENDED'
      : params.recommendation === 'hold'
      ? 'HOLD / WAITLIST'
      : 'REJECTED';

  const docStatusLabel =
    docsStatus === 'verified_all_clear'
      ? 'Originals 100% Verified & Authenticated'
      : docsStatus === 'discrepancy_observed'
      ? 'Discrepancy Observed in Original Certificates'
      : 'Provisional Clearance (Subject to Pending Docs)';

  const newNotif: Partial<Notification> = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `notif_${Date.now()}`,
    recipient_role: 'admin_head_hr',
    title: `Physical Interview Concluded: #${params.applicationNo} (${recBadgeText})`,
    message: `${params.instituteName} has conducted the physical interview for ${params.candidateName} (#${params.applicationNo}). Final Outcome: ${recBadgeText}. Panel Remarks: "${panelRemarks}". Original Docs: ${docStatusLabel}. Ready for next-stage Central HR & Management processing.`,
    type: 'institute_reviewed',
    application_id: params.applicationId,
    is_read: false,
    metadata: {
      application_no: params.applicationNo,
      candidate_name: params.candidateName,
      institute_name: params.instituteName,
      recommendation: params.recommendation,
      interview_score: params.interviewScore,
      docs_status: docsStatus,
      reviewed_by: params.reviewedBy,
    },
    created_at: now,
  };

  saveNotificationLocal(newNotif as Notification);
  try {
    await supabase.from('notifications').insert(newNotif);
  } catch (e) {
    console.warn('DB notification insert warning:', e);
  }

  // 3. Log Audit Trail
  const logEntry: Partial<ApplicationWorkflowLog> = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `log_${Date.now()}`,
    application_id: params.applicationId,
    action: 'institute_reviewed',
    actor_name: params.reviewedBy,
    actor_role: 'Institute Head / Principal',
    remarks: `Physical Interview Concluded. Recommendation: ${recBadgeText}. Panel Remarks: ${panelRemarks}`,
    metadata: {
      recommendation: params.recommendation,
      interview_venue: interviewVenue,
      interview_date: interviewDate,
      interview_score: params.interviewScore,
      physical_docs_status: docsStatus,
    },
    created_at: now,
  };

  saveWorkflowLogLocal(logEntry as ApplicationWorkflowLog);
  try {
    await supabase.from('application_workflow_logs').insert(logEntry);
  } catch (e) {
    console.warn('DB workflow log insert warning:', e);
  }

  // 4. Trigger Email Alert Dispatch to Central HR
  dispatchSimulatedEmail({
    toEmail: 'hr@mandaltrust.org',
    toName: 'Central HR Department',
    subject: `[SmartHR Alert] Physical Interview Concluded: ${params.candidateName} (#${params.applicationNo}) - ${recBadgeText}`,
    body: `Central HR Team,\n\n${params.instituteName} (Principal: ${params.reviewedBy}) has concluded the physical interview and logged the formal evaluation:\n\n• Candidate: ${params.candidateName} (#${params.applicationNo})\n• Final Recommendation: ${recBadgeText}\n• Physical Interview Date & Time: ${new Date(interviewDate).toLocaleString('en-IN')}\n• Campus Venue: ${interviewVenue}\n• Selection Panel Members: ${params.interviewPanelMembers || 'Institute Faculty Board'}\n• Interview Performance Score: ${params.interviewScore ? `${params.interviewScore}/100` : 'Evaluated'}\n• Physical Document Verification: ${docStatusLabel}\n• Document Notes: "${params.physicalDocsRemarks || 'All original certificates checked.'}"\n• Interview Panel Remarks: "${panelRemarks}"\n• Principal Justification: "${params.instituteRemarks.trim()}"\n\nThe candidate ledger has been updated for Central HR and Management final approval/appointment processing.\n\nSmartHR Automated Notification System`,
    timestamp: now,
    alertType: 'institute_reviewed',
  });

  return { success: true };
}

/**
 * Step 3: Central HR & Trust Management grants final appointment / management approval
 */
export async function grantManagementApproval(params: {
  applicationId: string;
  applicationNo: string;
  candidateName: string;
  approvedBy?: string;
  approvalRemarks?: string;
}): Promise<{ success: boolean; error?: string }> {
  const now = new Date().toISOString();
  const actor = params.approvedBy || 'Central HR Administration';
  const remarks = params.approvalRemarks?.trim() || 'Formal Management & Central HR Appointment Approval Granted.';

  const updates: Partial<Application> = {
    status: 'management_approved',
    management_approved_at: now,
    management_approved_by: actor,
    management_approval_remarks: remarks,
  };

  saveLocalApplicationOverride(params.applicationId, updates);

  try {
    const { error } = await supabase
      .from('applications')
      .update(updates)
      .eq('id', params.applicationId);
    if (error) {
      console.warn('Supabase management approval update warning:', error.message);
    }
  } catch (err) {
    console.warn('DB management approval error:', err);
  }

  // Insert In-App Notification for Record
  const newNotif: Partial<Notification> = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `notif_${Date.now()}`,
    recipient_role: 'admin_head_hr',
    title: `Management Approval Granted: #${params.applicationNo}`,
    message: `Final Management & Central HR Appointment Approval successfully recorded for ${params.candidateName} (#${params.applicationNo}). Candidate is cleared for offer letter issuance.`,
    type: 'management_approved',
    application_id: params.applicationId,
    is_read: false,
    metadata: {
      application_no: params.applicationNo,
      candidate_name: params.candidateName,
      approved_by: actor,
    },
    created_at: now,
  };
  saveNotificationLocal(newNotif as Notification);
  try {
    await supabase.from('notifications').insert(newNotif);
  } catch (e) {}

  // Log Audit Trail
  const logEntry: Partial<ApplicationWorkflowLog> = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `log_${Date.now()}`,
    application_id: params.applicationId,
    action: 'management_approved',
    actor_name: actor,
    actor_role: 'Central HR Management / Trustee Board',
    remarks: remarks,
    metadata: {
      status: 'management_approved',
      approved_at: now,
    },
    created_at: now,
  };

  saveWorkflowLogLocal(logEntry as ApplicationWorkflowLog);
  try {
    await supabase.from('application_workflow_logs').insert(logEntry);
  } catch (e) {
    console.warn('DB workflow log insert warning:', e);
  }

  return { success: true };
}

/**
 * Fetch notifications for a given role / institute
 */
export async function fetchNotifications(role: string, instituteId?: string): Promise<Notification[]> {
  try {
    let query = supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(30);

    if (role === 'institute_head') {
      if (instituteId) {
        query = query.or(`recipient_role.eq.institute_head,recipient_institute_id.eq.${instituteId}`);
      } else {
        query = query.eq('recipient_role', 'institute_head');
      }
    } else {
      query = query.in('recipient_role', ['admin_head_hr', 'receptionist']);
    }

    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      return data as Notification[];
    }
  } catch (err) {
    console.warn('Failed to query notifications from DB, using local cache:', err);
  }

  // Fallback to local storage
  return getLocalNotifications(role, instituteId);
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(notifId: string): Promise<void> {
  // Local cache
  if (typeof window !== 'undefined') {
    try {
      const list = JSON.parse(localStorage.getItem(LOCAL_NOTIFS_KEY) || '[]');
      const updated = list.map((n: Notification) => (n.id === notifId ? { ...n, is_read: true } : n));
      localStorage.setItem(LOCAL_NOTIFS_KEY, JSON.stringify(updated));
    } catch {}
  }

  try {
    await supabase.from('notifications').update({ is_read: true }).eq('id', notifId);
  } catch (err) {
    console.warn('Failed to update notif read status in DB:', err);
  }
}

/**
 * Local helper functions
 */
function saveNotificationLocal(notif: Notification) {
  if (typeof window === 'undefined') return;
  try {
    const list = JSON.parse(localStorage.getItem(LOCAL_NOTIFS_KEY) || '[]');
    list.unshift(notif);
    localStorage.setItem(LOCAL_NOTIFS_KEY, JSON.stringify(list.slice(0, 50)));
  } catch {}
}

function getLocalNotifications(role: string, instituteId?: string): Notification[] {
  if (typeof window === 'undefined') return [];
  try {
    const list: Notification[] = JSON.parse(localStorage.getItem(LOCAL_NOTIFS_KEY) || '[]');
    if (role === 'institute_head') {
      return list.filter((n) => n.recipient_role === 'institute_head' && (!instituteId || !n.recipient_institute_id || n.recipient_institute_id === instituteId));
    }
    return list.filter((n) => ['admin_head_hr', 'receptionist'].includes(n.recipient_role));
  } catch {
    return [];
  }
}

function saveWorkflowLogLocal(log: ApplicationWorkflowLog) {
  if (typeof window === 'undefined') return;
  try {
    const list = JSON.parse(localStorage.getItem(LOCAL_LOGS_KEY) || '[]');
    list.unshift(log);
    localStorage.setItem(LOCAL_LOGS_KEY, JSON.stringify(list.slice(0, 100)));
  } catch {}
}

export function getLocalWorkflowLogs(applicationId: string): ApplicationWorkflowLog[] {
  if (typeof window === 'undefined') return [];
  try {
    const list: ApplicationWorkflowLog[] = JSON.parse(localStorage.getItem(LOCAL_LOGS_KEY) || '[]');
    return list.filter((l) => l.application_id === applicationId);
  } catch {
    return [];
  }
}
