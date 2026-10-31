# RoomWave — Video Calling Website

A simple, responsive video-calling app built with **HTML, CSS, JavaScript, WebRTC, Node.js and Socket.IO**.

## Features
- Create a room with your name and your own numeric room code.
- Join an existing room using your name and the exact room code.
- Live audio/video using browser WebRTC.
- Microphone mute/unmute and camera on/off.
- Copy room code to invite others.
- Responsive interface for desktop, tablet and mobile.
- No account or paid video API required.
- Up to 6 participants per room (mesh WebRTC).

## Run locally
1. Install Node.js 18 or newer.
2. Extract this project.
3. Open a terminal in the project folder.
4. Run:
   ```bash
   npm install
   npm start
   ```
5. Open `http://localhost:3000`.

For camera/microphone access, use `localhost` locally or deploy over HTTPS. Browsers generally block camera/microphone access on insecure non-localhost pages.

## Deploy free on Render
1. Create a GitHub repository and upload **all files and folders** from this project.
2. Sign in at [Render](https://render.com/) and choose **New → Web Service**.
3. Connect your GitHub repository.
4. Use these settings:
   - **Runtime:** Node
   - **Build command:** `npm install`
   - **Start command:** `npm start`
5. Choose the free instance if available and click **Deploy**.
6. Open the HTTPS URL Render gives you.

Render free web services may sleep after inactivity, so the first visit after a quiet period can take a little longer while the server wakes up.

## Important notes
- This app uses a small Socket.IO server for room membership and WebRTC signaling. It is not a static-only website; deploy it as a Node web service.
- WebRTC uses public STUN servers for connection discovery. Some restrictive networks/firewalls require a TURN relay server. A TURN service is not bundled, so calls may not connect on every network.
- Group calls use peer-to-peer mesh connections. This is suitable for small rooms, but bandwidth and CPU usage increase as more people join. For larger meetings, use a hosted SFU such as LiveKit.
- The signaling server allows up to 6 people in a room. Anyone who knows a room code can join; use a private numeric code and do not share it publicly.
- This starter app does not include end-to-end identity verification, room passwords, recording, or moderation tools.
