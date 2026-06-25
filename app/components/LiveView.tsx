"use client";

import { useState } from "react";
import WorldMap from "./WorldMap";
import ConnectionPrompt from "./ConnectionPrompt";
import ChatPanel from "./ChatPanel";
import VideoPanel from "./VideoPanel";
import Toast from "./Toast";
import RequestingToast, { VideoWaitingToast } from "./StatusToasts";
import { usePulseSession } from "@/app/hooks/usePulseSession";

export default function LiveView({
  sessionId,
  nickname,
  coords,
}: {
  sessionId: string;
  nickname: string;
  coords: { lat: number; lng: number };
}) {
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const session = usePulseSession(sessionId, nickname, coords);
  const {
    peers,
    messages,
    notice,
    localStream,
    remoteStream,
    myLocation,
    conn,
    video,
    peerNickname,
    peerRef,
    requestConnection,
    cancelRequest,
    acceptIncoming,
    declineIncoming,
    endConnection,
    startVideoRequest,
    acceptVideo,
    declineVideo,
    endVideo,
    toggleAudio,
    toggleVideo,
    switchCamera,
    addMessage,
  } = session;

  const inChat = conn.kind === "connecting" || conn.kind === "connected";
  const videoActive = video === "active";
  const peerLabel = peerNickname?.trim() || "Stranger";

  return (
    <main className="fixed inset-0 flex flex-col overflow-hidden bg-zinc-950">
      <div
        className={`relative min-h-0 flex-1 ${inChat ? "flex flex-col" : ""}`}
      >
        <WorldMap
          peers={peers}
          me={myLocation}
          onPeerClick={requestConnection}
          canConnect={conn.kind === "idle"}
          viewMode={inChat ? "map" : viewMode}
          onViewModeChange={setViewMode}
          hidden={inChat && videoActive}
        />

        {videoActive && (
          <VideoPanel
            localStream={localStream}
            remoteStream={remoteStream}
            onEnd={endVideo}
            onToggleAudio={toggleAudio}
            onToggleVideo={toggleVideo}
            onSwitchCamera={switchCamera}
          />
        )}

        {inChat && (
          <ChatPanel
            messages={messages}
            connected={conn.kind === "connected"}
            videoBusy={video !== "none"}
            peerLabel={peerLabel}
            compact={videoActive}
            onSend={(text) => {
              peerRef.current?.sendChat(text);
              addMessage(true, text);
            }}
            onStartVideo={startVideoRequest}
            onEnd={() => void endConnection()}
          />
        )}
      </div>

      {notice && <Toast>{notice}</Toast>}
      {conn.kind === "requesting" && (
        <RequestingToast onCancel={cancelRequest} />
      )}
      {video === "requesting" && <VideoWaitingToast />}

      {conn.kind === "incoming" && (
        <ConnectionPrompt
          title="A stranger wants to connect"
          acceptLabel="Accept"
          declineLabel="Decline"
          onAccept={acceptIncoming}
          onDecline={declineIncoming}
        />
      )}

      {video === "incoming" && (
        <ConnectionPrompt
          title="Start video call?"
          subtitle="The stranger wants to turn on video."
          acceptLabel="Accept"
          declineLabel="Decline"
          onAccept={acceptVideo}
          onDecline={declineVideo}
        />
      )}
    </main>
  );
}
