const API_BASE = import.meta.env.VITE_API_BASE || "/api";

const DEFAULT_TIMEOUT_MS =
  Number(import.meta.env.VITE_HTTP_TIMEOUT_MS) || 60000; // Increased to 60 seconds
const ENABLE_ONE_RETRY = true;

const SID_KEY = "nfinity_session_id";
function getSessionId() {
  let sid = localStorage.getItem(SID_KEY);
  if (!sid) {
    sid = `sess_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(SID_KEY, sid);
  }
  return sid;
}

async function fetchWithTimeout(
  url,
  options = {},
  timeoutMs = DEFAULT_TIMEOUT_MS
) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  console.log(`⏱️ Starting fetch with ${timeoutMs}ms timeout to: ${url}`);
  const startTime = Date.now();

  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    const elapsed = Date.now() - startTime;
    console.log(`✅ Fetch completed in ${elapsed}ms`);
    return res;
  } catch (err) {
    const elapsed = Date.now() - startTime;
    console.error(`❌ Fetch failed after ${elapsed}ms:`, err);

    if (err?.name === "AbortError") {
      const e = new Error("Request timed out. Please try again.");
      e.code = "ETIMEDOUT";
      console.error(`⏰ Request aborted after ${timeoutMs}ms timeout`);
      throw e;
    }
    throw err;
  } finally {
    clearTimeout(id);
  }
}

function normalizeProducts(products = []) {
  return products.map((p, i) => {
    const firstVariant =
      Array.isArray(p.variants) && p.variants[0] ? p.variants[0] : null;
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
  console.log("🔍 normalizeResponse input:", data);

  if (!data?.content) {
    console.warn("⚠️ No content in response data");
    return "Sorry, I didn't get a valid response.";
  }

  const c = data.content;
  console.log("📦 Content extracted:", c);

  const msg = c.message ?? "";
  const act = c.ui_action;

  console.log("📝 Message and action:", { message: msg, ui_action: act });

  if (act === "show_products") {
    const products = normalizeProducts(c.payload?.products || []);
    console.log("🛍️ Returning carousel with products:", products);
    return { type: "carousel", products, text: msg };
  }

  if (act === "redirect") {
    console.log("🔀 Returning redirect message:", msg);
    // Don't append URL to message - it's already in the message text
    // The formatMessage function will auto-detect and linkify URLs
    return msg;
  }

  const result = msg || "Okay.";
  console.log("💬 Returning text message:", result);
  return result;
}

export async function sendChat(message, imageUrls = null) {
  const body = { 
    message, 
    sessionId: getSessionId()
  };
  
  // Add imageUrls array if images were uploaded
  if (imageUrls && Array.isArray(imageUrls) && imageUrls.length > 0) {
    body.imageUrls = imageUrls;
  }
  
  const endpoint = `${API_BASE}/chat`;

  console.log("🚀 Sending chat message:", {
    message,
    sessionId: body.sessionId,
    imageUrls: body.imageUrls || 'none',
    endpoint,
  });

  const attempt = async () => {
    try {
      const res = await fetchWithTimeout(
        endpoint,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
        DEFAULT_TIMEOUT_MS
      );

      console.log("📡 Response received:", {
        status: res.status,
        statusText: res.statusText,
        ok: res.ok,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error("❌ API Error Response:", {
          status: res.status,
          statusText: res.statusText,
          body: text,
        });
        throw new Error(`API ${res.status}: ${text || res.statusText}`);
      }

      const data = await res.json();
      console.log("📥 Raw API response data:", data);

      const normalized = normalizeResponse(data);
      console.log("✅ Normalized response:", normalized);

      return normalized;
    } catch (fetchError) {
      console.error("❌ Fetch attempt failed:", {
        error: fetchError,
        message: fetchError.message,
        code: fetchError.code,
        name: fetchError.name,
        stack: fetchError.stack,
      });
      throw fetchError;
    }
  };

  try {
    return await attempt();
  } catch (err) {
    console.error("❌ sendChat error caught:", {
      error: err,
      message: err.message,
      code: err.code,
      name: err.name,
      stack: err.stack,
    });

    const retriable = err?.code === "ETIMEDOUT" || err?.name === "TypeError";
    if (ENABLE_ONE_RETRY && retriable) {
      console.log("🔄 Retrying request...");
      await new Promise((r) => setTimeout(r, 400));
      return await attempt();
    }

    console.error("💥 Final error - not retrying:", err);
    throw err;
  }
}

export async function getMessages({ after } = {}) {
  const sessionId = getSessionId();
  const qs = after ? `?after=${encodeURIComponent(after)}` : "";
  const url = `${API_BASE}/chat/${encodeURIComponent(sessionId)}${qs}`;

  console.log(`🌐 GET ${url}`);

  const res = await fetchWithTimeout(
    url,
    { method: "GET", headers: { Accept: "application/json" } },
    DEFAULT_TIMEOUT_MS
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(`❌ API Error ${res.status}:`, text || res.statusText);
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }

  const raw = await res.json();
  console.log("📥 Raw response from backend:", raw);

  if (raw && typeof raw === "object") {
    // Handle nested chat.messages structure
    if (raw.chat && Array.isArray(raw.chat.messages)) {
      // Check for pagination at chat level first
      let has_more = Boolean(raw.chat.has_more);
      let cursor = raw.chat.cursor || null;

      // If not at chat level, check inside the last message's payload.meta
      if (!cursor && raw.chat.messages.length > 0) {
        const lastMsg = raw.chat.messages[raw.chat.messages.length - 1];
        if (
          lastMsg.content &&
          typeof lastMsg.content === "object" &&
          lastMsg.content.payload &&
          lastMsg.content.payload.meta
        ) {
          has_more = Boolean(lastMsg.content.payload.meta.has_next);
          cursor = lastMsg.content.payload.meta.cursor || null;
        }
      }

      const result = {
        messages: raw.chat.messages,
        has_more: has_more,
        cursor: cursor,
      };
      console.log("🔍 Parsed result (chat.messages):", {
        messageCount: result.messages.length,
        has_more: result.has_more,
        cursor: result.cursor,
      });
      return result;
    }
    // shape A
    if ("has_more" in raw || "cursor" in raw) {
      const result = {
        messages: raw.messages || [],
        has_more: Boolean(raw.has_more),
        cursor: raw.cursor ?? null,
      };
      console.log("🔍 Parsed result (shape A):", {
        messageCount: result.messages.length,
        has_more: result.has_more,
        cursor: result.cursor,
      });
      return result;
    }
    // shape B
    if (raw.meta && typeof raw.meta === "object") {
      const result = {
        messages: raw.messages || [],
        has_more: Boolean(raw.meta.has_next),
        cursor: raw.meta.cursor ?? null,
      };
      console.log("🔍 Parsed result (shape B):", {
        messageCount: result.messages.length,
        has_more: result.has_more,
        cursor: result.cursor,
      });
      return result;
    }
  }
  console.log("⚠️ Fallback result - no pagination info found");
  return { messages: raw?.messages || [], has_more: false, cursor: null };
}

/**
 * Upload an image file to the server and get back the Cloudinary URL
 * @param {File} file - The image file to upload
 * @returns {Promise<string>} The uploaded image URL
 */
export async function uploadImage(file) {
  const formData = new FormData();
  formData.append('images', file); // Note: backend expects 'images' field name
  formData.append('sessionId', getSessionId());

  const endpoint = `${API_BASE}/upload/images`;
  
  console.log('📤 Uploading image:', {
    filename: file.name,
    size: file.size,
    type: file.type,
    endpoint
  });

  try {
    const res = await fetchWithTimeout(
      endpoint,
      {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header - browser sets it with multipart boundary
      },
      30000 // 30 second timeout for uploads
    );

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('❌ Upload failed:', {
        status: res.status,
        statusText: res.statusText,
        body: text
      });
      throw new Error(`Upload failed: ${res.status} - ${text || res.statusText}`);
    }

    const data = await res.json();
    console.log('✅ Upload response received:', {
      rawData: data,
      dataType: typeof data,
      isArray: Array.isArray(data),
      keys: typeof data === 'object' ? Object.keys(data) : []
    });

    // Handle different response formats from backend
    // Format 1: { success: true, data: { imageUrls: [...] } } (Current backend format)
    if (data.success && data.data?.imageUrls && Array.isArray(data.data.imageUrls) && data.data.imageUrls.length > 0) {
      return data.data.imageUrls[0]; // Return first URL
    }
    
    // Format 2: { success: true, urls: [...] }
    if (data.success && Array.isArray(data.urls) && data.urls.length > 0) {
      return data.urls[0]; // Return first URL
    }
    
    // Format 3: { urls: [...] }
    if (Array.isArray(data.urls) && data.urls.length > 0) {
      return data.urls[0];
    }
    
    // Format 4: { url: "..." }
    if (data.url && typeof data.url === 'string') {
      return data.url;
    }
    
    // Format 5: { imageUrls: [...] }
    if (Array.isArray(data.imageUrls) && data.imageUrls.length > 0) {
      return data.imageUrls[0];
    }
    
    // Format 6: Direct array
    if (Array.isArray(data) && data.length > 0) {
      return data[0];
    }

    console.error('❌ Unexpected response format:', data);
    throw new Error(`Invalid upload response format: ${JSON.stringify(data)}`);
  } catch (err) {
    console.error('❌ Upload error:', {
      error: err,
      message: err.message,
      name: err.name
    });
    throw new Error(`Failed to upload image: ${err.message}`);
  }
}

export function currentSessionId() {
  return getSessionId();
}

export { API_BASE };
