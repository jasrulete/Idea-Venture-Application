# Pulse Assessment Notes (Notes helped by AI Chatbot)

## Phase 1 — Make it run

### Setup (before fixes)

- Cloned repo, configured `.env` (Neon + Mapbox), ran `npx prisma db push`, app starts locally.
- Added `concurrently` scripts (`dev:both`, `setup:both`) to run dev (port 4000) + production build (port 3000) side-by-side for two-browser WebRTC testing on one machine.
- Initial state: connection request/accept/decline/end worked, but **chat and video did not**. Deployed and local site had video responsiveness issues on desktop (Only main display is visible but PiP(self-view) is not visible).

### Fix 1: Stale dots not expiring
- **Symptom:** Dots stayed on the map long after users closed the app.
- **How it was found:** Closed both test tabs, re-opened a fresh session — old dots still visible for minutes. README hinted at this exact behavior.
- **Cause:** `/api/poll` heartbeat used `updateMany({ where: {} })`, updating every user's `lastSeen` on every poll.
- **Fix:** Restrict heartbeat to `where: { id }` (the polling user only).
- **Verified:** Closed tabs → dots disappear within ~15s.

### Fix 2 — Chat messages only one sided
- **Symptom:** Messages appeared on sender's side only; peer never received them.
- **How I found it:** Connected two browsers, sent messages after "Connected" state — one-way only. Traced WebRTC data channel in `lib/webrtc.ts`.
- **Cause:** `sendChat` sent `{ t: "msg" }` but `wireDataChannel` only handled `{ t: "chat" }`.
- **Fix:** Changed sender to use `"chat"`.
- **Verified:** Messages work both directions over P2P data channel.

### Fix 3 — Peers stuck busy after disconnect
- **Symptom:** After ending a connection, could not reconnect — dot stayed busy / requests auto-declined.
- **How I found it:** Connected, ended call, tried connecting again — failed. Checked `busy` handling in `/api/signal`.
- **Cause:** `busy` cleared on `decline` but not on `end`.
- **Fix:** Clear `busy` for both peers on `end` as well as `decline`.
- **Verified:** Can connect, disconnect, and reconnect successfully.