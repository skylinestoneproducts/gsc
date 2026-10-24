# GSC Daily Report Dashboard

Live Google Search Console dashboard deployed on Netlify.

## Features
- Live GSC data via Composio's connected Google Search Console account.
- Project selector for Skyline Stone Products and Summit General Counsel.
- Daily clicks, impressions, CTR, and average position.
- Monthly rollups and low-CTR page opportunities.
- No CSV import or manual upload.

## Deploy
- Netlify publish directory: `.`
- Function file: `netlify/functions/gsc.mjs`
- Add `COMPOSIO_API_KEY` as a secret environment variable with Functions scope.
- Redeploy after changing environment variables.

The function keeps the Composio API key server-side and only returns GSC performance data to the browser.
