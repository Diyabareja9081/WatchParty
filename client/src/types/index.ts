export type Role =
  | "Host"
  | "Moderator"
  | "Participant";

export type Participant = {
  userId: string;
  username: string;
  role: Role;
};

export type ControlRequest = {
  requestId: string;
  userId: string;
  username: string;
  action:
    | "play"
    | "pause"
    | "seek"
    | "change_video";
  time?: number;
  videoId?: string;
};