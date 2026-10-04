export async function requestJson<T = any>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {...options, signal: options.signal || AbortSignal.timeout(20000)});
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || `Request failed (${response.status}). Please try again.`);
  if (!data) throw new Error("The server returned an unreadable response. Please try again.");
  return data as T;
}
