import type { Role } from "../types";

type RoomHeaderProps = { roomId: string; myRole: Role; onCopyRoomLink: () => void; onLeaveRoom: () => void; };

export default function RoomHeader({ roomId, myRole, onCopyRoomLink, onLeaveRoom }: RoomHeaderProps) {
  return (
    <header className="room-header">
      <div className="room-brand"><h1>WatchParty</h1></div>
      <div className="room-info">
        <div className="room-code">ROOM <strong>{roomId}</strong></div>
        <span className="role-badge">{myRole}</span>
        <button className="copy-link-btn" onClick={onCopyRoomLink}>Copy invite</button>
        <button className="leave-btn" onClick={onLeaveRoom}>Leave</button>
      </div>
    </header>
  );
}
