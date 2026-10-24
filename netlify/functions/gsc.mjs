const SITES = {
  skyline: { name: "Skyline Stone Products", site_url: "https://skylinestoneproducts.com/" },
  summit: { name: "Summit General Counsel", site_url: "https://www.summitgeneralcounsel.com/" }
};
const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
});
function unwrapRows(payload) {
  const candidates = [
    payload?.data?.rows, payload?.data?.data?.rows, payload?.response?.data?.rows,
    payload?.response?.data?.data?.rows, payload?.rows,
    payload?.data?.response?.data?.rows
  ];
  for (const rows of candidates) if (Array.isArray(rows)) return rows;
  return [];
}
async function queryGsc(apiKey, siteUrl, startDate, endDate, dimensions, rowLimit) {
  const response = await fetch("https://backend.composio.dev/api/v3.1/tools/execute/GOOGLE_SEARCH_CONSOLE_SEARCH_ANALYTICS_QUERY", {
    method: "POST",
    headers: { "x-api-key": apiKey, "content-type": "application/json", "accept": "application/json" },
    body: JSON.stringify({
      version: "latest",
      arguments: {
        site_url: siteUrl, start_date: startDate, end_date: endDate,
        dimensions, row_limit: rowLimit, start_row: 0,
        data_state: "final", search_type: "web", aggregation_type: "auto"
      }
    })
  });
  const text = await response.text();
  let payload;
  try { payload = JSON.parse(text); } catch { payload = { message: text.slice(0, 500) }; }
  if (!response.ok) {
    const detail = payload?.error?.message || payload?.message || payload?.error || ("Composio HTTP " + response.status);
    throw new Error(String(detail).slice(0, 350));
  }
  if (payload?.error) throw new Error(String(payload.error?.message || payload.error).slice(0, 350));
  return unwrapRows(payload);
}
function mapRows(rows, dimension) {
  return rows.map(r => {
    const key = Array.isArray(r.keys) ? r.keys[0] : (r[dimension] || "");
    return {
      [dimension === "date" ? "date" : "page"]: String(key),
      clicks: Number(r.clicks || 0), impressions: Number(r.impressions || 0),
      ctr: Number(r.ctr || 0), position: Number(r.position || 0)
    };
  }).filter(r => r.date || r.page);
}
export default async (req) => {
  if (req.method !== "GET") return json({ ok: false, error: "Method not allowed." }, 405);
  const url = new URL(req.url);
  const siteKey = url.searchParams.get("site") || "skyline";
  const site = SITES[siteKey];
  if (!site) return json({ ok: false, error: "Unknown project selected." }, 400);
  const start = url.searchParams.get("start") || "";
  const end = url.searchParams.get("end") || "";
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!datePattern.test(start) || !datePattern.test(end) || start > end) {
    return json({ ok: false, error: "Valid start and end dates are required." }, 400);
  }
  const startMs = Date.parse(start + "T00:00:00Z");
  const endMs = Date.parse(end + "T00:00:00Z");
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || (endMs - startMs) / 86400000 > 365) {
    return json({ ok: false, error: "Choose a date range of 366 days or less." }, 400);
  }
  const apiKey = Netlify.env.get("COMPOSIO_API_KEY");
  if (!apiKey) return json({ ok: false, error: "Netlify is missing COMPOSIO_API_KEY in the Functions scope. Add it and redeploy." }, 500);
  try {
    const [dailyRows, pageRows] = await Promise.all([
      queryGsc(apiKey, site.site_url, start, end, ["date"], 1000),
      queryGsc(apiKey, site.site_url, start, end, ["page"], 1000)
    ]);
    const daily = mapRows(dailyRows, "date").sort((a,b) => a.date.localeCompare(b.date));
    const pages = mapRows(pageRows, "page").sort((a,b) => b.impressions - a.impressions);
    return json({
      ok: true, project: site.name, siteUrl: site.site_url, start, end,
      fetchedAt: new Date().toISOString(), daily, pages,
      diagnostics: { dailyRows: daily.length, pageRows: pages.length }
    });
  } catch (error) {
    console.error("GSC live query failed:", error?.message || "unknown error");
    return json({ ok: false, error: "Live GSC query failed. " + String(error?.message || "Unknown error") }, 502);
  }
};