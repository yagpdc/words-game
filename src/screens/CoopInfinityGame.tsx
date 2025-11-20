import { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/auth/use-auth.hook";
import { useSubmitCoopGuess } from "../hooks/words/use-submit-coop-guess";
import { useForceLeaveCoopRoom } from "../hooks/words/use-force-leave-coop";
import { useCoopRoomSocket } from "../hooks/socket/use-coop-room-socket";
import type {
  WordsInfiniteRunState,
  WordsInfiniteGuess,
  RoomGuessMadeEvent,
  RoomTurnChangedEvent,
  RoomWordCompletedEvent,
  RoomGameOverEvent,
  RoomPlayerAbandonedEvent,
  RoomGameStartedEvent,
} from "../types/words";
import GameKeyboard from "../components/Game/GameKeyboard";

type LetterStatus = "default" | "present" | "absent" | "correct";

type CellState = {
  value: string;
  status: LetterStatus;
};

const DEFAULT_COLUMNS = 5;
const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_STATUS: LetterStatus = "default";

const PATTERN_STATUS_MAP: Record<string, LetterStatus> = {
  "0": "absent",
  "1": "present",
  "2": "correct",
};

const CELL_STYLES: Record<LetterStatus, string> = {
  default: "bg-[#1E1827] text-[#FDF7FF] border border-[#3A3141]",
  present: "bg-[#E19B30] text-[#1B0F02]",
  absent: "bg-[#312A2C] text-[#FAFAFF]",
  correct: "bg-[#0F8F74] text-[#F5FFFA]",
};

const buildEmptyRow = (columns: number): CellState[] =>
  Array.from({ length: columns }, () => ({
    value: "",
    status: DEFAULT_STATUS,
  }));

const buildDraftLetters = (columns: number) =>
  Array.from({ length: columns }, () => "");

const buildRowFromGuess = (
  guess: WordsInfiniteGuess,
  columns: number
): CellState[] => {
  return Array.from({ length: columns }, (_, index) => {
    const letter = guess.guessWord?.[index]?.toUpperCase() ?? "";
    const patternValue = guess.pattern?.[index] ?? "";
    const status = PATTERN_STATUS_MAP[patternValue] ?? DEFAULT_STATUS;

    return {
      value: letter,
      status,
    };
  });
};

const buildRowFromDraft = (letters: string[], columns: number): CellState[] =>
  Array.from({ length: columns }, (_, index) => ({
    value: letters[index]?.toUpperCase() ?? "",
    status: DEFAULT_STATUS,
  }));

const CoopInfinityGame = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [run, setRun] = useState<WordsInfiniteRunState | null>(
    location.state?.run || null
  );
  const [currentTurnPlayerId, setCurrentTurnPlayerId] = useState<string | null>(
    location.state?.currentTurnPlayerId || null
  );
  const [draftLetters, setDraftLetters] = useState<string[]>(() =>
    buildDraftLetters(DEFAULT_COLUMNS)
  );
  const [selectedCol, setSelectedCol] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [isRowShaking, setIsRowShaking] = useState(false);
  const [gameOverMessage, setGameOverMessage] = useState<string | null>(null);

  const guessMutation = useSubmitCoopGuess();
  const forceLeaveRoomMutation = useForceLeaveCoopRoom();

  // Socket handlers
  const handleGameStarted = useCallback((event: RoomGameStartedEvent) => {
    setRun(event.run);
    setCurrentTurnPlayerId(event.currentTurnPlayerId);
  }, []);

  const handleGuessMade = useCallback((event: RoomGuessMadeEvent) => {
    setFeedback(`${event.playerName} fez um palpite`);
    setTimeout(() => setFeedback(""), 2000);
  }, []);

  const handleTurnChanged = useCallback((event: RoomTurnChangedEvent) => {
    setCurrentTurnPlayerId(event.currentTurnPlayerId);
  }, []);

  const handleWordCompleted = useCallback((event: RoomWordCompletedEvent) => {
    setFeedback(`Palavra completada! Pontuação: ${event.currentScore}`);
    setDraftLetters(buildDraftLetters(event.nextWord?.length ?? DEFAULT_COLUMNS));
    setSelectedCol(0);
    setTimeout(() => setFeedback(""), 3000);
  }, []);

  const handleGameOver = useCallback(
    (event: RoomGameOverEvent) => {
      const message =
        event.reason === "abandoned"
          ? "Jogo encerrado - Um jogador abandonou"
          : `Fim de jogo! Pontuação final: ${event.finalScore} | Palavras completadas: ${event.wordsCompleted}`;
      setGameOverMessage(message);
      setTimeout(() => {
        navigate("/game/infinity/mode");
      }, 5000);
    },
    [navigate]
  );

  const handlePlayerAbandoned = useCallback(
    (event: RoomPlayerAbandonedEvent) => {
      setFeedback(`${event.playerName} abandonou o jogo`);
      setTimeout(() => {
        navigate("/game/infinity/mode");
      }, 3000);
    },
    [navigate]
  );

  useCoopRoomSocket(roomId ?? null, {
    onGameStarted: handleGameStarted,
    onGuessMade: handleGuessMade,
    onTurnChanged: handleTurnChanged,
    onWordCompleted: handleWordCompleted,
    onGameOver: handleGameOver,
    onPlayerAbandoned: handlePlayerAbandoned,
  });

  const columns = run?.nextWord?.length ?? DEFAULT_COLUMNS;
  const maxAttempts = run?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const boardGuesses = run?.guesses ?? [];
  const currentGuessCount = boardGuesses.length;
  const isMyTurn = currentTurnPlayerId === user?.id;
  const isGameActive = run?.status === "active";
  const isInputLocked = !isMyTurn || !isGameActive || guessMutation.isPending;

  const rows = useMemo(() => {
    const result: CellState[][] = [];

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const guess = boardGuesses[attempt];

      if (guess) {
        result.push(buildRowFromGuess(guess, columns));
      } else if (attempt === currentGuessCount) {
        result.push(buildRowFromDraft(draftLetters, columns));
      } else {
        result.push(buildEmptyRow(columns));
      }
    }

    return result;
  }, [boardGuesses, columns, currentGuessCount, draftLetters, maxAttempts]);

  const keyboardLetterStates = useMemo(() => {
    const states: Record<string, LetterStatus> = {};

    boardGuesses.forEach((guess: WordsInfiniteGuess) => {
      const word = guess.guessWord.toUpperCase();
      const pattern = guess.pattern;

      for (let i = 0; i < word.length; i += 1) {
        const letter = word[i];
        const patternChar = pattern[i];
        const newStatus = PATTERN_STATUS_MAP[patternChar] ?? DEFAULT_STATUS;
        const currentStatus = states[letter] ?? DEFAULT_STATUS;

        const statusPriority = {
          default: 0,
          absent: 1,
          present: 2,
          correct: 3,
        };

        if (statusPriority[newStatus] > statusPriority[currentStatus]) {
          states[letter] = newStatus;
        }
      }
    });

    return states;
  }, [boardGuesses]);

  const handleKeyPress = useCallback(
    (key: string) => {
      if (isInputLocked) return;

      if (key === "BACKSPACE") {
        setDraftLetters((prev) => {
          const newLetters = [...prev];
          if (newLetters[selectedCol]) {
            newLetters[selectedCol] = "";
          } else if (selectedCol > 0) {
            newLetters[selectedCol - 1] = "";
            setSelectedCol(selectedCol - 1);
          }
          return newLetters;
        });
      } else if (key === "ENTER") {
        handleSubmitGuess();
      } else if (key.length === 1 && /^[A-Z]$/i.test(key)) {
        setDraftLetters((prev) => {
          const newLetters = [...prev];
          newLetters[selectedCol] = key.toUpperCase();
          if (selectedCol < columns - 1) {
            setSelectedCol(selectedCol + 1);
          }
          return newLetters;
        });
      }
    },
    [isInputLocked, selectedCol, columns]
  );

  const handleSubmitGuess = async () => {
    if (isInputLocked || !roomId) return;

    const word = draftLetters.join("").toUpperCase();

    if (word.length !== columns) {
      setFeedback("Complete a palavra");
      setIsRowShaking(true);
      setTimeout(() => setIsRowShaking(false), 500);
      return;
    }

    setFeedback("");

    try {
      const response = await guessMutation.mutateAsync({
        roomId,
        guessWord: word,
      });

      setRun(response);
      setCurrentTurnPlayerId(response.currentTurnPlayerId);
      setDraftLetters(buildDraftLetters(columns));
      setSelectedCol(0);

      if (response.status === "completed") {
        setFeedback("Vitória! Palavra completada!");
      } else if (response.status === "failed") {
        setGameOverMessage(
          `Fim de jogo! Pontuação: ${response.currentScore}`
        );
        setTimeout(() => navigate("/game/infinity/mode"), 5000);
      }
    } catch (error: any) {
      const message =
        error.response?.data?.message || "Erro ao enviar palpite";
      setFeedback(message);
      setIsRowShaking(true);
      setTimeout(() => {
        setIsRowShaking(false);
        setFeedback("");
      }, 2000);
    }
  };

  const handleAbandon = async () => {
    if (!roomId || !window.confirm("Tem certeza que deseja abandonar?")) return;

    try {
      await forceLeaveRoomMutation.mutateAsync();
      navigate("/game/infinity/mode");
    } catch (error) {
      console.error("Erro ao abandonar:", error);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Backspace") {
        e.preventDefault();
        handleKeyPress("BACKSPACE");
      } else if (e.key === "Enter") {
        e.preventDefault();
        handleKeyPress("ENTER");
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        handleKeyPress(e.key.toUpperCase());
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyPress]);

  if (!run) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-white">Carregando jogo...</p>
      </div>
    );
  }

  if (gameOverMessage) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6 px-4">
        <div className="text-6xl">🏁</div>
        <h2 className="text-3xl font-bold text-white text-center">
          {gameOverMessage}
        </h2>
        <p className="text-neutral-400">Redirecionando...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full min-h-screen py-8 px-4">
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/game/infinity/mode"
            className="inline-flex items-center gap-2 rounded-md border border-neutral-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-neutral-500"
          >
            {"\u2190"} Sair
          </Link>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-neutral-500 uppercase tracking-wide">
                Pontuação
              </p>
              <p className="text-2xl font-bold text-white">
                {run.currentScore}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-neutral-500 uppercase tracking-wide">
                Tentativas
              </p>
              <p className="text-2xl font-bold text-white">
                {currentGuessCount}/{maxAttempts}
              </p>
            </div>
          </div>
        </div>

        {/* Turn indicator */}
        <div className="mb-6 rounded-lg bg-neutral-900 border border-neutral-800 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-neutral-400">
              {isMyTurn ? "É sua vez!" : "Aguardando parceiro..."}
            </p>
            {isMyTurn && (
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </div>
        </div>

        {/* Feedback */}
        {feedback && (
          <div className="mb-4 rounded-lg bg-purple-500/10 border border-purple-500/30 p-3 text-center text-sm text-purple-300">
            {feedback}
          </div>
        )}

        {/* Game board */}
        <div className="flex flex-col gap-2 mb-6">
          {rows.map((row, rowIndex) => (
            <div
              key={`row-${rowIndex}`}
              className={`flex gap-2 justify-center ${
                rowIndex === currentGuessCount && isRowShaking
                  ? "animate-shake"
                  : ""
              }`}
            >
              {row.map((cell, colIndex) => (
                <div
                  key={`cell-${rowIndex}-${colIndex}`}
                  className={`w-14 h-14 flex items-center justify-center text-2xl font-bold rounded-md transition-all ${
                    CELL_STYLES[cell.status]
                  } ${
                    rowIndex === currentGuessCount && colIndex === selectedCol
                      ? "ring-2 ring-purple-500"
                      : ""
                  }`}
                  onClick={() => {
                    if (rowIndex === currentGuessCount && !isInputLocked) {
                      setSelectedCol(colIndex);
                    }
                  }}
                >
                  {cell.value}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Keyboard */}
        <GameKeyboard
          onKeyPress={handleKeyPress}
          statuses={keyboardLetterStates}
          disabled={isInputLocked}
        />

        {/* Abandon button */}
        <button
          onClick={handleAbandon}
          disabled={forceLeaveRoomMutation.isPending}
          className="mt-6 w-full rounded-lg border border-red-500/50 px-4 py-3 text-sm font-semibold text-red-400 transition hover:bg-red-500/10 disabled:opacity-50 cursor-pointer"
        >
          {forceLeaveRoomMutation.isPending ? "Abandonando..." : "Abandonar Partida"}
        </button>
      </div>
    </div>
  );
};

export default CoopInfinityGame;
