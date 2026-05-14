import { supabase } from '../lib/supabase';

/**
 * Search for user profiles by full name (username).
 * Returns up to `limit` profiles matching the query (case-insensitive).
 * Filters out empty queries.
 */
export const searchProfilesByName = async (query, limit = 6) => {
  const trimmed = String(query || '')
    .trim()
    .toLowerCase();

  if (!trimmed) return [];

//   console.log('[SearchService] Searching for:', trimmed);

  try {
    // Fetch all profiles (with a reasonable limit) and filter client-side for reliability
    const { data: allProfiles, error: fetchError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .order('full_name', { ascending: true })
      .limit(100); // Fetch more, we'll filter client-side

    console.log('[SearchService] Fetched profiles:', allProfiles?.length, 'Error:', fetchError);

    if (fetchError) {
      console.error('[SearchService] Fetch error:', fetchError);
      return [];
    }

    if (!allProfiles || allProfiles.length === 0) {
      console.log('[SearchService] No profiles in database');
      return [];
    }

    // Filter profiles where full_name contains the search query (case-insensitive)
    const results = allProfiles
      .filter((profile) => profile.full_name && profile.full_name.toLowerCase().includes(trimmed))
      .slice(0, limit);

    // console.log(
    //   '[SearchService] Filtered results:',
    //   results.length,
    //   results.map((p) => p.full_name),
    // );
    return results;
  } catch (err) {
    console.error('[SearchService] Unexpected error:', err);
    return [];
  }
};
