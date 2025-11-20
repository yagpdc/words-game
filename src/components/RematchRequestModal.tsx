import type { RoomRematchRequestEvent } from "../types/words";
import "./Modal.css";

type RematchRequestModalProps = {
  event: RoomRematchRequestEvent;
  onAccept: () => void;
  onDecline: () => void;
};

export const RematchRequestModal = ({
  event,
  onAccept,
  onDecline,
}: RematchRequestModalProps) => {
  return (
    <div className="modal-overlay">
      <div
        className="modal-content"
        style={{ maxWidth: "400px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ textAlign: "center", marginBottom: "1rem" }}>
          Pedido de Revanche
        </h2>

        <p style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <strong>{event.requesterName}</strong> quer jogar novamente!
        </p>

        <div
          style={{
            display: "flex",
            gap: "0.75rem",
          }}
        >
          <button
            onClick={onAccept}
            style={{
              flex: 1,
              padding: "0.75rem",
              backgroundColor: "#4CAF50",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "1rem",
            }}
          >
            ✅ Aceitar
          </button>

          <button
            onClick={onDecline}
            style={{
              flex: 1,
              padding: "0.75rem",
              backgroundColor: "#f44336",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "1rem",
            }}
          >
            ❌ Recusar
          </button>
        </div>
      </div>
    </div>
  );
};
