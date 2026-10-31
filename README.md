# video

Browser-based video call demo using WebRTC.

## Run locally

Serve this repository over HTTP/HTTPS (WebRTC media access requires a secure context, and `http://localhost` works for local testing):

```bash
cd /home/runner/work/video/video
python3 -m http.server 8000
```

Open <http://localhost:8000> and click **Start Call**.

## Host on GitHub Pages

This repository includes a GitHub Actions workflow at `/home/runner/work/video/video/.github/workflows/deploy-pages.yml` that deploys the static site to GitHub Pages on pushes to `main` or `master`.

1. In GitHub, open repository **Settings → Pages**.
2. Set **Source** to **GitHub Actions**.
3. Push to `main` or `master` (or run the workflow manually).
4. Your site will be available at:
   - `https://raja-kumar-1.github.io/video/`
