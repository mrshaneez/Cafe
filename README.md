# Lemon Dynasty Manager

Flat single-folder project (no subfolders) so it can be uploaded via GitHub's web uploader without losing files. Vercel auto-detects Vite and builds it.

## Publish at cafe.ekuverin.com (Vercel)
1. Upload ALL of these files to the repo root (replace existing ones when asked).
2. Vercel redeploys automatically on push. Check the deployment turns green.
3. In Vercel: Project -> Settings -> Domains -> add `cafe.ekuverin.com`.
4. At your DNS provider for ekuverin.com add: `CNAME  cafe  cname.vercel-dns.com`

## AI features
Open the app -> AI tab -> AI settings -> paste your Anthropic API key (console.anthropic.com). Stored only on that device.

## Local dev
npm install && npm run dev
