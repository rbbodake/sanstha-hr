import { supabase } from '@/lib/supabase';
import { InstituteStaffStrength, Post, InstituteCourse } from '@/types/database';

const STORAGE_PREFIX = 'smarthr_inst_staff_strength_';

/**
 * Real-time Variance Calculation Formula:
 * Variance = Available Staff Strength - Sanctioned Posts as per Apex Body
 * - Negative (< 0): Deficit (vacancies to recruit)
 * - Zero (0): Balanced (100% staff filled)
 * - Positive (> 0): Surplus (excess staff)
 */
export function calculateStaffVariance(available: number, sanctioned: number): number {
  return (Number(available) || 0) - (Number(sanctioned) || 0);
}

/**
 * Fetch staff strength mappings for a given institute.
 * Seamlessly queries Supabase table `institute_staff_strength`.
 * If table is not yet migrated in Supabase, falls back to browser storage.
 */
export async function fetchStaffStrength(
  instituteId: string,
  fallbackPosts: Post[] = [],
  fallbackCourses: InstituteCourse[] = []
): Promise<InstituteStaffStrength[]> {
  try {
    const { data, error } = await supabase
      .from('institute_staff_strength')
      .select('*, posts(*, staff_categories(*)), institute_courses(*)')
      .eq('institute_id', instituteId)
      .order('post_type', { ascending: false })
      .order('created_at', { ascending: true });

    if (!error && data && data.length > 0) {
      // Keep local backup synchronized
      if (typeof window !== 'undefined') {
        localStorage.setItem(`${STORAGE_PREFIX}${instituteId}`, JSON.stringify(data));
      }
      return data as InstituteStaffStrength[];
    }

    if (error) {
      console.warn('Supabase institute_staff_strength fetch, using local cache:', error.message);
    }
  } catch (err) {
    console.warn('Network or DB error fetching staff strength:', err);
  }

  // Fallback to local storage if available
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(`${STORAGE_PREFIX}${instituteId}`);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed as InstituteStaffStrength[];
        }
      } catch (e) {
        console.warn('Failed parsing cached staff strength:', e);
      }
    }
  }

  // Generate initial seed mappings if institute has none
  const generatedSeeds = generateDefaultSeedMappings(instituteId, fallbackPosts, fallbackCourses);
  if (typeof window !== 'undefined' && generatedSeeds.length > 0) {
    localStorage.setItem(`${STORAGE_PREFIX}${instituteId}`, JSON.stringify(generatedSeeds));
  }
  return generatedSeeds;
}

/**
 * Upsert/Save a staff strength mapping for an institute.
 */
export async function saveStaffStrength(
  mapping: {
    id?: string;
    institute_id: string;
    post_id: string;
    course_id?: string | null;
    post_type: 'Teaching' | 'Non-Teaching';
    program_stream?: string | null;
    sanctioned_posts: number;
    available_strength: number;
    regulatory_body?: string;
    remarks?: string;
    is_active?: boolean;
    posts?: Post;
    institute_courses?: InstituteCourse;
  }
): Promise<{ success: boolean; data?: InstituteStaffStrength; error?: any }> {
  const variance = calculateStaffVariance(mapping.available_strength, mapping.sanctioned_posts);
  const now = new Date().toISOString();

  const recordToSave = {
    id: mapping.id || `str_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    institute_id: mapping.institute_id,
    post_id: mapping.post_id,
    course_id: mapping.course_id || null,
    post_type: mapping.post_type,
    program_stream: mapping.program_stream || null,
    sanctioned_posts: Number(mapping.sanctioned_posts) || 0,
    available_strength: Number(mapping.available_strength) || 0,
    variance,
    regulatory_body: mapping.regulatory_body || 'AICTE / Apex Body',
    remarks: mapping.remarks || '',
    is_active: mapping.is_active ?? true,
    updated_at: now,
  };

  // Try saving to Supabase
  try {
    const { data, error } = await supabase
      .from('institute_staff_strength')
      .upsert({
        ...recordToSave,
        created_at: mapping.id ? undefined : now,
      })
      .select('*, posts(*, staff_categories(*)), institute_courses(*)')
      .single();

    if (!error && data) {
      updateLocalCache(mapping.institute_id, data as InstituteStaffStrength);
      return { success: true, data: data as InstituteStaffStrength };
    }
  } catch (err) {
    console.warn('DB upsert error, persisting locally:', err);
  }

  // Local storage persistence
  const fallbackRecord: InstituteStaffStrength = {
    ...recordToSave,
    created_at: now,
    posts: mapping.posts,
    institute_courses: mapping.institute_courses,
  };
  updateLocalCache(mapping.institute_id, fallbackRecord);
  return { success: true, data: fallbackRecord };
}

/**
 * Delete a staff strength mapping.
 */
export async function deleteStaffStrength(
  id: string,
  instituteId: string
): Promise<{ success: boolean; error?: any }> {
  try {
    await supabase.from('institute_staff_strength').delete().eq('id', id);
  } catch (err) {
    console.warn('DB delete error, removing locally:', err);
  }

  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(`${STORAGE_PREFIX}${instituteId}`);
    if (cached) {
      try {
        const list: InstituteStaffStrength[] = JSON.parse(cached);
        const filtered = list.filter((item) => item.id !== id);
        localStorage.setItem(`${STORAGE_PREFIX}${instituteId}`, JSON.stringify(filtered));
      } catch {}
    }
  }

  return { success: true };
}

function updateLocalCache(instituteId: string, item: InstituteStaffStrength) {
  if (typeof window === 'undefined') return;
  try {
    const cached = localStorage.getItem(`${STORAGE_PREFIX}${instituteId}`);
    let list: InstituteStaffStrength[] = cached ? JSON.parse(cached) : [];
    const idx = list.findIndex((x) => x.id === item.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...item };
    } else {
      list.push(item);
    }
    localStorage.setItem(`${STORAGE_PREFIX}${instituteId}`, JSON.stringify(list));
  } catch (e) {
    console.warn('Error updating local staff strength cache:', e);
  }
}

/**
 * Generate sensible default seed entries if an institute has no mappings yet.
 */
function generateDefaultSeedMappings(
  instituteId: string,
  posts: Post[],
  courses: InstituteCourse[]
): InstituteStaffStrength[] {
  if (!posts || posts.length === 0) return [];

  const seeds: InstituteStaffStrength[] = [];
  const now = new Date().toISOString();

  // Find teaching posts
  const teachingPosts = posts.filter(
    (p) => p.staff_categories?.name?.toLowerCase().includes('teach') && !p.staff_categories?.name?.toLowerCase().includes('non')
  );

  // Find non-teaching posts (Common Pool)
  const nonTeachingPosts = posts.filter(
    (p) =>
      p.staff_categories?.name?.toLowerCase().includes('non') ||
      p.staff_categories?.name?.toLowerCase().includes('house')
  );

  // Seed up to 4 teaching posts with relevant courses
  teachingPosts.slice(0, 4).forEach((post, i) => {
    const matchingCourse = courses[i % (courses.length || 1)] || null;
    const sanctioned = i === 0 ? 12 : i === 1 ? 8 : i === 2 ? 6 : 4;
    const available = i === 0 ? 9 : i === 1 ? 7 : i === 2 ? 6 : 3;

    seeds.push({
      id: `seed_teach_${i}_${Date.now()}`,
      institute_id: instituteId,
      post_id: post.id,
      course_id: matchingCourse?.id,
      post_type: 'Teaching',
      program_stream: matchingCourse?.program_stream || post.program_stream || 'Engineering & Technology',
      sanctioned_posts: sanctioned,
      available_strength: available,
      variance: available - sanctioned,
      regulatory_body: 'AICTE / Regulatory Body',
      remarks: 'Regulatory Cadre Ratio norm requirement',
      is_active: true,
      created_at: now,
      posts: post,
      institute_courses: matchingCourse || undefined,
    });
  });

  // Seed up to 3 non-teaching common pool posts
  nonTeachingPosts.slice(0, 3).forEach((post, i) => {
    const sanctioned = i === 0 ? 5 : i === 1 ? 4 : 6;
    const available = i === 0 ? 4 : i === 1 ? 4 : 5;

    seeds.push({
      id: `seed_nonteach_${i}_${Date.now()}`,
      institute_id: instituteId,
      post_id: post.id,
      course_id: undefined,
      post_type: 'Non-Teaching',
      program_stream: 'General / Administrative (Common Pool)',
      sanctioned_posts: sanctioned,
      available_strength: available,
      variance: available - sanctioned,
      regulatory_body: 'Directorate / State Norms',
      remarks: 'Central pool: shared institute support deployment',
      is_active: true,
      created_at: now,
      posts: post,
    });
  });

  return seeds;
}
