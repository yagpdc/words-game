import { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/auth/use-auth.hook";
import { useSubmitCoopGuess } from "../hooks/words/use-submit-coop-guess";
import { useForceLeaveCoopRoom } from "../hooks/words/use-force-leave-coop";
import { useCoopRoomSocket } from "../hooks/socket/use-coop-room-socket";
import { CoopGameOverModal } from "../components/CoopGameOverModal";
import { RematchRequestModal } from "../components/RematchRequestModal";
import type {
  WordsInfiniteRunState,
  WordsInfiniteGuess,
  RoomGuessMadeEvent,
  RoomTurnChangedEvent,
  RoomWordCompletedEvent,
  RoomGameOverEvent,
  RoomPlayerAbandonedEvent,
  RoomGameStartedEvent,
  RoomRematchRequestEvent,
  RoomRematchResponseEvent,
} from "../types/words";
import GameKeyboard from "../components/Game/GameKeyboard";
import { useMyCoopRoom } from "../hooks/words/use-my-coop-room";

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

// Função para modo infinity: fixa letras corretas/presentes nas próximas tentativas
const buildDraftLettersInfinity = (guesses: WordsInfiniteGuess[], columns: number) => {
  const draft = Array.from({ length: columns }, () => "");
  // Percorre todas as tentativas anteriores
  guesses.forEach((guess) => {
    for (let i = 0; i < columns; i++) {
      const letter = guess.guessWord?.[i]?.toUpperCase() ?? "";
      const pattern = guess.pattern?.[i] ?? "";
      // Verde: fixa letra (pattern === '2')
      if (pattern === "2" && letter) {
        draft[i] = letter;
      }
      // Amarelo NÃO fixa
    }
  });
  // Log para debug: quais letras estão fixas
  console.log("[Infinity] Letras fixas (verdes) por coluna:", draft);
  return draft;
};

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
  const [fixedCols, setFixedCols] = useState<boolean[]>(() =>
    Array.from({ length: DEFAULT_COLUMNS }, () => false)
  );
  const [selectedCol, setSelectedCol] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [isRowShaking, setIsRowShaking] = useState(false);
  const [gameOverEvent, setGameOverEvent] = useState<RoomGameOverEvent | null>(null);
  const [rematchRequest, setRematchRequest] = useState<RoomRematchRequestEvent | null>(null);
  const [players] = useState<Array<{ userId: string; username: string }>>(
    location.state?.players || []
  );

  const guessMutation = useSubmitCoopGuess();
  const forceLeaveRoomMutation = useForceLeaveCoopRoom();
  const myCoopRoomQuery = useMyCoopRoom();

  // Socket handlers
  const handleGameStarted = useCallback((event: RoomGameStartedEvent) => {
    setRun(event.run);
    setCurrentTurnPlayerId(event.currentTurnPlayerId);
  }, []);

  const handleGuessMade = useCallback((event: RoomGuessMadeEvent) => {
    console.log("📥 Processando evento guess-made:", event);
    setFeedback(`${event.playerName} fez um palpite: ${event.guess.guessWord}`);

    // Atualizar run com o novo guess
    setRun((prevRun) => {
      if (!prevRun) return prevRun;

      const newGuesses = [...(prevRun.guesses || []), event.guess];

      return {
        ...prevRun,
        guesses: newGuesses,
        attemptsUsed: event.attemptNumber,
      };
    });

    setTimeout(() => setFeedback(""), 2000);
  }, []);

  const handleTurnChanged = useCallback((event: RoomTurnChangedEvent) => {
    console.log("📥 Processando evento turn-changed:", event);
    console.log("🔄 Mudando turno para:", event.currentTurnPlayerId, event.currentTurnPlayerName);
    setCurrentTurnPlayerId(event.currentTurnPlayerId);

    // Refetch do estado do run
    if (myCoopRoomQuery.refetch) {
      myCoopRoomQuery.refetch().then((result) => {
        const serverRun = result.data?.run;
        if (serverRun) {
          const newGuesses = serverRun.guesses?.length ? serverRun.guesses : run?.guesses || [];
          const mergedRun = { ...(serverRun as any), guesses: newGuesses } as WordsInfiniteRunState;
          setRun(mergedRun);
          setDraftLetters(buildDraftLetters(serverRun.nextWord?.length ?? columns));
          setSelectedCol(0);
        }
      });
    }
  }, [myCoopRoomQuery, run]);

  const handleWordCompleted = useCallback((event: RoomWordCompletedEvent) => {
    console.log("📥 Processando evento word-completed:", event);
    setFeedback(`Palavra completada! Pontuação: ${event.currentScore}`);

    // Atualizar run com nova pontuação e próxima palavra
    setRun((prevRun) => {
      if (!prevRun) return prevRun;

      return {
        ...prevRun,
        currentScore: event.currentScore,
        nextWord: event.nextWord,
        guesses: [], // Reset guesses para a próxima palavra
        attemptsUsed: 0,
      };
    });

    setDraftLetters(buildDraftLetters(event.nextWord?.length ?? DEFAULT_COLUMNS));
    setSelectedCol(0);
    setTimeout(() => setFeedback(""), 3000);
  }, []);

  const handleGameOver = useCallback(
    (event: RoomGameOverEvent) => {
      setGameOverEvent(event);
      // Mostrar modal via `gameOverEvent` — não redirecionamos automaticamente.
    },
    []
  );

  const handlePlayerAbandoned = useCallback(
    (event: RoomPlayerAbandonedEvent) => {
      setFeedback(`${event.playerName} abandonou o jogo`);
      // Não redirecionar automaticamente
    },
    []
  );

  const handleRematchRequest = useCallback((event: RoomRematchRequestEvent) => {
    console.log("📥 Recebendo pedido de rematch:", event);
    // Só mostrar modal se o pedido não for meu
    if (event.requesterId !== user?.id) {
      setRematchRequest(event);
    }
  }, [user?.id]);

  const handleRematchResponse = useCallback(
    (event: RoomRematchResponseEvent) => {
      console.log("📥 Resposta de rematch:", event);

      if (!event.accepted) {
        setFeedback(`${event.responderName} recusou a revanche`);
        setRematchRequest(null);
        return;
      }

      if (event.newRoomId) {
        // Ambos aceitaram - redirecionar para nova sala
        console.log("✅ Nova sala criada:", event.newRoomId);
        navigate(`/game/infinity/coop/${event.newRoomId}`, {
          state: { players },
        });
      } else {
        // Outro jogador aceitou, mas ainda esperando
        setFeedback(`${event.responderName} aceitou! Aguardando iniciar...`);
      }
    },
    [navigate, players]
  );

  const socketHandlers = useCoopRoomSocket(roomId ?? null, {
    onGameStarted: handleGameStarted,
    onGuessMade: handleGuessMade,
    onTurnChanged: handleTurnChanged,
    onWordCompleted: handleWordCompleted,
    onGameOver: handleGameOver,
    onPlayerAbandoned: handlePlayerAbandoned,
    onRematchRequest: handleRematchRequest,
    onRematchResponse: handleRematchResponse,
  });

  const columns = run?.nextWord?.length ?? DEFAULT_COLUMNS;
  const maxAttempts = run?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const boardGuesses = run?.guesses ?? [];
  const currentGuessCount = boardGuesses.length;
  const isMyTurn = currentTurnPlayerId === user?.id;
  const isGameActive = run?.status === "active";
  const isInputLocked = !isMyTurn || !isGameActive || guessMutation.isPending;

  // Log detalhado quando isMyTurn muda
  useEffect(() => {
    console.log("⚡ isMyTurn mudou para:", isMyTurn, {
      currentTurnPlayerId,
      myUserId: user?.id,
      comparison: `${currentTurnPlayerId} === ${user?.id}`,
    });
  }, [isMyTurn, currentTurnPlayerId, user?.id]);

  // Debug: Mostrar info de turno
  useEffect(() => {
    console.log("🎮 Estado do jogo:", {
      currentTurnPlayerId,
      myUserId: user?.id,
      myUsername: user?.name,
      isMyTurn,
      isGameActive,
      isInputLocked,
      runStatus: run?.status,
      attemptsUsed: run?.attemptsUsed,
      currentGuessCount,
      guessMutationPending: guessMutation.isPending,
      breakdown: {
        notMyTurn: !isMyTurn,
        notActive: !isGameActive,
        mutationPending: guessMutation.isPending,
      }
    });
  }, [currentTurnPlayerId, user?.id, user?.name, isMyTurn, isGameActive, isInputLocked, run?.status, run?.attemptsUsed, currentGuessCount, guessMutation.isPending]);

  // Atualiza draftLetters ao mudar run ou guesses
  useEffect(() => {
    if (run && run.guesses) {
      const draft = buildDraftLettersInfinity(run.guesses, columns);
      setDraftLetters(draft);
      setFixedCols(draft.map((l) => !!l));
    } else {
      const draft = buildDraftLetters(columns);
      setDraftLetters(draft);
      setFixedCols(Array.from({ length: columns }, () => false));
    }
  }, [run, columns]);

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

  const handleSubmitGuess = useCallback(async () => {
    if (isInputLocked || !roomId) return;

    const word = draftLetters.join("").toUpperCase();

    // Debug detalhado
    console.log("DEBUG Submit:", {
      draftLetters,
      draftLettersLength: draftLetters.length,
      word,
      wordLength: word.length,
      columns,
      hasEmptyLetters: draftLetters.some(letter => !letter),
      isInputLocked,
      roomId,
      eachLetter: draftLetters.map((l, i) => ({
        index: i,
        letter: l,
        isEmpty: !l,
        length: l.length,
        charCode: l ? l.charCodeAt(0) : null
      })),
      emptyPositions: draftLetters.map((l, i) => !l ? i : null).filter(i => i !== null)
    });

    // Verifica se todas as letras foram preenchidas
    // Problema: draftLetters pode ter tamanho diferente de columns
    if (draftLetters.length !== columns) {
      console.error("ERRO: draftLetters.length !== columns", draftLetters.length, columns);
      setFeedback("Erro: tamanho incorreto da palavra");
      setIsRowShaking(true);
      setTimeout(() => setIsRowShaking(false), 500);
      return;
    }

    const hasEmptyLetters = draftLetters.some(letter => !letter);

    if (hasEmptyLetters) {
      const emptyPositions = draftLetters
        .map((l, i) => !l ? i + 1 : null)
        .filter(i => i !== null);
      console.log("Palavra incompleta. Posições vazias:", emptyPositions);
      setFeedback(`Complete a palavra (falta posição ${emptyPositions.join(', ')})`);
      setIsRowShaking(true);
      setTimeout(() => setIsRowShaking(false), 500);
      return;
    }

    if (word.length !== columns) {
      console.log("Palavra com tamanho errado:", { wordLength: word.length, columns });
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
        setGameOverEvent({
          roomId: roomId || "",
          finalScore: response.currentScore,
          wordsCompleted: response.wordsCompleted ?? 0,
          reason: "failed",
        });
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
  }, [isInputLocked, roomId, draftLetters, columns, guessMutation, navigate]);

  // Helpers to find editable (non-fixed) columns
  const findNextEditable = (start: number) => {
    for (let i = start; i < columns; i++) {
      if (!fixedCols[i]) return i;
    }
    return -1;
  };

  const findPrevEditable = (start: number) => {
    for (let i = start; i >= 0; i--) {
      if (!fixedCols[i]) return i;
    }
    return -1;
  };

  const handleKeyPress = useCallback(
    (key: string) => {
      if (isInputLocked) return;

      if (key === "BACKSPACE") {
        setDraftLetters((prev) => {
          const newLetters = [...prev];
          // If current pos is fixed, move to previous editable
          if (fixedCols[selectedCol]) {
            const prev = findPrevEditable(selectedCol - 1);
            if (prev !== -1) setSelectedCol(prev);
            return newLetters;
          }

          if (newLetters[selectedCol]) {
            newLetters[selectedCol] = "";
          } else if (selectedCol > 0) {
            const prev = findPrevEditable(selectedCol - 1);
            if (prev !== -1) {
              newLetters[prev] = "";
              setSelectedCol(prev);
            }
          }
          return newLetters;
        });
      } else if (key === "ENTER") {
        handleSubmitGuess();
      } else if (key.length === 1 && /^[A-Z]$/i.test(key)) {
        // Ensure selectedCol is editable
        if (selectedCol >= columns) {
          console.log("⚠️ Já preencheu todas as letras");
          return;
        }

        let col = selectedCol;
        if (fixedCols[col]) {
          const next = findNextEditable(col + 1);
          if (next === -1) {
            console.log("⚠️ Não há colunas editáveis");
            return;
          }
          col = next;
          setSelectedCol(next);
        }

        console.log(`✏️ Digitando "${key}" na posição ${col}`);

        setDraftLetters((prev) => {
          const newLetters = [...prev];
          newLetters[col] = key.toUpperCase();
          console.log("📝 Draft atualizado:", newLetters);
          return newLetters;
        });

        // Move to next editable column
        const nextEditable = findNextEditable(col + 1);
        if (nextEditable !== -1) setSelectedCol(nextEditable);
      }
    },
    [isInputLocked, selectedCol, columns, handleSubmitGuess, fixedCols]
  );

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

  // When game is over we show a modal (`CoopGameOverModal`) using `gameOverEvent`.
  // Keep the main UI rendered so the modal can appear on top.

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
                    fixedCols[colIndex] && rowIndex === currentGuessCount
                      ? "bg-emerald-600/80 text-white border-2 border-emerald-400"
                      : CELL_STYLES[cell.status]
                  } ${
                    fixedCols[colIndex] && rowIndex === currentGuessCount
                      ? "cursor-not-allowed"
                      : rowIndex === currentGuessCount && colIndex === selectedCol
                      ? "ring-2 ring-purple-500"
                      : ""
                  }`}
                  onClick={() => {
                    if (rowIndex === currentGuessCount && !isInputLocked && !fixedCols[colIndex]) {
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

      {/* Modal de Game Over */}
      {gameOverEvent && (
        <CoopGameOverModal
          event={gameOverEvent}
          allGuesses={run?.guesses ?? []}
          players={players}
          currentUserId={user?.id ?? ""}
          onRequestRematch={socketHandlers.requestRematch}
          onClose={() => setGameOverEvent(null)}
        />
      )}

      {/* Modal de Pedido de Rematch */}
      {rematchRequest && (
        <RematchRequestModal
          event={rematchRequest}
          onAccept={() => {
            socketHandlers.respondToRematch(true);
            setRematchRequest(null);
          }}
          onDecline={() => {
            socketHandlers.respondToRematch(false);
            setRematchRequest(null);
          }}
        />
      )}
    </div>
  );
};

export default CoopInfinityGame;
