import localExercises from '../data/exercises.json';

const GITHUB_URL =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';

const fetchWithTimeout = (url: string, ms: number): Promise<Response> =>
  Promise.race([
    fetch(url),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Request timed out')), ms)
    ),
  ]);

export const fetchExercises = async (): Promise<any[]> => {
  try {
    const res = await fetchWithTimeout(GITHUB_URL, 3000);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) return data;
    throw new Error('Empty response');
  } catch (err) {
    console.warn('[BodyQ] Remote fetch failed, using local data:', err);
    return localExercises as any[];
  }
};

export const BASE_IMG =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';
