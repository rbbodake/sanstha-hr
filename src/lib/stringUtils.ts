/**
 * Smart String Utilities for Uniform Capitalization
 * 
 * Rules:
 * 1. Title Case for standard Names, Places, Address:
 *    - First letter of every word capitalized, remainder lowercase.
 *    - "RAHUL GANPAT PATIL" -> "Rahul Ganpat Patil"
 *    - "mumbai sub-district" -> "Mumbai Sub-District"
 *    - Handles special apostrophes/dashes (e.g. "D'souza", "O'Connor").
 * 
 * 2. Academic / Degree / Organization Title Case:
 *    - Capitalizes words, but preserves recognized and typed ALL-CAPS abbreviations
 *      (e.g., "MBA", "B.Tech", "M.Tech", "B.Sc", "M.Sc", "Ph.D", "B.Ed", "D.Ed", "ITI", "UGC", "AICTE", "DTE", "PCI").
 * 
 * 3. Email Sanitization:
 *    - Always strictly lowercase.
 * 
 * 4. PAN Sanitization:
 *    - Always strictly uppercase.
 */

// List of recognized academic and institutional abbreviations to preserve
const PRESERVED_ACRONYMS = new Set([
  'MBA', 'MMS', 'BBA', 'BMS', 'MCA', 'BCA',
  'B.TECH', 'M.TECH', 'B.E.', 'M.E.', 'B.SC', 'M.SC', 'B.A.', 'M.A.', 'B.COM', 'M.COM',
  'B.PHARM', 'M.PHARM', 'D.PHARM', 'PHARM.D',
  'BAMS', 'BHMS', 'MD', 'MS', 'MBBS', 'BDS',
  'B.ED', 'M.ED', 'D.ED', 'D.EL.ED', 'B.P.ED',
  'ITI', 'COPA', 'HSC', 'SSC', 'CBSE', 'ICSE', 'MSBTE', 'AICTE', 'DTE', 'UGC', 'PCI', 'NCTE',
  'NET', 'SET', 'GATE', 'PET', 'CSIR', 'JRF',
  'PH.D', 'PH.D.', 'USA', 'UK', 'II', 'III', 'IV'
]);

/**
 * Standard Title Case for Names, Addresses, Designations, Places.
 * Converts "RAHUL PATIL" or "rahul patil" -> "Rahul Patil"
 */
export function toTitleCase(str: string | null | undefined): string {
  if (!str) return '';
  const trimmed = str.trim();
  if (!trimmed) return '';

  return str.replace(/[A-Za-z\u00C0-\u024F]+(?:['’\-][A-Za-z\u00C0-\u024F]+)*/g, (word) => {
    // Check if word contains apostrophe (e.g. D'Souza, O'Connor)
    if (word.includes("'") || word.includes("’")) {
      const parts = word.split(/['’]/);
      return parts.map(p => p ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : '').join("'");
    }
    // Check if word contains hyphen (e.g. Hatkanangale-East)
    if (word.includes("-")) {
      const parts = word.split("-");
      return parts.map(p => p ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : '').join("-");
    }
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });
}

/**
 * Smart Title Case for Qualifications, Courses, and Organization Names.
 * Capitalizes words but preserves standard acronyms and uppercase degrees (MBA, B.Tech, Ph.D, ITI).
 */
export function toSmartTitleCase(str: string | null | undefined): string {
  if (!str) return '';
  const trimmed = str.trim();
  if (!trimmed) return '';

  return str.replace(/[A-Za-z0-9\.\&\/\-]+/g, (token) => {
    const upperToken = token.toUpperCase();
    // Preserve if known acronym
    if (PRESERVED_ACRONYMS.has(upperToken)) {
      return upperToken;
    }
    // If token already has mixed dots (e.g. B.Tech, M.Pharm, Ph.D), preserve case or normalize gracefully
    if (token.includes('.')) {
      return token.split('.').map(part => part ? (part.length <= 2 ? part.toUpperCase() : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()) : '').join('.');
    }
    // If user typed 2-4 uppercase characters without dots (e.g. CSE, AI, ML, VLSI, CAD, CAM, HR), keep as uppercase
    if (token.length >= 2 && token.length <= 4 && /^[A-Z]+$/.test(token)) {
      return token;
    }
    // Standard capitalization
    return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
  });
}

/**
 * Clean Email: always strictly lowercase
 */
export function toCleanEmail(str: string | null | undefined): string {
  if (!str) return '';
  return str.trim().toLowerCase();
}

/**
 * Clean PAN: always strictly uppercase
 */
export function toCleanPAN(str: string | null | undefined): string {
  if (!str) return '';
  return str.trim().toUpperCase();
}
