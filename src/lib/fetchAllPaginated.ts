/**
 * Fetch ALL rows from a Supabase query, transparently paginating past the
 * 1000-row hard limit. Pass a builder that returns a query with `.range()`
 * applied to `[from, to]`.
 *
 * Example:
 *   const rows = await fetchAllPaginated<Attendee>((from, to) =>
 *     supabase.from('attendees').select('*').eq('event_id', id).range(from, to)
 *   );
 */
export async function fetchAllPaginated<T>(
  buildQuery: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
  pageSize = 1000,
  maxRows = 200_000, // safety cap
): Promise<T[]> {
  const all: T[] = [];
  let from = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await buildQuery(from, to);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
    if (all.length >= maxRows) {
      console.warn(`[fetchAllPaginated] safety cap reached at ${maxRows} rows`);
      break;
    }
  }
  return all;
}
