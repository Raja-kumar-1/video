# video

Browser-based video call demo using WebRTC.

## Run locally

Serve this repository over HTTP/HTTPS (WebRTC media access requires a secure context, and `http://localhost` works for local testing):

```bash
cd /home/runner/work/video/video
python3 -m http.server 8000
```

Open <http://localhost:8000> and click **Start Call**.
