/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";
import type { YouTubePlayer } from "react-youtube";

import "./App.css";
import { socket } from "./socket";

import HomeScreen from "./components/HomeScreen";
import RoomHeader from "./components/RoomHeader";
import VideoPlayer from "./components/VedioPlayr";
import VideoControls from "./components/VideoControls";
import ParticipantList from "./components/ParticipantList";
import RequestsPanel from "./components/RequestsPanel";
import PermissionInfo from "./components/PermissionInfo";

import { useRoomSocket } from "./hooks/useRoomSocket";
import { usePlaybackSync } from "./hooks/usePlaybackSync";
import { useYouTubePlayer } from "./hooks/useYouTubePlayer";

import { extractVideoId } from "./utils/youtube";

import type {
  Role,
  Participant,
  ControlRequest,
} from "./types";

type Screen = "home" | "dashboard" | "watch";

function App() {
  useRoomSocket();

  const [screen, setScreen] =
    useState<Screen>("home");

  const [username, setUsername] = useState(() => localStorage.getItem("watch_party_username") || "");
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(() => Boolean(localStorage.getItem("watch_party_token")));
  const [authLoading, setAuthLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");

  const [myUserId, setMyUserId] =
    useState("");

  const [roomInput, setRoomInput] =
    useState(() => new URLSearchParams(window.location.search).get("room")?.toUpperCase() ?? "");

  const [roomId, setRoomId] =
    useState("");

  const [myRole, setMyRole] =
    useState<Role>("Participant");

  const [participants, setParticipants] =
    useState<Participant[]>([]);

  const [videoId, setVideoId] =
    useState("");

  const [videoInput, setVideoInput] =
    useState("");

  const [playState, setPlayState] =
    useState<"playing" | "paused">("paused");

  const [currentTime, setCurrentTime] =
    useState(0);

  const [duration, setDuration] =
    useState(0);

  const [requests, setRequests] =
    useState<ControlRequest[]>([]);

  const [message, setMessage] =
    useState(() => new URLSearchParams(window.location.search).get("room") ? "Room link detected. Enter your name and join the room." : "");

  const [notification, setNotification] =
    useState<ControlRequest | null>(null);

  const playerRef =
    useRef<YouTubePlayer | null>(null);

  const isApplyingRemoteState =
    useRef(false);

  const myUserIdRef =
    useRef("");

  const myRoleRef =
    useRef<Role>("Participant");

  const playStateRef =
    useRef<"playing" | "paused">("paused");

  // Tracked so the reconnect handler (registered once) always sees the
  // latest values without re-subscribing on every render.
  const roomIdRef =
    useRef("");

  const usernameRef =
    useRef("");

  const screenRef =
    useRef<Screen>("home");

  // True only while we're silently re-joining after a dropped connection
  // (mobile networks do this constantly: screen lock, backgrounding,
  // switching wifi/cellular). Lets handleRoomJoined skip the "jump to
  // dashboard" behavior it does for a genuine, user-initiated join.
  const isReconnectJoinRef =
    useRef(false);

  const isController =
    myRole === "Host" ||
    myRole === "Moderator";

  useEffect(() => {
    myUserIdRef.current = myUserId;
  }, [myUserId]);

  useEffect(() => {
    myRoleRef.current = myRole;
  }, [myRole]);

  useEffect(() => {
    playStateRef.current = playState;
  }, [playState]);

  useEffect(() => {
    roomIdRef.current = roomId;
  }, [roomId]);

  useEffect(() => {
    usernameRef.current = username;
  }, [username]);

  useEffect(() => {
    screenRef.current = screen;
  }, [screen]);

  /*
   * Read ?room=ROOMCODE from a copied room link.
   * The user still enters their own username before joining.
   */
  const applySyncState = (
    incomingVideoId: string,
    incomingTime: number,
    incomingPlayState:
      | "playing"
      | "paused",
    serverTime?: number
  ) => {
    let targetTime =
      incomingTime;

    if (
      incomingPlayState === "playing" &&
      serverTime
    ) {
      const delay =
        (Date.now() - serverTime) / 1000;

      targetTime += delay;
    }

    targetTime = Math.max(
      0,
      targetTime
    );

    // Always reflect the room's state, even before a video
    // player exists (e.g. no video has been picked yet). This
    // is what makes the video appear at all once the Host
    // chooses one: setting videoId here mounts the <YouTube>
    // player for the first time.
    setVideoId(
      incomingVideoId
    );

    setCurrentTime(
      targetTime
    );

    setPlayState(
      incomingPlayState
    );

    // Nothing selected yet, or the player hasn't mounted yet
    // (it mounts once videoId above becomes non-empty, then
    // calls request_sync itself and re-enters this function).
    if (!incomingVideoId || !playerRef.current) {
      return;
    }

    isApplyingRemoteState.current =
      true;

    try {
      const currentPlayerVideo =
        playerRef.current
          .getVideoData()
          ?.video_id;

      if (
        currentPlayerVideo !==
        incomingVideoId
      ) {
        // loadVideoById always starts playback, regardless of
        // the intended play state, so it needs an explicit
        // pause immediately after when the room isn't playing.
        playerRef.current.loadVideoById(
          incomingVideoId,
          targetTime
        );

        if (
          incomingPlayState !==
          "playing"
        ) {
          playerRef.current.pauseVideo();
        }
      } else {
        playerRef.current.seekTo(
          targetTime,
          true
        );

        if (
          incomingPlayState ===
          "playing"
        ) {
          playerRef.current.playVideo();
        } else {
          playerRef.current.pauseVideo();
        }
      }
    } catch {
      // Player may not be ready yet.
    }

    setTimeout(() => {
      isApplyingRemoteState.current =
        false;
    }, 500);
  };

  const { handlePlayerReady, handlePlayerStateChange } =
    useYouTubePlayer({
      playerRef,
      setDuration,

      onReady: () => {
        socket.emit("request_sync");
      },

      /*
       * Handles play/pause triggered by clicking directly
       * on the video (native YouTube toggle), not just our
       * custom buttons. Only the controller's clicks are
       * broadcast, and we skip anything caused by us
       * applying another user's state (isApplyingRemoteState)
       * to avoid an emit feedback loop.
       */
      onStateChange: (state) => {
        if (isApplyingRemoteState.current) {
          return;
        }

        if (
          myRoleRef.current !== "Host" &&
          myRoleRef.current !== "Moderator"
        ) {
          return;
        }

        const YT_PLAYING = 1;
        const YT_PAUSED = 2;

        if (
          state === YT_PLAYING &&
          playStateRef.current !== "playing"
        ) {
          socket.emit("play");
        } else if (
          state === YT_PAUSED &&
          playStateRef.current !== "paused"
        ) {
          socket.emit("pause");
        }
      },
    });

  /*
   * SOCKET EVENTS
   */
  useEffect(() => {
    const handleRoomCreated = (
      data: any
    ) => {
      setRoomId(data.roomId);
      setMyUserId(data.userId);
      setMyRole(data.role);
      setParticipants(
        data.participants
      );

      setScreen("dashboard");

      setMessage(
        `Room created: ${data.roomId}`
      );
    };

    const handleRoomJoined = (
      data: any
    ) => {
      setRoomId(data.roomId);
      setMyUserId(data.userId);
      setMyRole(data.role);
      setParticipants(data.participants);
      setChatMessages(data.messages || []);

      setVideoId(data.playback.videoId);

      setCurrentTime(
        data.playback.currentTime
      );

      setPlayState(
        data.playback.playState
      );

      if (isReconnectJoinRef.current) {
        isReconnectJoinRef.current = false;
        setMessage("Reconnected.");
      } else {
        setScreen("dashboard");
      }

      setTimeout(() => {
        applySyncState(
          data.playback.videoId,
          data.playback.currentTime,
          data.playback.playState,
          data.playback.serverTime
        );
      }, 500);
    };

    const handleSyncState = (
      data: any
    ) => {
      applySyncState(
        data.videoId,
        data.currentTime,
        data.playState,
        data.serverTime
      );
    };

    const handleParticipantsUpdated = (
      data: any
    ) => {
      setParticipants(
        data.participants
      );
    };

    const handleUserJoined = (
      data: any
    ) => {
      setParticipants(
        data.participants
      );

      setMessage(
        `${data.username} joined the room`
      );
    };

    const handleUserLeft = (
      data: any
    ) => {
      setParticipants(
        data.participants
      );

      setMessage(
        `${data.username} left the room`
      );
    };

    const handleHostTransferred = (data: any) => {
      setParticipants(data.participants);
      const me = data.participants.find((p: any) => p.userId === myUserIdRef.current);
      if (me) setMyRole(me.role);
      setMessage(`Host transferred to ${data.username}`);
    };

    const handleRoleAssigned = (
      data: any
    ) => {
      setParticipants(
        data.participants
      );

      if (
        data.userId ===
        myUserIdRef.current
      ) {
        setMyRole(data.role);
      }

      setMessage(
        `${data.username} is now ${data.role}`
      );
    };

    const handleControlRequest = (
      request: ControlRequest
    ) => {
      setRequests(
        (previous) => {
          const alreadyExists =
            previous.some(
              (item) =>
                item.requestId ===
                request.requestId
            );

          if (alreadyExists) {
            return previous;
          }

          return [
            ...previous,
            request,
          ];
        }
      );

      if (
        myRoleRef.current === "Host" ||
        myRoleRef.current === "Moderator"
      ) {
        setNotification(request);

        setTimeout(() => {
          setNotification(
            (current) =>
              current?.requestId ===
              request.requestId
                ? null
                : current
          );
        }, 8000);
      }
    };

    const handleRequestResolved = (
      data: any
    ) => {
      setRequests(
        (previous) =>
          previous.filter(
            (request) =>
              request.requestId !==
              data.requestId
          )
      );

      setNotification(
        (current) =>
          current?.requestId ===
          data.requestId
            ? null
            : current
      );
    };

    const handleRequestSubmitted = (
      data: any
    ) => {
      setMessage(
        data.message
      );
    };

    const handlePermissionDenied = (
      data: any
    ) => {
      setMessage(
        data.message
      );
    };

    const handleErrorMessage = (
      data: any
    ) => {
      isReconnectJoinRef.current = false;

      setMessage(
        data.message
      );
    };

    const handleParticipantRemoved = (
      data: any
    ) => {
      setParticipants(
        data.participants
      );

      if (
        data.userId ===
        myUserIdRef.current
      ) {
        setScreen("home");

        setRoomId("");

        setMyRole(
          "Participant"
        );

        setParticipants([]);

        setRequests([]);

        setNotification(null);

        setMessage(
          "You were removed from the room."
        );
      }
    };

    const handleRoomClosed = (
      data: any
    ) => {
      isReconnectJoinRef.current = false;

      setScreen("home");

      setRoomId("");

      setMyRole(
        "Participant"
      );

      setParticipants([]);

      setRequests([]);

      setNotification(null);

      setMessage(
        data.message
      );
    };

    socket.on(
      "room_created",
      handleRoomCreated
    );

    socket.on(
      "room_joined",
      handleRoomJoined
    );

    socket.on(
      "sync_state",
      handleSyncState
    );

    socket.on(
      "participants_updated",
      handleParticipantsUpdated
    );

    socket.on(
      "user_joined",
      handleUserJoined
    );

    socket.on(
      "user_left",
      handleUserLeft
    );

    socket.on("host_transferred", handleHostTransferred);

    socket.on(
      "role_assigned",
      handleRoleAssigned
    );

    socket.on(
      "control_request",
      handleControlRequest
    );

    socket.on(
      "request_resolved",
      handleRequestResolved
    );

    socket.on(
      "request_submitted",
      handleRequestSubmitted
    );

    socket.on(
      "permission_denied",
      handlePermissionDenied
    );

    socket.on(
      "error_message",
      handleErrorMessage
    );

    socket.on(
      "participant_removed",
      handleParticipantRemoved
    );

    socket.on(
      "room_closed",
      handleRoomClosed
    );

    const handleChatMessage = (data: any) => setChatMessages(previous => [...previous, data].slice(-100));
    const handleReaction = (data: any) => setMessage(`${data.username} reacted ${data.emoji}`);
    socket.on("chat_message", handleChatMessage);
    socket.on("reaction", handleReaction);

    return () => {
      socket.off(
        "room_created",
        handleRoomCreated
      );

      socket.off(
        "room_joined",
        handleRoomJoined
      );

      socket.off(
        "sync_state",
        handleSyncState
      );

      socket.off(
        "participants_updated",
        handleParticipantsUpdated
      );

      socket.off(
        "user_joined",
        handleUserJoined
      );

      socket.off(
        "user_left",
        handleUserLeft
      );

      socket.off("host_transferred", handleHostTransferred);

      socket.off(
        "role_assigned",
        handleRoleAssigned
      );

      socket.off(
        "control_request",
        handleControlRequest
      );

      socket.off(
        "request_resolved",
        handleRequestResolved
      );

      socket.off(
        "request_submitted",
        handleRequestSubmitted
      );

      socket.off(
        "permission_denied",
        handlePermissionDenied
      );

      socket.off(
        "error_message",
        handleErrorMessage
      );

      socket.off(
        "participant_removed",
        handleParticipantRemoved
      );

      socket.off(
        "room_closed",
        handleRoomClosed
      );
      socket.off("chat_message", handleChatMessage);
      socket.off("reaction", handleReaction);
    };
  }, []);

  /*
   * PERIODIC SYNC WHILE WATCHING
   */
  usePlaybackSync({
    enabled:
      screen === "watch",

    onSync: () => {
      socket.emit(
        "request_sync"
      );
    },
  });

  /*
   * RECONNECTION HANDLING
   *
   * Mobile browsers drop the underlying socket far more often than
   * desktop ones (screen lock, backgrounding the tab, switching between
   * wifi and cellular). socket.io-client reconnects automatically, but
   * a reconnect gets a brand-new socket id, so the server no longer
   * recognizes it as a member of the room until we re-join. Without
   * this, playback just silently stops syncing after any brief drop.
   */
  useEffect(() => {
    const handleConnect = () => {
      if (
        roomIdRef.current &&
        screenRef.current !== "home"
      ) {
        isReconnectJoinRef.current = true;

        socket.emit("join_room", {
          roomId: roomIdRef.current,
          username: usernameRef.current,
        });
      }
    };

    const handleDisconnect = () => {
      if (screenRef.current !== "home") {
        setMessage("Connection lost — reconnecting...");
      }
    };

    // A stored session token can be expired, corrupted, or revoked (the
    // account was deleted, the server restarted with a new JWT secret,
    // etc). Without this, the socket just fails auth over and over with
    // no feedback and the app looks silently broken.
    const handleConnectError = (error: Error) => {
      const authFailed = /token|auth/i.test(error?.message || "");

      if (authFailed) {
        socket.disconnect();
        localStorage.removeItem("watch_party_token");
        setAuthenticated(false);
        setScreen("home");
        setRoomId("");
        setMessage("Your session expired. Please sign in again.");
      }
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
    };
  }, []);

  const authenticate = async (mode: "login" | "register") => {
    if (authLoading) return;
    if (!username.trim() || password.length < 6) { setMessage("Enter a username and a password with at least 6 characters."); return; }
    setAuthLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || window.location.origin}/api/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: username.trim(), password }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Authentication failed.");
      localStorage.setItem("watch_party_token", data.token);
      localStorage.setItem("watch_party_username", data.user.username);
      setAuthenticated(true); setUsername(data.user.username); setPassword("");
      if (!socket.connected) socket.connect();
      setMessage(mode === "register" ? "Account created." : "Logged in.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Authentication failed."); }
    finally { setAuthLoading(false); }
  };

  const logout = () => {
    socket.disconnect(); localStorage.removeItem("watch_party_token"); setAuthenticated(false); setScreen("home"); setRoomId(""); setParticipants([]); setRequests([]); setChatMessages([]); setMessage("Logged out.");
  };

  /*
   * ROOM ACTIONS
   */
  const createRoom = () => {
    if (!username.trim()) {
      setMessage(
        "Enter your name first."
      );
      return;
    }

    socket.emit(
      "create_room",
      {
        username:
          username.trim(),
      }
    );
  };

  const joinRoom = () => {
    if (!username.trim()) {
      setMessage(
        "Enter your name first."
      );
      return;
    }

    if (!roomInput.trim()) {
      setMessage(
        "Enter a room code."
      );
      return;
    }

    socket.emit(
      "join_room",
      {
        roomId:
          roomInput.trim().toUpperCase(),
        username:
          username.trim(),
      }
    );
  };

  /*
   * PLAYBACK
   */
  const play = () => {
    if (!isController) {
      socket.emit(
        "request_action",
        {
          action: "play",
        }
      );
      return;
    }

    socket.emit("play");
  };

  const pause = () => {
    if (!isController) {
      socket.emit(
        "request_action",
        {
          action: "pause",
        }
      );
      return;
    }

    socket.emit("pause");
  };

  const seek = (
    time: number
  ) => {
    setCurrentTime(time);

    if (!isController) {
      return;
    }

    socket.emit(
      "seek",
      {
        time,
      }
    );
  };

  const requestSeek = () => {
    socket.emit(
      "request_action",
      {
        action: "seek",
        time: currentTime,
      }
    );

    setMessage(
      "Seek request sent for approval."
    );
  };

  const changeVideo = () => {
    const newVideoId =
      extractVideoId(
        videoInput
      );

    if (!newVideoId) {
      setMessage(
        "Please enter a valid YouTube URL."
      );
      return;
    }

    if (!isController) {
      socket.emit(
        "request_action",
        {
          action:
            "change_video",
          videoId:
            newVideoId,
        }
      );

      setMessage(
        "Video change request sent."
      );

      setVideoInput("");

      return;
    }

    socket.emit(
      "change_video",
      {
        videoId:
          newVideoId,
      }
    );

    setVideoInput("");
  };

  /*
   * REQUESTS
   */
  const approveRequest = (
    requestId: string
  ) => {
    socket.emit(
      "approve_request",
      {
        requestId,
      }
    );
  };

  const rejectRequest = (
    requestId: string
  ) => {
    socket.emit(
      "reject_request",
      {
        requestId,
      }
    );
  };

  /*
   * HOST ROLE MANAGEMENT
   */
  const makeModerator = (
    userId: string
  ) => {
    socket.emit(
      "assign_role",
      {
        userId,
        role: "Moderator",
      }
    );
  };

  const makeParticipant = (
    userId: string
  ) => {
    socket.emit(
      "assign_role",
      {
        userId,
        role: "Participant",
      }
    );
  };

  const transferHost = (userId: string) => { socket.emit("transfer_host", { userId }); };

  const removeParticipant = (
    userId: string
  ) => {
    socket.emit(
      "remove_participant",
      {
        userId,
      }
    );
  };

  /*
   * LEAVE
   */
  const leaveRoom = () => {
    socket.emit(
      "leave_room"
    );

    setScreen("home");

    setRoomId("");

    setParticipants([]);

    setRequests([]);

    setNotification(null);

    setMyRole(
      "Participant"
    );

    setMyUserId("");

    setVideoId(
      ""
    );

    setCurrentTime(0);

    setPlayState("paused");

    setVideoInput("");

    setMessage(
      "You left the room."
    );

    window.history.replaceState(
      {},
      "",
      window.location.pathname
    );
  };

  /*
   * ROOM LINK
   */
  const copyRoomLink = async () => {
    const link =
      `${window.location.origin}/?room=${roomId}`;

    try {
      await navigator.clipboard.writeText(
        link
      );

      setMessage(
        "Room link copied!"
      );
    } catch {
      setMessage(
        "Could not copy the room link."
      );
    }
  };

  /*
   * POPUP ACTIONS
   */
  const approveNotification = () => {
    if (!notification) {
      return;
    }

    approveRequest(
      notification.requestId
    );

    setNotification(null);
  };

  const rejectNotification = () => {
    if (!notification) {
      return;
    }

    rejectRequest(
      notification.requestId
    );

    setNotification(null);
  };

  /*
   * HOME
   */
  if (screen === "home") {
    return (
      <HomeScreen
        username={username}
        setUsername={setUsername}
        password={password}
        setPassword={setPassword}
        authenticated={authenticated}
        authLoading={authLoading}
        onRegister={() => authenticate("register")}
        onLogin={() => authenticate("login")}
        onLogout={logout}
        roomInput={roomInput}
        setRoomInput={setRoomInput}
        onCreateRoom={
          createRoom
        }
        onJoinRoom={
          joinRoom
        }
        message={message}
      />
    );
  }

  /*
   * NAVIGATION
   */
  const dashboardButton =
    screen === "watch" ? (
      <button
        className="navigation-btn"
        onClick={() =>
          setScreen("dashboard")
        }
      >
        ← Dashboard
      </button>
    ) : (
      <button
        className="navigation-btn watch-nav-btn"
        onClick={() =>
          setScreen("watch")
        }
      >
        🎬 Watch Party
      </button>
    );

  /*
   * WATCH PARTY PAGE
   *
   * This page is intentionally only for watching.
   * Dashboard information stays on Dashboard.
   */
  if (screen === "watch") {
    return (
      <div className="watch-page">
        <RoomHeader
          roomId={roomId}
          myRole={myRole}
          onCopyRoomLink={
            copyRoomLink
          }
          onLeaveRoom={
            leaveRoom
          }
        />

        <div className="watch-navigation">
          {dashboardButton}

          <div className="watch-room-status">
            <span>
              {participants.length}{" "}
              {participants.length === 1
                ? "person"
                : "people"}{" "}
              watching
            </span>
          </div>
        </div>

        <main className="watch-content">
          <section className="watch-player-card">
            <VideoPlayer
              videoId={videoId}
              onReady={
                handlePlayerReady
              }
              onStateChange={
                handlePlayerStateChange
              }
              canControl={
                isController
              }
            />
          </section>

          <section className="watch-controls-area">
            <VideoControls
              isPlaying={
                playState ===
                "playing"
              }
              currentTime={
                currentTime
              }
              duration={
                duration
              }
              canControl={
                isController
              }
              onPlay={play}
              onPause={pause}
              onSeek={seek}
              onRequestSeek={
                requestSeek
              }
            />
          </section>

          <section className="watch-video-change">
            <div><span className="watch-section-label">CHAT & REACTIONS</span><h2>Party chat</h2></div>
            <div className="watch-change-box"><input value={chatInput} onChange={e=>setChatInput(e.target.value)} placeholder="Send a message" onKeyDown={e=>{if(e.key==='Enter'&&chatInput.trim()){socket.emit('chat_message',{text:chatInput.trim()});setChatInput('')}}}/><button onClick={()=>{if(chatInput.trim()){socket.emit('chat_message',{text:chatInput.trim()});setChatInput('')}}}>Send</button></div>
            <div className="party-chat">{chatMessages.map((m,i)=><div key={i}><b>{m.username}:</b> {m.text}</div>)}</div>
            <div className="reaction-row">{['👍','😂','❤️','🔥','👏'].map(e=><button key={e} onClick={()=>socket.emit('reaction',{emoji:e})}>{e}</button>)}</div>
          </section>

          <section className="watch-video-change">
            <div>
              <span className="watch-section-label">
                VIDEO
              </span>

              <h2>
                {isController
                  ? "Change the video"
                  : "Request a different video"}
              </h2>

              <p>
                {isController
                  ? "Paste a YouTube URL to change the video for everyone."
                  : "Suggest a YouTube video. A Host or Moderator must approve the change."}
              </p>
            </div>

            <div className="watch-change-box">
              <input
                value={
                  videoInput
                }
                onChange={(e) =>
                  setVideoInput(
                    e.target.value
                  )
                }
                placeholder="Paste YouTube URL"
              />

              <button
                onClick={
                  changeVideo
                }
              >
                {isController
                  ? "Change Video"
                  : "Request Change"}
              </button>
            </div>
          </section>
        </main>

        {message && (
          <div className="watch-message">
            {message}
          </div>
        )}

        {notification && (
          <div className="request-popup">
            <div className="popup-icon">
              🔔
            </div>

            <div className="popup-content">
              <strong>
                New Request
              </strong>

              <p>
                {notification.username}{" "}
                requested{" "}
                <b>
                  {notification.action}
                </b>
              </p>

              {notification.action ===
                "seek" && (
                <small>
                  Position:{" "}
                  {Math.floor(
                    notification.time ||
                      0
                  )}{" "}
                  seconds
                </small>
              )}

              {notification.action ===
                "change_video" &&
                notification.videoId && (
                  <small>
                    Video ID:{" "}
                    {
                      notification.videoId
                    }
                  </small>
                )}

              <div className="popup-actions">
                <button
                  className="approve-btn"
                  onClick={
                    approveNotification
                  }
                >
                  Approve
                </button>

                <button
                  className="reject-btn"
                  onClick={
                    rejectNotification
                  }
                >
                  Reject
                </button>
              </div>
            </div>

            <button
              className="popup-close"
              onClick={() =>
                setNotification(null)
              }
            >
              ×
            </button>
          </div>
        )}
      </div>
    );
  }

  /*
   * ROLE-SPECIFIC DASHBOARD
   */
  const dashboardContent =
    myRole === "Host"
      ? {
          label: "HOST DASHBOARD",
          title: `Welcome, ${username}`,
          description:
            "Manage your watch party, participants, roles and playback requests.",
        }
      : myRole === "Moderator"
      ? {
          label: "MODERATOR DASHBOARD",
          title: `Welcome, ${username}`,
          description:
            "Help manage playback and handle participant control requests.",
        }
      : {
          label: "PARTICIPANT DASHBOARD",
          title: `Welcome, ${username}`,
          description:
            "You're in the watch party. View the room and request playback changes when needed.",
        };

  return (
    <div className="dashboard-page">
      <RoomHeader
        roomId={roomId}
        myRole={myRole}
        onCopyRoomLink={
          copyRoomLink
        }
        onLeaveRoom={
          leaveRoom
        }
      />

      <div className="dashboard-navigation">
        {dashboardButton}
      </div>

      <main className="dashboard-content">
        <section className="dashboard-welcome">
          <div>
            <span className="dashboard-label">
              {dashboardContent.label}
            </span>

            <h1>
              {dashboardContent.title}
            </h1>

            <p>
              {dashboardContent.description}
            </p>
          </div>

          <button
            className="big-watch-btn"
            onClick={() =>
              setScreen("watch")
            }
          >
            ▶ Watch Party
          </button>
        </section>

        <section className="dashboard-grid">
          <div className="dashboard-card room-details-card">
            <div className="card-heading">
              <div>
                <span className="card-eyebrow">
                  ROOM
                </span>

                <h2>
                  Room Information
                </h2>
              </div>
            </div>

            <div className="room-detail">
              <span>
                Room Code
              </span>

              <strong>
                {roomId}
              </strong>
            </div>

            <div className="room-detail">
              <span>
                Your Name
              </span>

              <strong>
                {username}
              </strong>
            </div>
<div className="room-detail">
  <span>
    Your Role
  </span>

  <strong className="dashboard-role">
    {myRole}
  </strong>
</div>
          </div>

          <PermissionInfo
            myRole={myRole}
          />
        </section>

        <section className="dashboard-grid dashboard-main-grid">
          <ParticipantList
            participants={
              participants
            }
            myRole={myRole}
            myUserId={
              myUserId
            }
            onMakeModerator={
              makeModerator
            }
            onMakeParticipant={
              makeParticipant
            }
            onRemoveParticipant={removeParticipant}
            onTransferHost={transferHost}
          />

          {(myRole === "Host" ||
            myRole ===
              "Moderator") && (
            <RequestsPanel
              requests={
                requests
              }
              onApprove={
                approveRequest
              }
              onReject={
                rejectRequest
              }
            />
          )}
        </section>

        {myRole === "Participant" && (
          <section className="participant-dashboard-note">
            <div className="note-icon">
              ℹ
            </div>

            <div>
              <h3>
                You're watching as a
                Participant
              </h3>

              <p>
                You can watch the
                synchronized video and
                request Play, Pause,
                Seek, or Video Change.
                A Host or Moderator must
                approve your request.
              </p>

              <button
                className="note-watch-btn"
                onClick={() =>
                  setScreen("watch")
                }
              >
                🎬 Go to Watch Party
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;