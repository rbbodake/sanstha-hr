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

export interface ManagementApprovalParams {
  applicationId: string;
  applicationNo: string;
  candidateName: string;
  targetInstituteId?: string;
  targetInstituteName?: string;
  headName?: string;
  headEmail?: string;
  approvedBy?: string;
  approvalRemarks?: string;
  joiningDate?: string;
  mandatoryBondDetails?: string;
  confirmedDesignation?: string;
  payScale?: string;
  basicPay?: number;
  agreedTotalSalary: number; // Compulsory!
  appointmentInstructions?: string;
  pushToInstitutePortal?: boolean;
  pushToAppointmentSection?: boolean;
  callerRole?: string;
}

/**
 * Step 3: Central HR & Trust Management grants final appointment / management approval
 * Records structured administrative instructions (joining date, bond, confirmed designation, pay, compulsory salary)
 * and securely propagates data downstream to Institute Portal & Appointment Order Generation Section.
 */
export async function grantManagementApproval(params: ManagementApprovalParams): Promise<{ success: boolean; error?: string }> {
  // Service-level validation: Agreed Total Salary Amount is COMPULSORY
  if (
    params.agreedTotalSalary === undefined ||
    params.agreedTotalSalary === null ||
    isNaN(Number(params.agreedTotalSalary)) ||
    Number(params.agreedTotalSalary) <= 0
  ) {
    return {
      success: false,
      error: 'Agreed Total Salary Amount is compulsory and must be a valid amount greater than 0.',
    };
  }

  const now = new Date().toISOString();
  const actor = params.approvedBy || 'Central HR Management';
  const remarks = params.approvalRemarks?.trim() || 'Formal Management & Central HR Appointment Approval Granted.';
  const agreedSalary = Number(params.agreedTotalSalary);
  const designation = params.confirmedDesignation?.trim() || 'Confirmed Faculty / Staff';
  const joiningDate = params.joiningDate || null;
  const bondDetails = params.mandatoryBondDetails?.trim() || null;
  const payScale = params.payScale?.trim() || null;
  const basicPay = params.basicPay != null && !isNaN(Number(params.basicPay)) ? Number(params.basicPay) : null;
  const instructions = params.appointmentInstructions?.trim() || null;

  const pushToInstitute = params.pushToInstitutePortal !== false;
  const pushToApptSection = params.pushToAppointmentSection !== false;

  const updates: Partial<Application> = {
    status: 'management_approved',
    management_approved_at: now,
    management_approved_by: actor,
    management_approval_remarks: remarks,
    joining_date: joiningDate,
    mandatory_bond_details: bondDetails,
    confirmed_designation: designation,
    pay_scale: payScale,
    basic_pay: basicPay,
    agreed_total_salary: agreedSalary,
    appointment_instructions: instructions,
    appointment_order_workflow_initiated: pushToApptSection,
    appointment_order_status: 'initiated',
    pushed_to_institute_portal: pushToInstitute,
    pushed_to_appointment_section: pushToApptSection,
    downstream_pushed_at: now,
    downstream_pushed_by: actor,
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

  // 1. In-App Notification for Central HR / Record
  const hrNotif: Partial<Notification> = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `notif_${Date.now()}_hr`,
    recipient_role: 'admin_head_hr',
    title: `Management Approval Granted: #${params.applicationNo}`,
    message: `Final Management & Central HR Appointment Approval successfully recorded for ${params.candidateName} (#${params.applicationNo}) as ${designation}. Agreed Total Salary: ₹${agreedSalary.toLocaleString('en-IN')}. Date of Joining: ${joiningDate || 'Scheduled'}.`,
    type: 'management_approved',
    application_id: params.applicationId,
    is_read: false,
    metadata: {
      application_no: params.applicationNo,
      candidate_name: params.candidateName,
      approved_by: actor,
      agreed_total_salary: agreedSalary,
      confirmed_designation: designation,
      joining_date: joiningDate,
    },
    created_at: now,
  };
  saveNotificationLocal(hrNotif as Notification);
  try {
    await supabase.from('notifications').insert(hrNotif);
  } catch (e) {}

  // 2. Downstream Propagation -> Institute Portal Notification
  if (pushToInstitute) {
    const instNotif: Partial<Notification> = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `notif_${Date.now()}_inst`,
      recipient_role: 'institute_head',
      recipient_email: params.headEmail,
      recipient_institute_id: params.targetInstituteId,
      title: `Appointment Approval Granted: #${params.applicationNo} (${params.candidateName})`,
      message: `Formal Management & Central HR Appointment Approval Granted for ${params.candidateName} (#${params.applicationNo}). Confirmed Designation: ${designation}. Date of Joining: ${joiningDate || 'As per order'}. Agreed Total Salary: ₹${agreedSalary.toLocaleString('en-IN')}. Bond / Compliance: ${bondDetails || 'Standard'}. Detailed instructions rendered in candidate dossier.`,
      type: 'management_approved',
      application_id: params.applicationId,
      is_read: false,
      metadata: {
        application_no: params.applicationNo,
        candidate_name: params.candidateName,
        confirmed_designation: designation,
        joining_date: joiningDate,
        agreed_total_salary: agreedSalary,
        mandatory_bond_details: bondDetails,
        appointment_instructions: instructions,
        approved_by: actor,
      },
      created_at: now,
    };
    saveNotificationLocal(instNotif as Notification);
    try {
      await supabase.from('notifications').insert(instNotif);
    } catch (e) {}
  }

  // 3. Downstream Propagation -> Appointment & Recruitment Section Notification
  if (pushToApptSection) {
    const apptNotif: Partial<Notification> = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `notif_${Date.now()}_appt`,
      recipient_role: 'admin_head_hr',
      title: `Initiate Appointment Order Generation: #${params.applicationNo} (${params.candidateName})`,
      message: `Official appointment order generation workflow initiated for ${params.candidateName} (#${params.applicationNo}) as ${designation}. Date of Joining: ${joiningDate || 'Scheduled'}. Basic Pay: ₹${basicPay != null ? basicPay.toLocaleString('en-IN') : 'N/A'}, Total Salary: ₹${agreedSalary.toLocaleString('en-IN')}. Bond Requirements: ${bondDetails || 'Standard Compliance'}. Ready for official order drafting.`,
      type: 'appointment_order_initiated',
      application_id: params.applicationId,
      is_read: false,
      metadata: {
        application_no: params.applicationNo,
        candidate_name: params.candidateName,
        confirmed_designation: designation,
        joining_date: joiningDate,
        agreed_total_salary: agreedSalary,
        basic_pay: basicPay,
        pay_scale: payScale,
        mandatory_bond_details: bondDetails,
        appointment_instructions: instructions,
        workflow_initiated: true,
      },
      created_at: now,
    };
    saveNotificationLocal(apptNotif as Notification);
    try {
      await supabase.from('notifications').insert(apptNotif);
    } catch (e) {}
  }

  // 4. Log Complete Audit Trail
  const logEntry: Partial<ApplicationWorkflowLog> = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `log_${Date.now()}`,
    application_id: params.applicationId,
    action: 'management_approved',
    actor_name: actor,
    actor_role: 'Central HR Management / Trustee Board',
    remarks: `Formal Management Approval Granted & Propagated Downstream. Designation: ${designation}. Total Salary: ₹${agreedSalary.toLocaleString('en-IN')}. Date of Joining: ${joiningDate || 'TBD'}. Bond: ${bondDetails || 'Standard'}.`,
    metadata: {
      status: 'management_approved',
      approved_at: now,
      confirmed_designation: designation,
      joining_date: joiningDate,
      agreed_total_salary: agreedSalary,
      pay_scale: payScale,
      basic_pay: basicPay,
      mandatory_bond_details: bondDetails,
      appointment_instructions: instructions,
      pushed_to_institute_portal: pushToInstitute,
      pushed_to_appointment_section: pushToApptSection,
    },
    created_at: now,
  };

  saveWorkflowLogLocal(logEntry as ApplicationWorkflowLog);
  try {
    await supabase.from('application_workflow_logs').insert(logEntry);
  } catch (e) {
    console.warn('DB workflow log insert warning:', e);
  }

  // 5. Trigger Simulated Email Dispatches to Downstream Parties
  if (params.headEmail) {
    dispatchSimulatedEmail({
      toEmail: params.headEmail,
      toName: params.headName || 'Institute Head / Principal',
      subject: `[SmartHR Official] Formal Appointment Approval Granted: ${params.candidateName} (#${params.applicationNo})`,
      body: `Respected ${params.headName || 'Principal'},\n\nFormal Management & Central HR Appointment Approval has been granted for the selected candidate:\n\n• Candidate: ${params.candidateName} (#${params.applicationNo})\n• Confirmed Designation: ${designation}\n• Expected Date of Joining: ${joiningDate || 'As per appointment order'}\n• Pay Scale / Basic Pay: ${payScale || 'Standard'} / Basic ₹${basicPay != null ? basicPay.toLocaleString('en-IN') : 'N/A'}\n• Agreed Total Salary Amount: ₹${agreedSalary.toLocaleString('en-IN')}\n• Mandatory Bond Requirements: ${bondDetails || 'Standard Compliance'}\n• Instructions: "${instructions || remarks}"\n\nThe candidate dossier in your Institute Portal has been updated with these complete instructions.\n\nCentral HR Department`,
      timestamp: now,
      alertType: 'forwarded_to_institute',
    });
  }

  dispatchSimulatedEmail({
    toEmail: 'appointment.orders@mandaltrust.org',
    toName: 'Appointment Order Section',
    subject: `[SmartHR Action Required] Initiate Appointment Order: ${params.candidateName} (#${params.applicationNo}) - ${designation}`,
    body: `Appointment & Recruitment Section,\n\nCandidate ${params.candidateName} (#${params.applicationNo}) has received formal Central HR & Management approval. Please initiate appointment order drafting with the approved terms:\n\n• Designation: ${designation}\n• Joining Date: ${joiningDate || 'Immediate / As per schedule'}\n• Basic Pay: ₹${basicPay != null ? basicPay.toLocaleString('en-IN') : 'N/A'}\n• Agreed Total Salary: ₹${agreedSalary.toLocaleString('en-IN')}\n• Mandatory Bond Submissions: ${bondDetails || 'Standard service bond'}\n• Special Instructions: "${instructions || remarks}"\n\nCentral HR ERP System`,
    timestamp: now,
    alertType: 'forwarded_to_institute',
  });

  return { success: true };
}

/**
 * Interface Action: Securely push / re-sync complete status and dossier update to downstream modules
 * (Institute Portal & Appointment Order Generation Section)
 */
export async function pushDossierDownstream(params: {
  application: Application;
  pushedBy?: string;
  targetInstituteName?: string;
  headName?: string;
  headEmail?: string;
}): Promise<{ success: boolean; error?: string }> {
  const app = params.application;
  const now = new Date().toISOString();
  const actor = params.pushedBy || 'Central HR Admin';

  const updates: Partial<Application> = {
    pushed_to_institute_portal: true,
    pushed_to_appointment_section: true,
    appointment_order_workflow_initiated: true,
    appointment_order_status: app.appointment_order_status || 'initiated',
    downstream_pushed_at: now,
    downstream_pushed_by: actor,
  };

  saveLocalApplicationOverride(app.id, updates);

  try {
    await supabase.from('applications').update(updates).eq('id', app.id);
  } catch (err) {
    console.warn('DB push update warning:', err);
  }

  // 1. Notify Institute Portal
  const instNotif: Partial<Notification> = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `notif_${Date.now()}_sync_inst`,
    recipient_role: 'institute_head',
    recipient_email: params.headEmail || app.forwarded_to_head_email,
    recipient_institute_id: app.forwarded_to_institute_id,
    title: `Dossier Synchronized: Formal Approval for #${app.application_no} (${app.candidate_name})`,
    message: `Central HR has synchronized the latest appointment approval dossier for ${app.candidate_name} (#${app.application_no}). Confirmed Designation: ${app.confirmed_designation || 'Faculty'}. Joining Date: ${app.joining_date || 'As per order'}. Agreed Salary: ₹${(app.agreed_total_salary || 0).toLocaleString('en-IN')}.`,
    type: 'management_approved',
    application_id: app.id,
    is_read: false,
    created_at: now,
  };
  saveNotificationLocal(instNotif as Notification);
  try {
    await supabase.from('notifications').insert(instNotif);
  } catch (e) {}

  // 2. Notify Appointment Section
  const apptNotif: Partial<Notification> = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `notif_${Date.now()}_sync_appt`,
    recipient_role: 'admin_head_hr',
    title: `Appointment Order Workflow Active: #${app.application_no} (${app.candidate_name})`,
    message: `Appointment order generation workflow flagged and synchronized for ${app.candidate_name} (#${app.application_no}). Designation: ${app.confirmed_designation || 'Faculty'}. Total Salary: ₹${(app.agreed_total_salary || 0).toLocaleString('en-IN')}.`,
    type: 'appointment_order_initiated',
    application_id: app.id,
    is_read: false,
    created_at: now,
  };
  saveNotificationLocal(apptNotif as Notification);
  try {
    await supabase.from('notifications').insert(apptNotif);
  } catch (e) {}

  // 3. Log Audit
  const logEntry: Partial<ApplicationWorkflowLog> = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `log_${Date.now()}`,
    application_id: app.id,
    action: 'downstream_propagated',
    actor_name: actor,
    actor_role: 'Central HR Admin',
    remarks: `Pushed complete appointment instructions dossier downstream to Institute Portal and Appointment Order section.`,
    metadata: {
      downstream_pushed_at: now,
      confirmed_designation: app.confirmed_designation,
      agreed_total_salary: app.agreed_total_salary,
      joining_date: app.joining_date,
    },
    created_at: now,
  };
  saveWorkflowLogLocal(logEntry as ApplicationWorkflowLog);
  try {
    await supabase.from('application_workflow_logs').insert(logEntry);
  } catch (e) {}

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
    } else if (role === 'appointment_officer') {
      query = query.in('recipient_role', ['appointment_officer', 'admin_head_hr']);
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
    if (role === 'appointment_officer') {
      return list.filter((n) => ['appointment_officer', 'admin_head_hr'].includes(n.recipient_role));
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

/**
 * Helper to generate official Appointment Order Number
 */
export function generateAppointmentOrderNumber(appNo: string): string {
  const digits = appNo.replace(/[^0-9]/g, '');
  const seq = digits.length >= 4 ? digits.slice(-4) : digits.padStart(4, '0') || '1001';
  return `SBMSPM/APT/2026-27/${seq}`;
}

/**
 * Update downstream appointment order status and audit trail
 */
export async function updateAppointmentOrderStatus(params: {
  applicationId: string;
  applicationNo: string;
  candidateName: string;
  status: 'initiated' | 'pending_generation' | 'order_generated' | 'order_dispatched' | 'joined';
  appointmentOrderNo?: string;
  actorName?: string;
  actorRole?: string;
  remarks?: string;
}): Promise<{ success: boolean; error?: string }> {
  const now = new Date().toISOString();
  const actor = params.actorName || 'Central Appointment Section';
  const role = params.actorRole || 'appointment_officer';

  const updates: Partial<Application> = {
    appointment_order_status: params.status,
    downstream_pushed_at: now,
    downstream_pushed_by: actor,
  };

  saveLocalApplicationOverride(params.applicationId, updates);

  try {
    await supabase.from('applications').update(updates).eq('id', params.applicationId);
  } catch (e) {
    console.warn('DB updateAppointmentOrderStatus warning:', e);
  }

  const logEntry: Partial<ApplicationWorkflowLog> = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `log_${Date.now()}`,
    application_id: params.applicationId,
    action: 'appointment_order_status_updated',
    actor_name: actor,
    actor_role: role,
    notes: params.remarks || `Appointment order status changed to "${params.status}"${params.appointmentOrderNo ? ` (Order No: ${params.appointmentOrderNo})` : ''}.`,
    created_at: now,
  };

  saveWorkflowLogLocal(logEntry as ApplicationWorkflowLog);
  try {
    await supabase.from('application_workflow_logs').insert(logEntry);
  } catch (e) {}

  return { success: true };
}
