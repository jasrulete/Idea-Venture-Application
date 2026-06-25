"use client";

import { useEffect, useRef, useState } from "react";
import "mapbox-gl/dist/mapbox-gl.css";
import type { Map as MapboxMap, Marker } from "mapbox-gl";
import type { PeerDot } from "@/lib/types";
import MapHud, { ViewModeToggle } from "./MapHud";
import PeerListPanel from "./PeerListPanel";
import RecenterButton from "./RecenterButton";

const TOKEN =
  process.env.NEXT_PUBLIC_MAPBOX_TOKEN ??
  "pk.eyJ1IjoicHVsc2UtbWFwIiwiYSI6ImNrMDBkZW1vMDAwMDAwMDAifQ.AAAAAAAAAAAAAAAAAAAAAA";

function dotColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return `hsl(${Math.abs(hash) % 360}, 70%, 60%)`;
}

export default function WorldMap({
  peers,
  me,
  onPeerClick,
  canConnect,
  viewMode,
  onViewModeChange,
  hidden,
}: {
  peers: PeerDot[];
  me: { lat: number; lng: number } | null;
  onPeerClick: (id: string) => void;
  canConnect: boolean;
  viewMode: "map" | "list";
  onViewModeChange: (mode: "map" | "list") => void;
  hidden?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const markersRef = useRef<Map<string, Marker>>(new Map());
  const meMarkerRef = useRef<Marker | null>(null);
  const [ready, setReady] = useState(false);
  const [showRecenter, setShowRecenter] = useState(false);

  const onPeerClickRef = useRef(onPeerClick);
  const canConnectRef = useRef(canConnect);
  const peersRef = useRef(peers);
  useEffect(() => {
    onPeerClickRef.current = onPeerClick;
    canConnectRef.current = canConnect;
    peersRef.current = peers;
  });

  useEffect(() => {
    if (!TOKEN || !containerRef.current) return;
    let cancelled = false;
    const markers = markersRef.current;

    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      if (cancelled || !containerRef.current) return;
      mapboxgl.accessToken = TOKEN;
      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: "mapbox://styles/mapbox/dark-v11",
        center: me ? [me.lng, me.lat] : [0, 20],
        zoom: me ? 4 : 1.4,
        attributionControl: true,
      });

      map.on("load", () => {
        if (!cancelled) setReady(true);
      });

      map.on("moveend", () => {
        const currentMap = mapRef.current;
        const pin = meMarkerRef.current;
        if (!pin || !currentMap) return;
        const lngLat = pin.getLngLat();
        const bounds = currentMap.getBounds();
        if (!bounds) return;
        const inView = bounds.contains([lngLat.lng, lngLat.lat]);
        setShowRecenter(!inView);
      });

      mapRef.current = map;
    })();

    return () => {
      cancelled = true;
      markers.forEach((m) => m.remove());
      markers.clear();
      meMarkerRef.current?.remove();
      meMarkerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !me) return;
    let cancelled = false;

    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      if (cancelled) return;
      if (!meMarkerRef.current) {
        const el = document.createElement("div");
        el.className = "pulse-me";
        el.title = "You are here";
        el.innerHTML = `<span class="pulse-me-label">You</span>`;
        meMarkerRef.current = new mapboxgl.Marker({
          element: el,
          anchor: "center",
        })
          .setLngLat([me.lng, me.lat])
          .addTo(map);
        map.flyTo({ center: [me.lng, me.lat], zoom: 4.2, duration: 1800 });
      } else {
        meMarkerRef.current.setLngLat([me.lng, me.lat]);
      }
      setShowRecenter(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [me, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    let cancelled = false;

    (async () => {
      if (cancelled) return;
      const markers = markersRef.current;
      const seen = new Set<string>();

      for (const peer of peers) {
        seen.add(peer.id);
        let marker = markers.get(peer.id);
        if (!marker) {
          const el = document.createElement("button");
          el.type = "button";
          el.className = "pulse-dot";
          el.style.background = dotColor(peer.id);
          el.title = peer.busy ? "In a conversation" : "Tap to connect";
          el.addEventListener("click", (e) => {
            e.stopPropagation();
            const p = peersRef.current.find((x) => x.id === peer.id);
            if (p?.busy || !canConnectRef.current) return;
            onPeerClickRef.current(peer.id);
          });
          const mapboxgl = (await import("mapbox-gl")).default;
          marker = new mapboxgl.Marker({ element: el })
            .setLngLat([peer.lng, peer.lat])
            .addTo(map);
          markers.set(peer.id, marker);
        } else {
          marker.setLngLat([peer.lng, peer.lat]);
        }
        const el = marker.getElement() as HTMLElement;
        el.className = peer.busy ? "pulse-dot pulse-dot--busy" : "pulse-dot";
        el.title = peer.busy ? "In a conversation" : "Tap to connect";
        el.style.background = peer.busy ? "" : dotColor(peer.id);
        el.style.pointerEvents = peer.busy ? "none" : "auto";
      }

      for (const [id, marker] of markers) {
        if (!seen.has(id)) {
          marker.remove();
          markers.delete(id);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [peers, ready]);

  function recenter() {
    const map = mapRef.current;
    if (!map || !me) return;
    map.flyTo({ center: [me.lng, me.lat], zoom: 4.2, duration: 900 });
    setShowRecenter(false);
  }

  return (
    <div
      className={`absolute inset-0 ${hidden ? "pointer-events-none invisible" : ""}`}
    >
      <div ref={containerRef} className="h-full w-full bg-zinc-900" />
      <div className="map-vignette" aria-hidden />

      {!TOKEN && (
        <div className="absolute inset-0 z-20 flex items-center justify-center p-6 text-center">
          <p className="max-w-md rounded-lg bg-zinc-800 p-4 text-sm text-zinc-200">
            Set{" "}
            <code className="text-emerald-400">NEXT_PUBLIC_MAPBOX_TOKEN</code> in{" "}
            <code>.env</code> to load the map.
          </p>
        </div>
      )}

      <MapHud peerCount={peers.length} />
      {viewMode === "map" && showRecenter && me && (
        <RecenterButton onClick={recenter} />
      )}
      {!hidden && (
        <ViewModeToggle mode={viewMode} onChange={onViewModeChange} />
      )}

      {viewMode === "list" && (
        <PeerListPanel
          peers={peers}
          me={me}
          canConnect={canConnect}
          onPeerClick={onPeerClick}
        />
      )}
    </div>
  );
}
