/** fetch JSON with a timeout; non-2xx (incl. 429 rate limits) throws so callers fall back. */
export async function getJson<T = any>(url: string, timeoutMs = 8000): Promise<T> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { accept: 'application/json', 'user-agent': 'ApexSportsHub/1.0' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}
