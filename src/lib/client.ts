// Small fetch helper for the browser: returns parsed JSON or throws a friendly Estonian error.
export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
      cache: "no-store",
    });
  } catch {
    throw new Error("Serveriga ei saanud ühendust. Kontrollige internetiühendust ja proovige uuesti.");
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error((data && typeof data.error === "string" && data.error) || "Midagi läks valesti. Palun proovige uuesti.");
  }
  return data as T;
}

export function formatTime(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const time = date.toLocaleTimeString("et-EE", { hour: "2-digit", minute: "2-digit" });
  if (date.toDateString() === now.toDateString()) return time;
  return `${date.toLocaleDateString("et-EE", { day: "numeric", month: "numeric", year: "numeric" })} ${time}`;
}
