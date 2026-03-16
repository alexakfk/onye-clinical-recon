const API_KEY = import.meta.env.VITE_API_KEY || "dev-api-key";

function apiUrl(path) {
  const base = import.meta.env.VITE_API_URL;
  return base ? `${base}${path}` : path;
}

async function post(path, body) {
  const res = await fetch(apiUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail.detail || `Request failed (${res.status})`);
  }
  return res.json();
}

export function reconcileMedication(data) {
  return post("/api/reconcile/medication", data);
}

export function validateDataQuality(data) {
  return post("/api/validate/data-quality", data);
}
