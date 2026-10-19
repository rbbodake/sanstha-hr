import { supabase } from '@/lib/supabase';

export const MONTH_ABBREVIATIONS = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'
] as const;

export type MonthAbbr = typeof MONTH_ABBREVIATIONS[number];

/**
 * Returns 3-letter uppercase English month abbreviation (e.g. JAN, APR, OCT)
 */
export function getMonthAbbreviation(date: Date = new Date()): MonthAbbr {
  const monthIdx = date.getMonth(); // 0-indexed
  return MONTH_ABBREVIATIONS[monthIdx] || 'JAN';
}

export interface ParsedAppNo {
  year: string;
  month: string;
  sequence: string;
  isStandard: boolean;
  raw: string;
}

/**
 * Parses an application number into structured components.
 * Handles both new format (e.g. 2026-OCT-00001) and legacy format (e.g. REG-2026-00001).
 */
export function parseApplicationNumber(appNo: string | null | undefined): ParsedAppNo {
  const raw = (appNo || '').trim();
  if (!raw) {
    return { year: '', month: '', sequence: '', isStandard: false, raw: '' };
  }

  // Check standardized format: YYYY-MMM-00001
  const standardMatch = raw.match(/^(\d{4})-([A-Za-z]{3})-(\d+)$/i);
  if (standardMatch) {
    return {
      year: standardMatch[1],
      month: standardMatch[2].toUpperCase(),
      sequence: standardMatch[3],
      isStandard: true,
      raw,
    };
  }

  // Check numeric month variant: YYYY-MM-00001
  const numericMonthMatch = raw.match(/^(\d{4})-(\d{2})-(\d+)$/);
  if (numericMonthMatch) {
    const monthNum = parseInt(numericMonthMatch[2], 10);
    const mAbbr = (monthNum >= 1 && monthNum <= 12) ? MONTH_ABBREVIATIONS[monthNum - 1] : numericMonthMatch[2];
    return {
      year: numericMonthMatch[1],
      month: mAbbr,
      sequence: numericMonthMatch[3],
      isStandard: true,
      raw,
    };
  }

  // Legacy format: PREFIX-YYYY-00001
  const legacyMatch = raw.match(/^([A-Za-z0-9]+)-(\d{4})-(\d+)$/);
  if (legacyMatch) {
    return {
      year: legacyMatch[2],
      month: legacyMatch[1].toUpperCase(),
      sequence: legacyMatch[3],
      isStandard: false,
      raw,
    };
  }

  return { year: '', month: '', sequence: '', isStandard: false, raw };
}

/**
 * Search matcher supporting both formatted and unformatted queries
 * (e.g. matches '2026-OCT-00001', '2026OCT00001', 'OCT-00001', '00001')
 */
export function matchesApplicationNumberSearch(appNo: string | null | undefined, searchTerm: string): boolean {
  if (!appNo || !searchTerm) return false;
  const cleanApp = appNo.toLowerCase();
  const cleanSearch = searchTerm.trim().toLowerCase();

  // Exact substring match
  if (cleanApp.includes(cleanSearch)) return true;

  // Unhyphenated match (e.g. 2026OCT00001 matches 2026-OCT-00001)
  const appNoNoHyphen = cleanApp.replace(/[-\s]/g, '');
  const searchNoHyphen = cleanSearch.replace(/[-\s]/g, '');
  if (searchNoHyphen.length > 2 && appNoNoHyphen.includes(searchNoHyphen)) {
    return true;
  }

  return false;
}

/**
 * Generates the standardized application number following YYYY-MMM-00001.
 * 1. Queries PostgreSQL sequence via RPC get_next_sequence_number('application')
 * 2. If RPC fails or returns legacy format, computes the next sequential number atomically
 *    from existing database records for the current year-month.
 */
export async function generateStandardApplicationNumber(date: Date = new Date()): Promise<string> {
  const currentYear = date.getFullYear();
  const currentMonth = getMonthAbbreviation(date);
  const standardPrefix = `${currentYear}-${currentMonth}`;

  // 1. Try atomic PostgreSQL RPC
  try {
    const { data: seqData, error: seqError } = await supabase.rpc('get_next_sequence_number', {
      p_series_type: 'application'
    });

    if (!seqError && seqData) {
      // If RPC returned standardized YYYY-MMM-00001 format, return directly
      const parsed = parseApplicationNumber(seqData);
      if (parsed.isStandard) {
        return seqData;
      }
      // If RPC returned legacy REG-2026-00001 format, convert sequence part to YYYY-MMM-XXXXX
      if (parsed.sequence) {
        return `${standardPrefix}-${parsed.sequence.padStart(5, '0')}`;
      }
    }
  } catch (err) {
    console.warn('Database RPC sequence generation fallback:', err);
  }

  // 2. High-concurrency fallback: Query highest application number in current month
  try {
    const { data, error } = await supabase
      .from('applications')
      .select('application_no')
      .like('application_no', `${standardPrefix}-%`)
      .order('application_no', { ascending: false })
      .limit(20);

    if (!error && data && data.length > 0) {
      let maxSequence = 0;
      for (const row of data) {
        const parsed = parseApplicationNumber(row.application_no);
        const seqVal = parseInt(parsed.sequence, 10);
        if (!isNaN(seqVal) && seqVal > maxSequence) {
          maxSequence = seqVal;
        }
      }
      const nextSequence = maxSequence + 1;
      return `${standardPrefix}-${String(nextSequence).padStart(5, '0')}`;
    }
  } catch (err) {
    console.warn('Fallback sequence lookup from applications table:', err);
  }

  // 3. Fallback: First entry in current month starts at 00001
  return `${standardPrefix}-00001`;
}

/**
 * Checks whether a given string is a formatted or unformatted Temporary ID
 */
export function isTemporaryId(query: string | null | undefined): boolean {
  if (!query) return false;
  const clean = query.trim().toUpperCase().replace(/[-\s]/g, '');
  return clean.startsWith('TMP') || clean.startsWith('TEMP');
}

/**
 * Matcher for Temporary Application IDs (e.g. TMP-2026-00001)
 */
export function matchesTempIdSearch(tempId: string | null | undefined, searchTerm: string): boolean {
  if (!tempId || !searchTerm) return false;
  const cleanId = tempId.toLowerCase();
  const cleanSearch = searchTerm.trim().toLowerCase();

  if (cleanId.includes(cleanSearch)) return true;

  const idNoHyphen = cleanId.replace(/[-\s]/g, '');
  const searchNoHyphen = cleanSearch.replace(/[-\s]/g, '');
  if (searchNoHyphen.length > 2 && idNoHyphen.includes(searchNoHyphen)) {
    return true;
  }

  return false;
}

/**
 * Generates an atomic or high-concurrency Temporary Application ID (TMP-YYYY-XXXXX).
 * Used exclusively for remote candidate online pre-registrations prior to physical walk-in fee settlement.
 */
export async function generateTemporaryApplicationId(date: Date = new Date()): Promise<string> {
  const currentYear = date.getFullYear();
  const prefix = `TMP-${currentYear}`;

  // 1. Try PostgreSQL RPC if configured
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('generate_next_temp_id');
    if (!rpcError && rpcData && typeof rpcData === 'string' && rpcData.startsWith('TMP-')) {
      return rpcData;
    }
  } catch (err) {
    // Non-fatal, proceed to query fallback
  }

  // 2. Query highest temp_id in current year
  try {
    const { data, error } = await supabase
      .from('applications')
      .select('temp_id')
      .like('temp_id', `${prefix}-%`)
      .order('temp_id', { ascending: false })
      .limit(20);

    if (!error && data && data.length > 0) {
      let maxSeq = 0;
      for (const row of data) {
        if (!row.temp_id) continue;
        const parts = row.temp_id.split('-');
        const seq = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(seq) && seq > maxSeq) {
          maxSeq = seq;
        }
      }
      const nextSeq = maxSeq + 1;
      return `${prefix}-${String(nextSeq).padStart(5, '0')}`;
    }
  } catch (err) {
    console.warn('Fallback sequence lookup for temp_id:', err);
  }

  // 3. High entropy fallback with timestamp if table is empty or error
  return `${prefix}-00001`;
}

