// ===========================================================================
//  Публикация в Facebook Page через Meta Graph API.
// ===========================================================================
const GRAPH = "https://graph.facebook.com/v21.0";

/**
 * Публикует текстовый пост на странице Facebook.
 * @returns {Promise<{ ok: boolean, id?: string, error?: string }>}
 */
export async function publishToFacebook(message) {
  const pageId = process.env.FACEBOOK_PAGE_ID;
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  if (!pageId || !token) return { ok: false, error: "facebook_not_configured" };

  try {
    const res = await fetch(`${GRAPH}/${pageId}/feed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, access_token: token }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data?.error?.message || `http_${res.status}` };
    return { ok: true, id: data.id };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
