const fs = require('fs');
const path = require('path');
const dataDir = process.env.DATA_DIR || path.join(__dirname, '../../data');
fs.mkdirSync(dataDir, { recursive: true });
const file = path.join(dataDir, 'watch-party.json');
let state = { users: [], rooms: [], roomMembers: [], messages: {} };
try { if (fs.existsSync(file)) state = { ...state, ...JSON.parse(fs.readFileSync(file, 'utf8')) }; } catch { /* start clean if storage is corrupt */ }
function save() { const tmp = `${file}.tmp`; fs.writeFileSync(tmp, JSON.stringify(state, null, 2)); fs.renameSync(tmp, file); }
module.exports = {
  get users(){ return state.users; }, get rooms(){ return state.rooms; }, get roomMembers(){ return state.roomMembers; }, get messages(){ return state.messages; }, save,
};
