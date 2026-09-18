type HomeScreenProps = {
  username: string; setUsername: (value: string) => void; password: string; setPassword: (value: string) => void;
  authenticated: boolean; authLoading: boolean; onRegister: () => void; onLogin: () => void; onLogout: () => void;
  roomInput: string; setRoomInput: (value: string) => void; onCreateRoom: () => void; onJoinRoom: () => void; message: string;
};

export default function HomeScreen({ username, setUsername, password, setPassword, authenticated, authLoading, onRegister, onLogin, onLogout, roomInput, setRoomInput, onCreateRoom, onJoinRoom, message }: HomeScreenProps) {
  return (
    <div className="home-screen">
      {/* Background video. Drop an .mp4 at client/public/background-video.mp4
          (and optionally a matching poster image at
          client/public/background-poster.jpg) to enable it — if the file
          isn't there, the browser just shows nothing here and the existing
          gradient background underneath still looks fine on its own. */}
      <video
        className="home-bg-video"
        autoPlay
        muted
        loop
        playsInline
        poster="/background-poster.jpg"
      >
        <source src="/background-video.mp4" type="video/mp4" />
      </video>
      <div className="home-bg-overlay" />

      <div className="home-shell">
        <section className="home-copy">
          <div className="brand-mark"><span className="brand-mark-icon">▶</span> WatchParty</div>
          <div className="home-title">
            <h1>Watch together.<br /><span>Stay in sync.</span></h1>
            <p>A shared viewing room for friends, teams and communities. One video, one timeline, everyone together.</p>
          </div>
          <div className="home-features">
            <div className="home-feature"><span className="home-feature-dot" /> Real-time playback</div>
            <div className="home-feature"><span className="home-feature-dot" /> Private rooms</div>
            <div className="home-feature"><span className="home-feature-dot" /> Live chat & reactions</div>
          </div>
        </section>

        <section className="home-card">
          <div className="home-card-header">
            <span>{authenticated ? "Your watch room" : "Welcome back"}</span>
            <h2>{authenticated ? "Start watching" : "Join the party"}</h2>
          </div>

          {!authenticated ? (
            <>
              <div className="input-box"><input autoComplete="username" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} onKeyDown={e => { if (e.key === "Enter") onLogin(); }} disabled={authLoading} /></div>
              <div className="input-box"><input autoComplete="current-password" type="password" placeholder="Password · 6+ characters" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => { if (e.key === "Enter") onLogin(); }} disabled={authLoading} /></div>
              <div className="room-options">
                <button className="create-room-btn" onClick={onLogin} disabled={authLoading}>{authLoading ? "Signing in…" : "Sign in"}</button>
                <button className="join-room-btn" onClick={onRegister} disabled={authLoading}>{authLoading ? "Please wait…" : "Create account"}</button>
              </div>
            </>
          ) : (
            <>
              <p className="home-message" style={{ textAlign: "left", marginTop: 0, marginBottom: 14 }}>Signed in as <b>{username}</b></p>
              <div className="input-box"><input aria-label="Room code" placeholder="Room code · e.g. ABC123" value={roomInput} onChange={e => setRoomInput(e.target.value.toUpperCase())} onKeyDown={e => { if (e.key === "Enter" && roomInput.trim()) onJoinRoom(); }} /></div>
              <div className="room-options">
                <button className="create-room-btn" onClick={onCreateRoom}>Create room</button>
                <button className="join-room-btn" onClick={onJoinRoom}>Join room</button>
              </div>
              <button onClick={onLogout}>Sign out</button>
            </>
          )}
          {message && <p className="home-message" role="status">{message}</p>}
        </section>
      </div>
    </div>
  );
}
