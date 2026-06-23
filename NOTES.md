# Pulse Assessment Notes (Notes helped by AI Chatbot)

## Phase 1 — Make it run

### Setup (before fixes)
- Cloned repo, configured `.env` (Neon + Mapbox), ran `npx prisma db push`, app starts locally.
- Added `concurrently` scripts (`dev:both`, `setup:both`) to run dev (port 4000) + production build (port 3000) side-by-side for two-browser WebRTC testing on one machine.
- Initial state: connection request/accept/decline/end worked, but **chat and video did not**. Deployed site had video issues on desktop (remote camera not visible).