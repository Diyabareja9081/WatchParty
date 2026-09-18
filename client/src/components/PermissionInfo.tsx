import { useState } from "react";
import type { Role } from "../types";

type PermissionInfoProps = {
  myRole: Role;
};

export default function PermissionInfo({
  myRole,
}: PermissionInfoProps) {
  const [isOpen, setIsOpen] =
    useState(false);

  const permissions = {
    Host: [
      "Play and pause the video",
      "Seek to any position",
      "Change the current video",
      "Promote participants to Moderator",
      "Change Moderator back to Participant",
      "Remove participants",
      "Approve or reject requests",
      "Share the room with others",
    ],

    Moderator: [
      "Play and pause the video",
      "Seek to any position",
      "Change the current video",
      "Approve or reject playback requests",
      "Watch the synchronized video",
    ],

    Participant: [
      "Watch the synchronized video",
      "Request Play",
      "Request Pause",
      "Request Seek",
      "Request a video change",
    ],
  };

  return (
    <section className="permission-info">
      <button
        type="button"
        className="permission-toggle"
        onClick={() =>
          setIsOpen((previous) => !previous)
        }
        aria-expanded={isOpen}
      >
        <div className="permission-toggle-left">
          <div className="permission-icon">
            ✓
          </div>

          <div>
            <span className="card-eyebrow">
              ROLE ACCESS
            </span>

            <h2>Your Permissions</h2>
          </div>
        </div>

        <div className="permission-toggle-right">
          <span className="permission-role">
            {myRole}
          </span>

          <span className="permission-arrow">
            {isOpen ? "▲" : "▼"}
          </span>
        </div>
      </button>

      {isOpen && (
        <div className="permission-dropdown">
          <p className="permission-description">
            As a {myRole}, you can:
          </p>

          <div className="permission-list">
            {permissions[myRole].map(
              (permission, index) => (
                <div
                  className="permission-item"
                  key={index}
                >
                  <span className="permission-check">
                    ✓
                  </span>

                  <span>
                    {permission}
                  </span>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </section>
  );
}