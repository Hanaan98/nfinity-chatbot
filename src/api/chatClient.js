const API_BASE = import.meta.env.VITE_API_BASE || "/api";

const SID_KEY = "nfinity_session_id";
function getSessionId() {
  let sid = localStorage.getItem(SID_KEY);
  if (!sid) {
    sid = `sess_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(SID_KEY, sid);
  }
  return sid;
}

function normalizeProducts(products = []) {
  return products.map((p, i) => {
    return {
      id: p.id ?? `prod_${i}`,
      name: p.title ?? p.name ?? "Untitled product",
      title: p.title ?? p.name ?? "Untitled product",
      price: p.price ?? 0,
      currency:
        p.currency ||
        (Array.isArray(p.variants) && p.variants[0]?.currency) ||
        "USD",
      rating: p.rating ?? 5,
      image:
        p.image ||
        p.imageUrl ||
        (p.images && (p.images[0]?.url || p.images[0])) ||
        "",
      url: p.url || p.handle || "",
      variants: Array.isArray(p.variants) ? p.variants : [],
    };
  });
}

function normalizeResponse(data) {
  if (!data?.content) return "Sorry, I didn’t get a valid response.";
  const c = data.content;
  const msg = c.message ?? "";
  const act = c.ui_action;

  if (act === "show_products") {
    const products = normalizeProducts(c.payload?.products || []);
    return { type: "carousel", products, text: msg };
  }

  if (act === "redirect") {
    const r = c.payload?.redirect || {};
    return r.url ? `${msg}\n\n${r.url}` : msg;
  }

  return msg || "Okay.";
}

export async function sendChat(message) {
  const body = { message, sessionId: getSessionId() };
  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }

  const data = await res.json();
  return normalizeResponse(data);
}
