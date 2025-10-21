// src/api/chatClient.js

// Prefer an env var on Vercel/production; fall back to the local Vite proxy (/api)
const API_BASE = import.meta.env.VITE_API_BASE || "/api";

// ---- Timeout config ---------------------------------------------------------
const DEFAULT_TIMEOUT_MS = Number(import.meta.env.VITE_HTTP_TIMEOUT_MS) || 20000;
const ENABLE_ONE_RETRY = true;

// ---- Session id (keeps thread continuity) ----------------------------------
const SID_KEY = "nfinity_session_id";
function getSessionId() {
  let sid = localStorage.getItem(SID_KEY);
  if (!sid) {
    sid = `sess_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(SID_KEY, sid);
  }
  return sid;
}

// ---- Fetch with AbortController timeout ------------------------------------
async function fetchWithTimeout(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } catch (err) {
    if (err?.name === "AbortError") {
      const e = new Error("Request timed out. Please try again.");
      e.code = "ETIMEDOUT";
      throw e;
    }
    throw err;
  } finally {
    clearTimeout(id);
  }
}

// ---- Normalizers ------------------------------------------------------------
function normalizeProducts(products = []) {
  return products.map((p, i) => {
    const firstVariant = Array.isArray(p.variants) && p.variants[0] ? p.variants[0] : null;
    const currency =
      (firstVariant && (firstVariant.currency || firstVariant.currencyCode)) ||
      p.currency ||
      "USD";

    const image =
      p.image ||
      p.imageUrl ||
      (Array.isArray(p.images) && (p.images[0]?.url || p.images[0])) ||
      "";

    let priceNumber = 0;
    let priceDisplay = "";
    if (typeof p.price === "number") {
      priceNumber = p.price;
      priceDisplay = `${p.price.toFixed(2)}`;
    } else if (typeof p.price === "string") {
      priceDisplay = p.price.replace(/^\s*\$/i, "");
      priceNumber = Number(priceDisplay.replace(/[^\d.]/g, "")) || 0;
    } else if (firstVariant?.price != null) {
      const pv = firstVariant.price;
      if (typeof pv === "number") {
        priceNumber = pv;
        priceDisplay = `${pv.toFixed(2)}`;
      } else if (typeof pv === "string") {
        priceDisplay = pv.replace(/^\s*\$/i, "");
        priceNumber = Number(priceDisplay.replace(/[^\d.]/g, "")) || 0;
      }
    }

    return {
      id: p.id ?? `prod_${i}`,
      name: p.title ?? p.name ?? "Untitled product",
      title: p.title ?? p.name ?? "Untitled product",
      price: priceNumber,
      priceDisplay: priceDisplay || "",
      currency,
      rating: p.rating ?? 5,
      image,
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

// ---- Public API -------------------------------------------------------------

export async function sendChat(message) {
  const body = { message, sessionId: getSessionId() };
  const endpoint = `${API_BASE}/chat`;

  const attempt = async () => {
    const res = await fetchWithTimeout(
      endpoint,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
      DEFAULT_TIMEOUT_MS
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`API ${res.status}: ${text || res.statusText}`);
    }

    const data = await res.json();
    return normalizeResponse(data);
  };

  try {
    return await attempt();
  } catch (err) {
    const retriable = err?.code === "ETIMEDOUT" || err?.name === "TypeError";
    if (ENABLE_ONE_RETRY && retriable) {
      await new Promise((r) => setTimeout(r, 400));
      return await attempt();
    }
    throw err;
  }
}

/**
 * GET /chat/:sessionId?after=<messageId>
 * Normalizes both:
 *  - { messages, has_more, cursor }
 *  - { messages, meta: { has_next, cursor } }
 */
export async function getMessages({ after } = {}) {
  const sessionId = getSessionId();
  const qs = after ? `?after=${encodeURIComponent(after)}` : "";
  const url = `${API_BASE}/chat/${encodeURIComponent(sessionId)}${qs}`;

  const res = await fetchWithTimeout(
    url,
    { method: "GET", headers: { Accept: "application/json" } },
    DEFAULT_TIMEOUT_MS
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }

  const raw = await res.json();

  if (raw && typeof raw === "object") {
    // shape A
    if ("has_more" in raw || "cursor" in raw) {
      return {
        messages: raw.messages || [],
        has_more: Boolean(raw.has_more),
        cursor: raw.cursor ?? null,
      };
    }
    // shape B
    if (raw.meta && typeof raw.meta === "object") {
      return {
        messages: raw.messages || [],
        has_more: Boolean(raw.meta.has_next),
        cursor: raw.meta.cursor ?? null,
      };
    }
  }
  // fallback
  return { messages: raw?.messages || [], has_more: false, cursor: null };
}

// Optional helper if you want the id elsewhere
export function currentSessionId() {
  return getSessionId();
}

export { API_BASE };
