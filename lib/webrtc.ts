export type DescType = "offer" | "answer" | "ice";
export type PeerControl =
  | "video-request"
  | "video-accept"
  | "video-decline"
  | "video-end";

export type FacingMode = "user" | "environment";

interface PeerCallbacks {
  onSignal: (type: DescType, payload: string) => void;
  onChat: (text: string) => void;
  onControl: (ctrl: PeerControl) => void;
  onIntro: (nick: string) => void;
  onRemoteStream: (stream: MediaStream | null) => void;
  onConnectionState: (state: RTCPeerConnectionState) => void;
  onChannelOpen: () => void;
}

const ICE_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export class PeerSession {
  private pc: RTCPeerConnection;
  private dc: RTCDataChannel | null = null;
  private readonly polite: boolean;
  private makingOffer = false;
  private ignoreOffer = false;
  private localStream: MediaStream | null = null;
  private closed = false;
  private readonly cb: PeerCallbacks;
  private pendingCandidates: RTCIceCandidateInit[] = [];
  private facingMode: FacingMode = "user";
  private pendingIntro: string | null = null;

  constructor(initiator: boolean, cb: PeerCallbacks) {
    this.cb = cb;
    this.polite = !initiator;
    this.pc = new RTCPeerConnection(ICE_CONFIG);

    this.pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        this.cb.onSignal("ice", JSON.stringify(candidate));
      }
    };

    this.pc.onnegotiationneeded = async () => {
      try {
        this.makingOffer = true;
        await this.pc.setLocalDescription();
        if (this.pc.localDescription) {
          this.cb.onSignal("offer", JSON.stringify(this.pc.localDescription));
        }
      } finally {
        this.makingOffer = false;
      }
    };

    this.pc.ontrack = ({ streams }) => {
      this.cb.onRemoteStream(streams[0] ?? null);
    };

    this.pc.onconnectionstatechange = () => {
      this.cb.onConnectionState(this.pc.connectionState);
    };

    if (initiator) {
      this.dc = this.pc.createDataChannel("chat");
      this.wireDataChannel(this.dc);
    } else {
      this.pc.ondatachannel = (e) => {
        this.dc = e.channel;
        this.wireDataChannel(this.dc);
      };
    }
  }

  private wireDataChannel(dc: RTCDataChannel) {
    dc.onopen = () => {
      if (this.pendingIntro) {
        this.safeSend({ t: "intro", nick: this.pendingIntro });
        this.pendingIntro = null;
      }
      this.cb.onChannelOpen();
    };
    dc.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data as string);
        if (msg.t === "chat" && typeof msg.text === "string") {
          this.cb.onChat(msg.text);
        } else if (msg.t === "ctrl" && typeof msg.ctrl === "string") {
          this.cb.onControl(msg.ctrl as PeerControl);
        } else if (msg.t === "intro" && typeof msg.nick === "string") {
          this.cb.onIntro(msg.nick);
        }
      } catch {}
    };
  }

  async handleSignal(type: DescType, payload: string) {
    if (this.closed) return;
    const data = JSON.parse(payload);

    if (type === "ice") {
      if (!this.pc.remoteDescription) {
        this.pendingCandidates.push(data);
        return;
      }
      try {
        await this.pc.addIceCandidate(data);
      } catch {}
      return;
    }

    const desc = data as RTCSessionDescriptionInit;
    const offerCollision =
      desc.type === "offer" &&
      (this.makingOffer || this.pc.signalingState !== "stable");
    this.ignoreOffer = !this.polite && offerCollision;
    if (this.ignoreOffer) return;

    await this.pc.setRemoteDescription(desc);
    if (desc.type === "offer") {
      await this.pc.setLocalDescription();
      if (this.pc.localDescription) {
        this.cb.onSignal("answer", JSON.stringify(this.pc.localDescription));
      }
    }
    await this.flushPendingCandidates();
  }

  private async flushPendingCandidates() {
    if (this.pendingCandidates.length === 0) return;
    const queued = this.pendingCandidates;
    this.pendingCandidates = [];
    for (const candidate of queued) {
      try {
        await this.pc.addIceCandidate(candidate);
      } catch {}
    }
  }

  sendChat(text: string) {
    this.safeSend({ t: "chat", text });
  }

  sendIntro(nick: string) {
    const trimmed = nick.trim();
    if (!trimmed) return;
    if (this.dc?.readyState === "open") {
      this.safeSend({ t: "intro", nick: trimmed });
    } else {
      this.pendingIntro = trimmed;
    }
  }

  sendControl(ctrl: PeerControl) {
    this.safeSend({ t: "ctrl", ctrl });
  }

  private safeSend(obj: unknown) {
    if (this.dc && this.dc.readyState === "open") {
      this.dc.send(JSON.stringify(obj));
    }
  }

  async startVideo(): Promise<MediaStream> {
    if (!this.localStream) {
      this.localStream = await this.getUserMedia();
      for (const track of this.localStream.getTracks()) {
        this.pc.addTrack(track, this.localStream);
      }
    }
    return this.localStream;
  }

  private async getUserMedia(): Promise<MediaStream> {
    return navigator.mediaDevices.getUserMedia({
      video: { facingMode: this.facingMode },
      audio: true,
    });
  }

  setAudioEnabled(enabled: boolean) {
    this.localStream
      ?.getAudioTracks()
      .forEach((track) => (track.enabled = enabled));
  }

  setVideoEnabled(enabled: boolean) {
    this.localStream
      ?.getVideoTracks()
      .forEach((track) => (track.enabled = enabled));
  }

  isAudioEnabled(): boolean {
    const track = this.localStream?.getAudioTracks()[0];
    return track ? track.enabled : false;
  }

  isVideoEnabled(): boolean {
    const track = this.localStream?.getVideoTracks()[0];
    return track ? track.enabled : false;
  }

  async switchCamera(): Promise<MediaStream | null> {
    if (!this.localStream) return null;
    this.facingMode = this.facingMode === "user" ? "environment" : "user";

    const newStream = await this.getUserMedia();
    const newVideo = newStream.getVideoTracks()[0];
    const newAudio = newStream.getAudioTracks()[0];
    if (!newVideo) return this.localStream;

    const oldVideo = this.localStream.getVideoTracks()[0];
    const oldAudio = this.localStream.getAudioTracks()[0];
    const sender = this.pc.getSenders().find((s) => s.track?.kind === "video");

    if (sender) {
      await sender.replaceTrack(newVideo);
    } else {
      this.pc.addTrack(newVideo, this.localStream);
    }

    if (oldVideo) {
      oldVideo.stop();
      this.localStream.removeTrack(oldVideo);
    }
    this.localStream.addTrack(newVideo);

    if (newAudio && oldAudio) {
      const audioSender = this.pc
        .getSenders()
        .find((s) => s.track?.kind === "audio");
      if (audioSender) await audioSender.replaceTrack(newAudio);
      oldAudio.stop();
      this.localStream.removeTrack(oldAudio);
      this.localStream.addTrack(newAudio);
    } else {
      newStream.getTracks().forEach((t) => {
        if (t !== newVideo) t.stop();
      });
    }

    return this.localStream;
  }

  stopVideo() {
    if (this.localStream) {
      for (const track of this.localStream.getTracks()) track.stop();
      for (const sender of this.pc.getSenders()) {
        if (sender.track) {
          try {
            this.pc.removeTrack(sender);
          } catch {}
        }
      }
      this.localStream = null;
    }
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.stopVideo();
    if (this.dc) {
      try {
        this.dc.close();
      } catch {}
    }
    try {
      this.pc.close();
    } catch {}
  }
}
