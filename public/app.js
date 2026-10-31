const socket = io();
const homeView = document.getElementById("homeView");
const callView = document.getElementById("callView");
const createNameInput = document.getElementById("createName");
const createCodeInput = document.getElementById("createCode");
const joinNameInput = document.getElementById("joinName");
const joinCodeInput = document.getElementById("joinCode");
const homeError = document.getElementById("homeError");
const localVideo = document.getElementById("localVideo");
const localPlaceholder = document.getElementById("localPlaceholder");
const videoGrid = document.getElementById("videoGrid");
const waitingTile = document.getElementById("waitingTile");
const toast = document.getElementById("toast");

let localStream = null;
let roomId = null;
let displayName = null;
let peers = new Map();
let micEnabled = true;
let cameraEnabled = true;
let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2300);
}
function setError(message) { homeError.textContent = message || ""; }

async function enterRoom(name, code, create = false) {
  setError("");
  displayName = name.trim();
  if (!displayName) {
    setError("Please enter your name first.");
    return;
  }
  roomId = String(code || "").trim().toUpperCase();
  if (!roomId) {
    setError("Please enter a room code.");
    return;
  }

  try {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: { facingMode: "user" } });
  } catch (err) {
    try {
      localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      showToast("Camera unavailable — joining with microphone only.");
    } catch (audioErr) {
      setError("Camera and microphone access is needed. Allow access in your browser and try again.");
      return;
    }
  }

  localVideo.srcObject = localStream;
  document.getElementById("localName").textContent = displayName;
  document.querySelector(".avatar").textContent = displayName.charAt(0).toUpperCase();
  updateLocalMediaUI();

  if (!socket.connected) {
    setError("Connecting to the server. Please try again in a moment.");
    localStream.getTracks().forEach(t => t.stop());
    localStream = null;
    return;
  }

  socket.emit("join-room", { roomId, name: displayName, create }, async (result) => {
    if (!result?.ok) {
      setError(result?.error || "Could not join this room.");
      localStream?.getTracks().forEach(t => t.stop());
      localStream = null;
      return;
    }
    homeView.classList.add("hidden");
    callView.classList.remove("hidden");
    document.getElementById("activeRoomCode").textContent = result.roomId;
    document.getElementById("callStatus").innerHTML = '<span class="status-dot"></span> Waiting for others to join';
    // Existing participants initiate the connection when they receive peer-joined.
    result.peers.forEach(peer => createPeer(peer.id, peer.name, false));
    updateParticipantCount();
  });
}

function createPeer(peerId, peerName, shouldOffer) {
  if (peers.has(peerId)) return;
  const pc = new RTCPeerConnection({
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" }
    ]
  });
  const entry = { pc, name: peerName, stream: new MediaStream(), tile: null };
  peers.set(peerId, entry);
  localStream?.getTracks().forEach(track => pc.addTrack(track, localStream));

  pc.onicecandidate = event => {
    if (event.candidate) socket.emit("signal", { to: peerId, data: { candidate: event.candidate } });
  };
  pc.ontrack = event => {
    const stream = event.streams[0];
    if (stream) {
      entry.stream = stream;
      renderRemoteTile(peerId, entry);
    }
  };
  pc.onconnectionstatechange = () => {
    if (["failed", "disconnected", "closed"].includes(pc.connectionState)) {
      if (pc.connectionState === "failed") pc.restartIce?.();
    }
  };

  if (shouldOffer) {
    pc.createOffer()
      .then(offer => pc.setLocalDescription(offer))
      .then(() => socket.emit("signal", { to: peerId, data: { description: pc.localDescription } }))
      .catch(err => console.error("Offer error:", err));
  }
  updateParticipantCount();
  return entry;
}

async function handleSignal({ from, data }) {
  let entry = peers.get(from);
  if (!entry) {
    entry = createPeer(from, "Guest", false);
  }
  const pc = entry.pc;
  try {
    if (data.description) {
      await pc.setRemoteDescription(new RTCSessionDescription(data.description));
      if (data.description.type === "offer") {
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("signal", { to: from, data: { description: pc.localDescription } });
      }
    } else if (data.candidate) {
      await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
  } catch (err) {
    console.error("Signaling error:", err);
  }
}

function renderRemoteTile(peerId, entry) {
  let tile = document.getElementById(`peer-${peerId}`);
  if (!tile) {
    tile = document.createElement("div");
    tile.className = "video-tile remote-tile";
    tile.id = `peer-${peerId}`;
    const video = document.createElement("video");
    video.autoplay = true; video.playsInline = true;
    const placeholder = document.createElement("div");
    placeholder.className = "video-placeholder";
    placeholder.innerHTML = `<div class="avatar"></div><span>Camera is off</span>`;
    const label = document.createElement("div");
    label.className = "video-label";
    label.textContent = entry.name;
    tile.append(video, placeholder, label);
    videoGrid.insertBefore(tile, waitingTile);
    entry.tile = tile;
  }
  const video = tile.querySelector("video");
  if (video.srcObject !== entry.stream) video.srcObject = entry.stream;
  const hasVideo = entry.stream.getVideoTracks().some(track => track.enabled && track.readyState === "live");
  tile.querySelector(".video-placeholder").classList.toggle("hidden", hasVideo);
  video.classList.toggle("hidden", !hasVideo);
  tile.querySelector(".avatar").textContent = (entry.name || "G").charAt(0).toUpperCase();
  waitingTile.classList.add("hidden");
  document.getElementById("callStatus").innerHTML = '<span class="status-dot"></span> Connected — you’re live';
}

function updateParticipantCount() {
  const count = peers.size + 1;
  document.getElementById("participantCount").textContent = `${count} participant${count === 1 ? "" : "s"}`;
  if (!peers.size) {
    waitingTile.classList.remove("hidden");
    document.getElementById("callStatus").innerHTML = '<span class="status-dot"></span> Waiting for others to join';
  }
}
function updateLocalMediaUI() {
  const hasVideo = localStream?.getVideoTracks().length > 0;
  localPlaceholder.classList.toggle("hidden", !!(hasVideo && cameraEnabled));
  localVideo.classList.toggle("hidden", !(hasVideo && cameraEnabled));
  document.getElementById("micBtn").classList.toggle("off", !micEnabled);
  document.getElementById("micText").textContent = micEnabled ? "Mute" : "Unmute";
  document.getElementById("micBtn").setAttribute("aria-label", micEnabled ? "Mute microphone" : "Unmute microphone");
  document.getElementById("cameraBtn").classList.toggle("off", !cameraEnabled);
  document.getElementById("cameraText").textContent = cameraEnabled ? "Stop video" : "Start video";
  document.getElementById("cameraBtn").setAttribute("aria-label", cameraEnabled ? "Turn camera off" : "Turn camera on");
}
function toggleMic() {
  const tracks = localStream?.getAudioTracks() || [];
  if (!tracks.length) return showToast("No microphone is available in this call.");
  micEnabled = !micEnabled;
  tracks.forEach(track => track.enabled = micEnabled);
  updateLocalMediaUI();
}
function toggleCamera() {
  const tracks = localStream?.getVideoTracks() || [];
  if (!tracks.length) return showToast("No camera is available in this call.");
  cameraEnabled = !cameraEnabled;
  tracks.forEach(track => track.enabled = cameraEnabled);
  updateLocalMediaUI();
}
async function copyRoomCode() {
  try {
    await navigator.clipboard.writeText(roomId);
    showToast("Room code copied!");
  } catch {
    showToast(`Room code: ${roomId}`);
  }
}
function leaveCall() {
  peers.forEach(({ pc }) => pc.close());
  peers.clear();
  localStream?.getTracks().forEach(track => track.stop());
  localStream = null;
  socket.disconnect();
  callView.classList.add("hidden");
  homeView.classList.remove("hidden");
  videoGrid.querySelectorAll(".remote-tile").forEach(tile => tile.remove());
  waitingTile.classList.remove("hidden");
  localVideo.srcObject = null;
  micEnabled = true; cameraEnabled = true;
  updateLocalMediaUI();
  socket.connect();
  setError("");
}

document.getElementById("createBtn").addEventListener("click", () => {
  enterRoom(createNameInput.value, createCodeInput.value, true);
});
document.getElementById("joinBtn").addEventListener("click", () => enterRoom(joinNameInput.value, joinCodeInput.value, false));
createCodeInput.addEventListener("keydown", e => { if (e.key === "Enter") document.getElementById("createBtn").click(); });
joinCodeInput.addEventListener("keydown", e => { if (e.key === "Enter") document.getElementById("joinBtn").click(); });
createNameInput.addEventListener("keydown", e => { if (e.key === "Enter") createCodeInput.focus(); });
joinNameInput.addEventListener("keydown", e => { if (e.key === "Enter") joinCodeInput.focus(); });
createCodeInput.addEventListener("input", () => createCodeInput.value = createCodeInput.value.replace(/[^0-9]/g, ""));
joinCodeInput.addEventListener("input", () => joinCodeInput.value = joinCodeInput.value.replace(/[^0-9]/g, ""));
document.getElementById("micBtn").addEventListener("click", toggleMic);
document.getElementById("cameraBtn").addEventListener("click", toggleCamera);
document.getElementById("leaveBtn").addEventListener("click", leaveCall);
document.getElementById("copyCodeBtn").addEventListener("click", copyRoomCode);
document.getElementById("copyInviteBtn").addEventListener("click", copyRoomCode);

socket.on("peer-joined", ({ id, name }) => {
  if (!peers.has(id)) {
    const entry = createPeer(id, name, true);
    if (entry) entry.name = name;
  }
});
socket.on("signal", handleSignal);
socket.on("peer-left", ({ id }) => {
  const entry = peers.get(id);
  if (entry) {
    entry.pc.close();
    entry.tile?.remove();
    peers.delete(id);
    updateParticipantCount();
    showToast("Someone left the call.");
  }
});
socket.on("connect_error", () => setError("Unable to connect. Please refresh and try again."));
