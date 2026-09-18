const rooms = require('../rooms/roomStore');
const { canManageRoom, getParticipantsArray, broadcastParticipants } = require('../rooms/roomHelpers');

// Mobile connections drop far more often than desktop ones (screen lock,
// backgrounding the browser, switching between wifi and cellular all kill
// the underlying WebSocket). A dropped socket fires 'disconnect' even
// though the person hasn't actually left, so give them a window to
// reconnect before treating it as a real departure.
const HOST_DISCONNECT_GRACE_MS = 20000;

function removeUserFromRoom(io, socket, { isExplicitLeave = false } = {}) {
  const roomId = socket.data.roomId; if (!roomId) return; const room = rooms.get(roomId); if (!room) return; const p = room.getParticipant(socket.id); if (!p) return;

  socket.leave(roomId); socket.data.roomId = null;

  if (socket.data.user?.id === room.hostUserId) {
    room.removeParticipant(socket.id);
    broadcastParticipants(io, room);

    if (room.hostDisconnectTimer) { clearTimeout(room.hostDisconnectTimer); room.hostDisconnectTimer = null; }

    if (isExplicitLeave) {
      io.to(roomId).emit('room_closed', { message: 'The Host has left the room. The persistent room is still available for the Host to reconnect.' });
      return;
    }

    // Give the Host a grace window to reconnect (a fresh socket, same
    // account) before actually closing the room for everyone else.
    room.hostDisconnectTimer = setTimeout(() => {
      room.hostDisconnectTimer = null;
      const hostStillMissing = !room.getParticipants().some((participant) => participant.userAccountId === room.hostUserId);
      if (hostStillMissing) {
        io.to(room.roomId).emit('room_closed', { message: 'The Host has left the room. The persistent room is still available for the Host to reconnect.' });
      }
    }, HOST_DISCONNECT_GRACE_MS);
    return;
  }

  room.removeParticipant(socket.id); io.to(roomId).emit('user_left', { username: p.username, userId: p.userId, participants: getParticipantsArray(room) }); broadcastParticipants(io, room);
}
function registerParticipantHandlers(io, socket) {
  socket.on('assign_role', ({ userId, role } = {}) => {
    const room = rooms.get(socket.data.roomId); if (!room) return; if (!canManageRoom(room, socket.id)) return socket.emit('permission_denied',{action:'assign_role',message:'Only the Host can assign roles.'});
    if (!['Moderator','Participant'].includes(role)) return socket.emit('error_message',{message:'Invalid role.'}); const target=room.getParticipant(userId); if(!target || target.userId===room.hostId) return;
    target.role=role; rooms.saveMember(room.roomId,target.userAccountId || target.userId,role); io.to(room.roomId).emit('role_assigned',{userId:target.userId,username:target.username,role,participants:getParticipantsArray(room)}); broadcastParticipants(io,room);
  });
  socket.on('transfer_host', ({ userId } = {}) => {
    const room=rooms.get(socket.data.roomId); if(!room) return; if(!canManageRoom(room,socket.id)) return socket.emit('permission_denied',{action:'transfer_host',message:'Only the Host can transfer host.'});
    const target=room.getParticipant(userId); const current=room.getParticipant(socket.id); if(!target || !current || target===current) return socket.emit('error_message',{message:'Select another participant.'});
    current.role='Participant'; target.role='Host'; room.hostId=target.userId; room.setHost(target.userAccountId || target.userId); rooms.saveMember(room.roomId,current.userAccountId || current.userId,'Participant'); rooms.saveMember(room.roomId,target.userAccountId || target.userId,'Host'); rooms.saveRoom(room);
    io.to(room.roomId).emit('host_transferred',{userId:target.userId,username:target.username,participants:getParticipantsArray(room)}); broadcastParticipants(io,room);
  });
  socket.on('remove_participant', ({ userId } = {}) => {
    const room=rooms.get(socket.data.roomId); if(!room) return; if(!canManageRoom(room,socket.id)) return socket.emit('permission_denied',{action:'remove_participant',message:'Only the Host can remove participants.'}); if(userId===room.hostId)return;
    const target=room.getParticipant(userId); if(!target)return; room.removeParticipant(userId); rooms.removeMember(room.roomId,target.userAccountId || target.userId); io.to(userId).emit('participant_removed',{userId,participants:getParticipantsArray(room)}); const ts=io.sockets.sockets.get(userId); if(ts){ts.leave(room.roomId);ts.data.roomId=null;} broadcastParticipants(io,room);
  });
  socket.on('leave_room',()=>removeUserFromRoom(io,socket,{isExplicitLeave:true})); socket.on('disconnect',()=>removeUserFromRoom(io,socket));
}
module.exports={registerParticipantHandlers,removeUserFromRoom};
