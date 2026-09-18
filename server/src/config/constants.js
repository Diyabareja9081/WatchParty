const PORT = Number(process.env.PORT) || 5000;
const DEFAULT_VIDEO_ID = '';
const YOUTUBE_VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const MAX_USERNAME_LENGTH = 32;

module.exports = {
  PORT,
  DEFAULT_VIDEO_ID,
  YOUTUBE_VIDEO_ID,
  MAX_USERNAME_LENGTH,
};
