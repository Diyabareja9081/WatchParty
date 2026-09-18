type VideoControlsProps = { isPlaying: boolean; currentTime: number; duration: number; canControl: boolean; onPlay: () => void; onPause: () => void; onSeek: (time: number) => void; onRequestSeek: () => void; };

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
};

export default function VideoControls({ isPlaying, currentTime, duration, canControl, onPlay, onPause, onSeek, onRequestSeek }: VideoControlsProps) {
  const maxTime = duration || 100;
  const safeTime = Math.min(Math.max(currentTime, 0), maxTime);

  if (canControl) {
    return (
      <div className="controls">
        <button onClick={isPlaying ? onPause : onPlay}>{isPlaying ? "❚❚  Pause" : "▶  Play"}</button>
        <button onClick={onPause}>Stop</button>
        <div className="seek-control">
          <input aria-label="Video position" type="range" min="0" max={maxTime} step="0.1" value={safeTime} onChange={e => onSeek(Number(e.target.value))} />
          <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
        </div>
        <span>{isPlaying ? "● Playing" : "● Paused"}</span>
      </div>
    );
  }

  return (
    <div className="participant-controls">
      <p>Playback is controlled by the Host or Moderator. Your actions can be sent as requests.</p>
      <button onClick={onPlay}>▶ Request play</button>
      <button onClick={onPause}>❚❚ Request pause</button>
      <div className="seek-request">
        <input aria-label="Requested video position" type="range" min="0" max={maxTime} step="0.1" value={safeTime} onChange={e => onSeek(Number(e.target.value))} />
        <button onClick={onRequestSeek}>Request seek · {formatTime(currentTime)}</button>
      </div>
    </div>
  );
}
