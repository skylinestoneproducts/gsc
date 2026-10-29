const SITES = { skyline: "Skyline Stone Products", us_miss_nella: "US.Miss Nella", miss_nella: "Miss Nella", proambelts: "ProAm Belts", championshipchains: "ChampionshipChains", lavkids: "LavKids", memoryvaultbox: "Memory Vault Box", muccazio: "Muccazio", thedahealth: "Theda Health", goalpediatrics: "Goal Pediatrics", predatorprime: "Predator Prime", summitgeneralcounsel: "Summit General Counsel", dieselworksbtx: "Diesel Works BTX" };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store, max-age=0" } });
export default async (req) => {
  if (req.method !== "GET") return json({ ok: false, error: "Method not allowed." }, 405);
  const u = new URL(req.url); const site = u.searchParams.get("site") || "skyline";
  const start = u.searchParams.get("start") || ""; const end = u.searchParams.get("end") || "";
  const re = /^\\d{4}-\\d{2}-\\d{2}$/;
  if (!SITES[site]) return json({ ok:false, error:"Unknown project selected." },400);
  if (!re.test(start) || !re.test(end) || start > end) return json({ok:false,error:"Valid start and end dates are required."},400);
  try {
    const r = await fetch("https://api.github.com/repos/skylinestoneproducts/gsc/contents/data.json?ref=main&nocache=" + Date.now(), { cache: "no-store", headers: { "accept":"application/vnd.github+json", "cache-control":"no-cache, no-store", "pragma":"no-cache", "x-github-api-version":"2022-11-28" } });
    if (!r.ok) throw new Error("GitHub snapshot feed unavailable (" + r.status + ")");
    const file = await r.json();
    if (file.encoding !== "base64" || !file.content) throw new Error("GitHub snapshot content missing or not base64 encoded.");
    const snapshot = JSON.parse(Buffer.from(file.content.replace(/\\n/g, ""), "base64").toString("utf8"));
    const project = snapshot.projects?.[site];
    if (!project) throw new Error("No saved GSC snapshot for this project yet.");
    const daily = (project.daily || []).filter(x => x.date >= start && x.date <= end).map(x => ({date:x.date,clicks:Number(x.clicks||0),impressions:Number(x.impressions||0),ctr:Number(x.ctr||0),position:Number(x.position||0)}));
    return json({ok:true,project:project.name,siteUrl:project.siteUrl,start,end,fetchedAt:snapshot.updatedAt,daily,pages:[],source:"github-api-live-snapshot"});
  } catch (e) { return json({ok:false,error:"Could not load scheduled GSC snapshot: " + String(e.message || e)},502); }
};
