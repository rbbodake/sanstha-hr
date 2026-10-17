// ─── Candidate Session (tab-scoped, post-submission access token) ────────────
// This is NOT a real cryptographic token — it is a lightweight ownership claim
// that binds a browser tab to the application just submitted. It prevents
// casual IDOR (typing in someone else's app number) without requiring a login.
// Real security is enforced by Supabase RLS and row-level ownership at the DB.

export const CANDIDATE_SESSION_KEY = 'smarthr_candidate_session';

export interface CandidateSession {
  appNo: string;       // e.g. 2026-OCT-00001
  appId: string;       // UUID of the applications row
  contactNo: string;   // full mobile for mobile-last4 verification
  submittedAt: string; // ISO timestamp of form submission
  token: string;       // lightweight proof-of-submission token
}

/** Build and persist a candidate session immediately after form submission */
export function setCandidateSession(appNo: string, appId: string, contactNo: string): void {
  if (typeof window === 'undefined') return;
  const session: CandidateSession = {
    appNo,
    appId,
    contactNo,
    submittedAt: new Date().toISOString(),
    token: btoa(`${appId}:${appNo}:${Date.now()}`),
  };
  try {
    sessionStorage.setItem(CANDIDATE_SESSION_KEY, JSON.stringify(session));
  } catch {
    // sessionStorage unavailable — silent fail (user will be asked to re-verify)
  }
}

/** Read and parse the active candidate session. Returns null if none / invalid. */
export function getCandidateSession(): CandidateSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(CANDIDATE_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CandidateSession;
    if (!parsed.appNo || !parsed.appId || !parsed.token) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Clear the candidate session (e.g. on navigating away from the candidate flow) */
export function clearCandidateSession(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(CANDIDATE_SESSION_KEY);
  } catch {}
}

/** Returns true if the current session owns the given application number */
export function sessionOwns(appNo: string): boolean {
  const session = getCandidateSession();
  return session?.appNo === appNo;
}

/** LOCKED statuses — uploads and edits are not permitted after these */
export const LOCKED_STATUSES = [
  'submitted',          // candidate has formally verified & submitted — no more edits
  'verified_approved',
  'fee_paid',
  'forwarded_to_institute',
  'ready_for_physical_interview',
  'interview_scheduled',
  'selected_recommended',
  'management_approved',
  'institute_reviewed',
  'hold',
  'rejected',
  'cancelled',
];

export function isApplicationLocked(status: string): boolean {
  return LOCKED_STATUSES.includes(status);
}
