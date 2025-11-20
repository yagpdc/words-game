import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { RoomGameOverEvent, WordsInfiniteGuess } from "../types/words";
import "./Modal.css";

type CoopGameOverModalProps = {
  event: RoomGameOverEvent;
  allGuesses: WordsInfiniteGuess[];
  players: Array<{ userId: string; username: string }>;
  currentUserId: string;
  onRequestRematch: () => void;
  onClose: () => void;
};

export const CoopGameOverModal = ({
  event,
  allGuesses,
  players,
  currentUserId,
  onRequestRematch,
  onClose,
}: CoopGameOverModalProps) => {
  const navigate = useNavigate();
  const [rematchRequested, setRematchRequested] = useState(false);

  const handleRematchClick = () => {
    setRematchRequested(true);
    onRequestRematch();
  };

  const handleBackToModes = () => {
    navigate("/game/infinity/mode");
  };

  // Calcular estatísticas por jogador
  const playerStats = players.map((player) => {
    const playerGuesses = allGuesses.filter((g) => (g as any).playerId === player.userId);
    const totalCorrectPositions = playerGuesses.reduce((sum, guess) => {
      return sum + ((guess.pattern?.split("").filter((c) => c === "2").length) || 0);
    }, 0);

    return {
      userId: player.userId,
      username: player.username,
      attempts: playerGuesses.length,
      correctPositions: totalCorrectPositions,
    };
  });

  const winner = event.reason === "abandoned" ? "Jogo encerrado" : "Fim de jogo";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: "500px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ textAlign: "center", marginBottom: "1rem" }}>
          {winner}
        </h2>

        <div style={{ marginBottom: "1.5rem" }}>
          <p>
            <strong>Pontuação Final:</strong> {event.finalScore}
          </p>
          <p>
            <strong>Palavras Completadas:</strong> {event.wordsCompleted}
          </p>
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <h3 style={{ marginBottom: "0.5rem" }}>Estatísticas por jogador</h3>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            {playerStats.map((p) => (
              <div key={p.userId} style={{ padding: "0.5rem", background: "#111", borderRadius: 8 }}>
                <div style={{ fontWeight: p.userId === currentUserId ? "700" : "600" }}>{p.username}</div>
                <div style={{ fontSize: "0.85rem", color: "#ccc" }}>Tentativas: {p.attempts}</div>
                <div style={{ fontSize: "0.85rem", color: "#ccc" }}>Posições corretas: {p.correctPositions}</div>
              </div>
            ))}
          </div>
        </div>


        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
          }}
        >
          {!rematchRequested ? (
            <button
              onClick={handleRematchClick}
              style={{
                padding: "0.75rem",
                backgroundColor: "#4CAF50",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "1rem",
              }}
            >
              🔄 Pedir Revanche
            </button>
          ) : (
            <div
              style={{
                padding: "0.75rem",
                backgroundColor: "rgba(100, 150, 200, 0.2)",
                borderRadius: "8px",
                textAlign: "center",
              }}
            >
              ⏳ Aguardando outro jogador aceitar...
            </div>
          )}

          <button
            onClick={handleBackToModes}
            style={{
              padding: "0.75rem",
              backgroundColor: "#555",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "1rem",
            }}
          >
            ← Voltar aos Modos de Jogo
          </button>
        </div>
      </div>
    </div>
  );
};
