const SITES = { skyline: "Skyline Stone Products", summit: "Summit General Counsel" };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
export default async (req) => {
  if (req.method !== "GET") return json({ ok: false, error: "Method not allowed." }, 405);
  const u = new URL(req.url); const site = u.searchParams.get("site") || "skyline";
  const start = u.searchParams.get("start") || ""; const end = u.searchParams.get("end") || "";
  const re = /^\d{4}-\d{2}-\d{2}$/;
  if (!SITES[site]) return json({ ok:false, error:"Unknown project selected." },400);
  if (!re.test(start) || !re.test(end) || start > end) return json({ok:false,error:"Valid start and end dates are required."},400);
  try {
    const r = await fetch("https://raw.githubusercontent.com/skylinestoneproducts/gsc/main/data.json?cache=" + Date.now(), { headers: { "accept":"application/json" } });
    if (!r.ok) throw new Error("Snapshot feed unavailable (" + r.status + ")");
    const snapshot = await r.json(); const project = snapshot.projects?.[site];
    if (!project) throw new Error("No saved GSC snapshot for this project yet.");
    const daily = (project.daily || []).filter(x => x.date >= start && x.date <= end).map(x => ({date:x.date,clicks:Number(x.clicks||0),impressions:Number(x.impressions||0),ctr:Number(x.ctr||0),position:Number(x.position||0)}));
    return json({ok:true,project:project.name,siteUrl:project.siteUrl,start,end,fetchedAt:snapshot.updatedAt,daily,pages:[],source:"scheduled-composio-snapshot"});
  } catch (e) { return json({ok:false,error:"Could not load scheduled GSC snapshot: " + String(e.message || e)},502); }
};
