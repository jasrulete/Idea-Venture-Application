"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { join, leave, poll, sendSignal } from "@/lib/api";
import { PeerSession, type DescType, type PeerControl } from "@/lib/webrtc";
import { POLL_INTERVAL_MS } from "@/lib/presence";
import { type PeerDot, type SignalMsg, type SignalType } from "@/lib/types";
import type { ChatMessage } from "@/app/components/ChatPanel";

type Conn =
  | { kind: "idle" }
  | { kind: "requesting"; peerId: string }
  | { kind: "incoming"; peerId: string }
  | { kind: "connecting"; peerId: string }
  | { kind: "connected"; peerId: string };

export type VideoState = "none" | "requesting" | "incoming" | "active";

const REQUEST_TIMEOUT_MS = 30_000;

export function usePulseSession(
  sessionId: string,
  coords: { lat: number; lng: number },
) {
  const [peers, setPeers] = useState<PeerDot[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [myLocation, setMyLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [sessionSecret, setSessionSecret] = useState<string | null>(null);
  const sessionSecretRef = useRef<string | null>(null);

  const [conn, _setConn] = useState<Conn>({ kind: "idle" });
  const connRef = useRef<Conn>(conn);
  const setConn = (c: Conn) => {
    connRef.current = c;
    _setConn(c);
  };

  const [video, _setVideo] = useState<VideoState>("none");
  const videoRef = useRef<VideoState>(video);
  const setVideo = (v: VideoState) => {
    videoRef.current = v;
    _setVideo(v);
  };

  const peerRef = useRef<PeerSession | null>(null);
  const msgId = useRef(0);
  const requestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const signal = useCallback(
    async (toId: string, type: SignalType, payload?: string) => {
      const secret = sessionSecretRef.current;
      if (!secret) return false;
      try {
        await sendSignal(sessionId, secret, toId, type, payload);
        return true;
      } catch {
        return false;
      }
    },
    [sessionId],
  );

  const showNotice = useCallback((text: string) => {
    setNotice(text);
    window.setTimeout(() => setNotice(null), 3500);
  }, []);

  const addMessage = useCallback((mine: boolean, text: string) => {
    setMessages((prev) => [...prev, { id: msgId.current++, mine, text }]);
  }, []);

  const teardown = useCallback(
    (message?: string) => {
      if (requestTimer.current) clearTimeout(requestTimer.current);
      peerRef.current?.close();
      peerRef.current = null;
      setLocalStream(null);
      setRemoteStream(null);
      setVideo("none");
      setMessages([]);
      setConn({ kind: "idle" });
      if (message) showNotice(message);
    },
    [showNotice],
  );

  const handleControl = useCallback(
    (ctrl: PeerControl) => {
      const ps = peerRef.current;
      switch (ctrl) {
        case "video-request":
          if (videoRef.current === "none") setVideo("incoming");
          break;
        case "video-accept":
          if (videoRef.current === "requesting" && ps) {
            ps.startVideo()
              .then((stream) => {
                setLocalStream(stream);
                setVideo("active");
              })
              .catch(() => {
                setVideo("none");
                ps.sendControl("video-end");
                showNotice("Camera unavailable.");
              });
          }
          break;
        case "video-decline":
          if (videoRef.current === "requesting") {
            setVideo("none");
            showNotice("Video declined.");
          }
          break;
        case "video-end":
          ps?.stopVideo();
          setLocalStream(null);
          setRemoteStream(null);
          setVideo("none");
          break;
      }
    },
    [showNotice],
  );

  const startPeer = useCallback(
    (peerId: string, initiator: boolean) => {
      const ps = new PeerSession(initiator, {
        onSignal: (type: DescType, payload: string) => {
          void signal(peerId, type, payload);
        },
        onChat: (text) => addMessage(false, text),
        onControl: (ctrl) => handleControl(ctrl),
        onRemoteStream: (stream) => setRemoteStream(stream),
        onConnectionState: (state) => {
          if (state === "failed") {
            teardown("Connection failed (network).");
          }
        },
        onChannelOpen: () => {
          setConn({ kind: "connected", peerId });
        },
      });
      peerRef.current = ps;
    },
    [addMessage, handleControl, signal, teardown],
  );

  const requestConnection = useCallback(
    (peerId: string) => {
      if (connRef.current.kind !== "idle") return;
      const target = peers.find((p) => p.id === peerId);
      if (target?.busy) return;
      setConn({ kind: "requesting", peerId });
      void signal(peerId, "request");
      requestTimer.current = setTimeout(() => {
        if (
          connRef.current.kind === "requesting" &&
          connRef.current.peerId === peerId
        ) {
          void signal(peerId, "end");
          teardown("No answer.");
        }
      }, REQUEST_TIMEOUT_MS);
    },
    [peers, signal, teardown],
  );

  const cancelRequest = useCallback(() => {
    if (connRef.current.kind === "requesting") {
      void signal(connRef.current.peerId, "end");
    }
    teardown();
  }, [signal, teardown]);

  const acceptIncoming = useCallback(() => {
    if (connRef.current.kind !== "incoming") return;
    const peerId = connRef.current.peerId;
    startPeer(peerId, false);
    void signal(peerId, "accept");
    setConn({ kind: "connecting", peerId });
  }, [signal, startPeer]);

  const declineIncoming = useCallback(() => {
    if (connRef.current.kind !== "incoming") return;
    void signal(connRef.current.peerId, "decline");
    setConn({ kind: "idle" });
  }, [signal]);

  const endConnection = useCallback(async () => {
    const c = connRef.current;
    if (c.kind === "connecting" || c.kind === "connected") {
      await signal(c.peerId, "end");
    }
    teardown();
  }, [signal, teardown]);

  const startVideoRequest = useCallback(() => {
    if (videoRef.current !== "none" || !peerRef.current) return;
    setVideo("requesting");
    peerRef.current.sendControl("video-request");
  }, []);

  const acceptVideo = useCallback(() => {
    const ps = peerRef.current;
    if (!ps) return;
    ps.startVideo()
      .then((stream) => {
        setLocalStream(stream);
        ps.sendControl("video-accept");
        setVideo("active");
      })
      .catch(() => {
        ps.sendControl("video-decline");
        setVideo("none");
        showNotice("Camera unavailable.");
      });
  }, [showNotice]);

  const declineVideo = useCallback(() => {
    peerRef.current?.sendControl("video-decline");
    setVideo("none");
  }, []);

  const endVideo = useCallback(() => {
    const ps = peerRef.current;
    ps?.stopVideo();
    ps?.sendControl("video-end");
    setLocalStream(null);
    setRemoteStream(null);
    setVideo("none");
  }, []);

  const toggleAudio = useCallback(() => {
    const ps = peerRef.current;
    if (!ps) return false;
    const next = !ps.isAudioEnabled();
    ps.setAudioEnabled(next);
    return next;
  }, []);

  const toggleVideo = useCallback(() => {
    const ps = peerRef.current;
    if (!ps) return false;
    const next = !ps.isVideoEnabled();
    ps.setVideoEnabled(next);
    return next;
  }, []);

  const processSignal = useCallback(
    (sig: SignalMsg) => {
      switch (sig.type) {
        case "request": {
          if (connRef.current.kind === "idle") {
            setConn({ kind: "incoming", peerId: sig.fromId });
          }
          // When busy/connecting, server auto-declines — do not send decline
          // (that incorrectly cleared busy for active connections).
          break;
        }
        case "accept": {
          const c = connRef.current;
          if (c.kind === "requesting" && c.peerId === sig.fromId) {
            if (requestTimer.current) clearTimeout(requestTimer.current);
            startPeer(sig.fromId, true);
            setConn({ kind: "connecting", peerId: sig.fromId });
          }
          break;
        }
        case "decline": {
          const c = connRef.current;
          if (c.kind === "requesting" && c.peerId === sig.fromId) {
            if (requestTimer.current) clearTimeout(requestTimer.current);
            teardown("Request declined.");
          }
          break;
        }
        case "offer":
        case "answer":
        case "ice": {
          const c = connRef.current;
          const peerId =
            c.kind === "connecting" || c.kind === "connected"
              ? c.peerId
              : null;
          if (peerRef.current && peerId === sig.fromId) {
            void peerRef.current.handleSignal(
              sig.type as DescType,
              sig.payload ?? "",
            );
          }
          break;
        }
        case "end": {
          const c = connRef.current;
          if (
            (c.kind === "incoming" ||
              c.kind === "connecting" ||
              c.kind === "connected") &&
            c.peerId === sig.fromId
          ) {
            if (c.kind === "incoming") setConn({ kind: "idle" });
            else teardown("Stranger disconnected.");
          }
          break;
        }
      }
    },
    [startPeer, teardown],
  );

  const processSignalRef = useRef(processSignal);
  useEffect(() => {
    processSignalRef.current = processSignal;
  });

  const enterLive = useCallback(async (lat: number, lng: number) => {
    const { secret, lat: offsetLat, lng: offsetLng } = await join(
      sessionId,
      lat,
      lng,
    );
    sessionSecretRef.current = secret;
    setSessionSecret(secret);
    setMyLocation({ lat: offsetLat, lng: offsetLng });
  }, [sessionId]);

  useEffect(() => {
    let cancelled = false;
    enterLive(coords.lat, coords.lng).catch(() => {
      if (!cancelled) {
        // join failure surfaces via poll never starting; LiveView can show error
      }
    });
    return () => {
      cancelled = true;
    };
  }, [coords.lat, coords.lng, enterLive]);

  useEffect(() => {
    if (!sessionSecret) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      try {
        const data = await poll(sessionId, sessionSecret);
        if (!active) return;
        setPeers(data.peers);
        for (const s of data.signals) processSignalRef.current(s);
      } catch {}
      if (active) timer = setTimeout(tick, POLL_INTERVAL_MS);
    };
    tick();

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [sessionId, sessionSecret]);

  useEffect(() => {
    const onLeave = () => {
      const secret = sessionSecretRef.current;
      if (secret) leave(sessionId, secret);
    };
    window.addEventListener("pagehide", onLeave);
    window.addEventListener("beforeunload", onLeave);
    return () => {
      window.removeEventListener("pagehide", onLeave);
      window.removeEventListener("beforeunload", onLeave);
    };
  }, [sessionId]);

  return {
    peers,
    messages,
    notice,
    localStream,
    remoteStream,
    myLocation,
    conn,
    video,
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
    addMessage,
  };
}
