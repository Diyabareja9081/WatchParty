import { useState } from "react";
import type { ControlRequest } from "../types";

type RequestsPanelProps = {
  requests: ControlRequest[];
  onApprove: (requestId: string) => void;
  onReject: (requestId: string) => void;
};

export default function RequestsPanel({
  requests,
  onApprove,
  onReject,
}: RequestsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="requests-section">
      <button
        type="button"
        className="collapsible-section-toggle"
        onClick={() => setIsOpen((previous) => !previous)}
        aria-expanded={isOpen}
      >
        <div className="collapsible-section-left">
          <div className="section-icon">
            🔔
          </div>

          <div>
            <span className="card-eyebrow">
              PLAYBACK REQUESTS
            </span>

            <h2>Pending Requests</h2>
          </div>
        </div>

        <div className="collapsible-section-right">
          {requests.length > 0 && (
            <span className="count-badge request-count">
              {requests.length}
            </span>
          )}

          <span className="section-arrow">
            {isOpen ? "▲" : "▼"}
          </span>
        </div>
      </button>

      {isOpen && (
        <div className="collapsible-section-content">
          {requests.length === 0 ? (
            <p className="no-requests">
              No pending requests.
            </p>
          ) : (
            <div className="requests-list">
              {requests.map((request) => (
                <div
                  className="request"
                  key={request.requestId}
                >
                  <div className="request-info">
                    <strong>
                      {request.username}
                    </strong>

                    <p>
                      requested {request.action}
                    </p>

                    {request.action === "seek" && (
                      <p>
                        Position:{" "}
                        {Math.floor(
                          request.time || 0
                        )}
                        s
                      </p>
                    )}
                  </div>

                  <div className="request-actions">
                    <button
                      className="approve-btn"
                      onClick={() =>
                        onApprove(
                          request.requestId
                        )
                      }
                    >
                      Approve
                    </button>

                    <button
                      className="reject-btn"
                      onClick={() =>
                        onReject(
                          request.requestId
                        )
                      }
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}