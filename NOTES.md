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

### Fix 2: Chat messages only one sided

- **Symptom:** Messages appeared on sender's side only; peer never received them.
- **How I found it:** Connected two browsers, sent messages after "Connected" state — one-way only. Traced WebRTC data channel in `lib/webrtc.ts`.
- **Cause:** `sendChat` sent `{ t: "msg" }` but `wireDataChannel` only handled `{ t: "chat" }`.
- **Fix:** Changed sender to use `"chat"`.
- **Verified:** Messages work both directions over P2P data channel.

### Fix 3: Peers stuck busy after disconnect

- **Symptom:** After ending a connection, could not reconnect — dot stayed busy / requests auto-declined.
- **How I found it:** Connected, ended call, tried connecting again — failed. Checked `busy` handling in `/api/signal`.
- **Cause:** `busy` cleared on `decline` but not on `end`.
- **Fix:** Clear `busy` for both peers on `end` as well as `decline`.
- **Verified:** Can connect, disconnect, and reconnect successfully.

### Fix 4: WebRTC ICE candidates dropped

- **Symptom:** Video unreliable; remote stream often missing on desktop browsers.
- **How I found it:** Chat worked (Step 2) but video failed on laptop — traced signaling flow in `handleSignal`.
- **Cause:** `flushPendingCandidates()` ran before `setRemoteDescription`, so ICE candidates were added too early and silently failed.
- **Fix:** Set remote description first, then flush pending ICE candidates.
- **Verified:** Video call establishes with remote stream on desktop.

## Phase 2 — Make it good

### Update 1: Design foundation

- **What changed:** CSS custom properties for colors/surfaces, `.glass-panel` utility, fade/scale animations, Geist applied to body.
- **Why:** Single source of truth so every screen feels cohesive instead of one-off Tailwind classes.
- **Verified:** Fonts and base colors consistent across entry gate and map.

### Update 2: Entry gate & first impression

- **What changed:** Ambient emerald/teal glow, gradient “Pulse” title, animated fade-up on load, film-grain overlay, clearer privacy copy.
- **Why:** The gate is the only branded moment before the map — it should feel intentional and trustworthy.
- **Verified:** Entry screen reads as a polished product landing, not a dev placeholder.

### Update 3: Map & presence HUD

- **What changed:** Glass HUD for online count, radial vignette over the map, fly-to animation when you land, restored busy-state styling on peer dots, fixed “You” pin (was accidentally overwritten with peer-dot classes).
- **Why:** Map is the hero surface; vignette + motion draw focus without hiding Mapbox detail.
- **Verified:** Dots pulse, busy peers dim, map centers on the user after join.

### Update 4: Connection flow & toasts

- **What changed:** Reusable `ConnectionPrompt` with glass card + pulsing icon, `Toast` component for status (requesting, notices), spinner on pending states.
- **Why:** Connection/video prompts are high-anxiety moments — centered modals with clear actions reduce confusion.
- **Verified:** Request / accept / decline / timeout states all have visible feedback.

### Update 5: Chat panel

- **What changed:** Glass sidebar, live connection indicator (ping dot), message bubbles with asymmetric corners, empty state, custom scrollbar, fixed missing `value`/`onChange` on the input (typing was broken).
- **Why:** Chat is the core loop after connecting; broken input was a regression from the restyle.
- **Verified:** Messages send, scroll follows, panel works on mobile full-width.

### Update 6: Video panel

- **What changed:** Full-screen remote feed with gradient overlay, PiP self-view inside the relative container (fixed broken JSX that hid PiP), “You” label on PiP, glass end button.
- **Why:** Original Phase 2 edit had mismatched closing tags — PiP rendered outside the positioned parent and could be invisible on desktop.
- **Verified:** Build passes; PiP sits bottom-right with border/shadow.

## Phase 3 — Make it secure

### Audit summary

Reviewed `/api/join`, `/api/poll`, `/api/signal`, `/api/leave`. Main risk: all endpoints trusted client-supplied session IDs with no proof of ownership.

### Issues found (ranked)

1. **Critical — Session impersonation:** Anyone who knew a victim's session UUID could poll their inbox, send signals as them, or delete their presence via `/api/leave`.
2. **Critical — Mailbox drain via poll:** Unauthenticated poll allowed reading and deleting another user's signaling queue.
3. **High — Unauthenticated leave:** `/api/leave` accepted only `{ id }`, so an attacker could force a user offline.
4. **High — Signal fromId spoofing:** `/api/signal` never verified the caller owned `fromId`, enabling connection spam and busy-state manipulation.
5. **Medium — No rate limits:** Join/poll/signal/leave could be hammered for DB load or harassment.
6. **Medium — Unbounded signal payload:** Large SDP/ICE payloads could bloat the mailbox (capped at 64 KB).
7. **Low — Missing security headers:** No baseline HTTP hardening on responses.

### Fixes implemented

- **Session secrets:** Server issues a random `secret` on join; `requireSession()` validates `{ id, secret }` on poll, leave, and signal.
- **Join hardening:** Switched from upsert to create-only (prevents session squatting); UUID validation via `isSessionId()`.
- **Signal authorization:** Validates session ownership, signal types, payload size, sender/target existence, busy state, and gates WebRTC (`offer`/`answer`/`ice`) to connected peers only.
- **Leave restored:** Parses `{ id, secret }` from beacon body and deletes presence + pending signals (cleanup had been accidentally commented out).
- **Rate limiting:** Per-IP limits on all four API routes via `lib/rate-limit.ts` (429 + `Retry-After`).
- **Security headers:** `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` in `next.config.ts`.
- **Client wiring:** `page.tsx` passes `secret` on poll, leave, and every signal call (via a `signal()` helper + ref for unload handlers).

### Trade-offs / not fixed

- Peer IDs remain visible on the map (required for tap-to-connect).
- In-memory rate limits are best-effort on Vercel serverless (no shared Redis).
- No TURN servers (README limitation).
- Global stale cleanup on poll kept for simplicity (noted perf risk at scale).
- Did not add full moderation/reporting (Phase 4 candidate).

### Verification

- `npm run build` passes after fixes.
- Unauthorized poll/leave/signal return 401 without a valid secret.
- Full two-user connect / chat / video flow retested after client secret wiring.

### Local dev note

- **`npm run dev` failed** in `Idea-Venture-Application` because `node_modules` was missing — run `npm install` after clone/branch switch.
- **Two-user testing:** use one server (`npm run dev`) + normal + incognito on `http://localhost:4000` (README approach). Next.js 16 blocks two `next dev` processes in the same folder.
- **`dev:both` / `setup:both`:** `setup:both` builds first, then runs dev on `:4000` and production on `:3000` for side-by-side port testing.

## Phase 4 — Make it better

### Pre-phase audit (regression fix)

- **Busy stuck after end (regression):** Phase 3 re-applied `busy: false` on both `decline` and `end`. While connected, auto-decline signals to third parties cleared the *active* user's busy flag (`signal/route.ts` + client sending decline when not idle). **Fix:** only `end` clears busy; client ignores incoming requests when not idle (server already auto-declines when target is busy).
- Phase 1 fixes re-verified: poll heartbeat scoped to caller, chat `"chat"` type, ICE after SDP, join returns offset coords for map consistency.

### Data model (Postgres vs ephemeral)

| Stored in Postgres (transient) | Ephemeral / never stored |
|---|---|
| `Presence`: session id, auth secret, privacy-offset lat/lng, busy flag, lastSeen | Raw GPS coordinates |
| `Signal`: WebRTC/signaling mailbox (request/accept/SDP/ICE/end) | Chat text, nicknames, video/audio |
| Deleted on leave, staleness (~15s), or after signal delivery | Rate-limit buckets (in-memory per serverless instance) |
| | All React/UI state, WebRTC media streams |

### Features shipped

1. **Mobile responsiveness** — `100dvh` layouts, bottom-sheet chat, safe-area padding, `interactive-widget: overlays-content` viewport, fixed root overflow.
2. **Map recenter** — fly-to on join; recenter button when user pin leaves viewport after panning.
3. **Nearby list view** — Map/List toggle; client-side haversine sort on privacy-offset coords (~distance labels).
4. **Video controls** — mute, camera off, mirrored PiP (local only), chat stays open below video strip (not full-screen takeover).
5. **Busy dot styling** — amber-bordered gray dots; clicks disabled on busy peers.
6. **Camera flip** — `replaceTrack` with toggled `facingMode` on active call.
7. **Optional nickname** — entry field; shared P2P via data-channel `intro` message only (never hits server/DB).
8. **Keyboard fixes** — no layout resize on keyboard; refocus input after send; `overscroll-contain` on chat.
9. **Chat scroll bleed** — `isolate`, `min-h-0`, contained overflow, z-index stack map < video < chat.
10. **Structure cleanup** — `usePulseSession` hook, `LiveView`, `MapHud`, `PeerListPanel`, `RecenterButton`, `StatusToasts`.

### Trade-offs / next steps

- List distance is approximate (1–3 km privacy offset per user).
- Camera flip requires an active video stream; unsupported on some desktop browsers.
- With more time: TURN fallback, shared rate-limit store, reporting flow.
