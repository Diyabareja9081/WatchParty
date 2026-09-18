import { useEffect, useRef, useState } from "react";
import YouTube from "react-youtube";
import type { YouTubeProps } from "react-youtube";

type VideoPlayerProps = {
  videoId: string;
  onReady: YouTubeProps["onReady"];
  onStateChange?: YouTubeProps["onStateChange"];
  canControl: boolean;
};

const ZOOM_LEVELS = [1, 1.1, 1.2, 1.3, 1.4];

export default function VideoPlayer({ videoId, onReady, onStateChange, canControl }: VideoPlayerProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [zoomIndex, setZoomIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const zoom = ZOOM_LEVELS[zoomIndex];

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(document.fullscreenElement === wrapperRef.current);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    if (!wrapperRef.current) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await wrapperRef.current.requestFullscreen();
    } catch { /* Browser may deny fullscreen in restricted contexts. */ }
  };

  if (!videoId) {
    return (
      <div className="video-player-wrapper video-player-empty">
        <div className="video-player-placeholder">
          <span className="video-player-placeholder-icon">🎬</span>
          <p>No video yet</p>
          <small>{canControl ? "Paste a YouTube URL below to start the party." : "Waiting for the Host or a Moderator to pick a video."}</small>
        </div>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className={`video-player-wrapper${isFullscreen ? " video-player-fullscreen" : ""}`}>
      <div className="youtube-player-frame" style={{ transform: `scale(${zoom})` }}>
        <YouTube videoId={videoId} onReady={onReady} onStateChange={onStateChange} opts={{ width: "100%", height: "100%", playerVars: { autoplay: 0, controls: 0, rel: 0, playsinline: 1, modestbranding: 1, origin: window.location.origin } }} className="youtube-player" />
      </div>
      {!canControl && <div className="video-click-guard" aria-hidden="true" />}
      <div className="video-player-actions" aria-label="Video display controls">
        <button type="button" onClick={() => setZoomIndex(i => Math.max(0, i - 1))} disabled={zoomIndex === 0} aria-label="Zoom out" title="Zoom out">−</button>
        <span className="zoom-level" aria-live="polite">{Math.round(zoom * 100)}%</span>
        <button type="button" onClick={() => setZoomIndex(i => Math.min(ZOOM_LEVELS.length - 1, i + 1))} disabled={zoomIndex === ZOOM_LEVELS.length - 1} aria-label="Zoom in" title="Zoom in">+</button>
        <button type="button" className="fullscreen-btn" onClick={toggleFullscreen} aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"} title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}>⛶</button>
      </div>
    </div>
  );
}
