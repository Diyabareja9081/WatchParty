import { useState } from "react";
import type { Role, Participant } from "../types";

type ParticipantListProps = {
  participants: Participant[];
  myRole: Role;
  myUserId: string;
  onMakeModerator: (userId: string) => void;
  onMakeParticipant: (userId: string) => void;
  onRemoveParticipant: (userId: string) => void;
  onTransferHost: (userId: string) => void;
};

export default function ParticipantList({
  participants,
  myRole,
  myUserId,
  onMakeModerator,
  onMakeParticipant,
  onRemoveParticipant,
  onTransferHost,
}: ParticipantListProps) {
  const [isOpen, setIsOpen] = useState(false);

  const isHost = myRole === "Host";

  return (
    <section className="participants-section">
      <button
        type="button"
        className="collapsible-section-toggle"
        onClick={() => setIsOpen((previous) => !previous)}
        aria-expanded={isOpen}
      >
        <div className="collapsible-section-left">
          <div className="section-icon">
            👥
          </div>

          <div>
            <span className="card-eyebrow">
              ROOM MEMBERS
            </span>

            <h2>Participants</h2>
          </div>
        </div>

        <div className="collapsible-section-right">
          <span className="count-badge">
            {participants.length}
          </span>

          <span className="section-arrow">
            {isOpen ? "▲" : "▼"}
          </span>
        </div>
      </button>

      {isOpen && (
        <div className="collapsible-section-content">
          <div className="participants">
            {participants.map((participant) => {
              const isMe =
                participant.userId === myUserId;

              return (
                <div
                  className="participant-card"
                  key={participant.userId}
                >
                  <div className="participant-info">
                    <div className="participant-name">
                      {participant.username}

                      {isMe && (
                        <span className="you-badge">
                          You
                        </span>
                      )}
                    </div>

                    <div className="participant-id">
                      ID: {participant.userId}
                    </div>

                    <span
                      className={`participant-role role-${participant.role.toLowerCase()}`}
                    >
                      {participant.role}
                    </span>
                  </div>

                  {isHost && !isMe && (
                    <div className="participant-management">
                      {participant.role === "Participant" ? (
                        <button
                          className="moderator-btn"
                          onClick={() =>
                            onMakeModerator(
                              participant.userId
                            )
                          }
                        >
                          👤 Make Moderator
                        </button>
                      ) : participant.role === "Moderator" ? (
                        <button
                          className="participant-btn"
                          onClick={() =>
                            onMakeParticipant(
                              participant.userId
                            )
                          }
                        >
                          Make Participant
                        </button>
                      ) : null}

                      <button className="moderator-btn" onClick={() => onTransferHost(participant.userId)}>Transfer Host</button>

                      <button
                        className="remove-participant-btn"
                        onClick={() =>
                          onRemoveParticipant(
                            participant.userId
                          )
                        }
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}