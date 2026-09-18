const rooms = require('../rooms/roomStore');
const { getParticipant } = require('../rooms/roomHelpers');
function registerSocialHandlers(io, socket) {
  socket.on('chat_message', ({ text } = {}) => { const room=rooms.get(socket.data.roomId); const p=room&&getParticipant(room,socket.id); const clean=String(text||'').trim().slice(0,500); if(!room||!p||!clean)return; const msg={id:`${Date.now()}-${socket.id}`,username:p.username,text:clean,createdAt:Date.now()}; room.addMessage(msg); io.to(room.roomId).emit('chat_message',msg); });
  socket.on('reaction', ({ emoji } = {}) => { const room=rooms.get(socket.data.roomId); const p=room&&getParticipant(room,socket.id); if(!room||!p||!['👍','😂','❤️','🔥','👏'].includes(emoji))return; io.to(room.roomId).emit('reaction',{username:p.username,emoji,createdAt:Date.now()}); });
}
module.exports={registerSocialHandlers};
