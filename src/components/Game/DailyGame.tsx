import axios from "axios";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/auth/use-auth.hook";
import { useDailyWordsPuzzleQuery } from "../../hooks/words/use-daily-words-puzzle";
import { useSubmitDailyGuessMutation } from "../../hooks/words/use-submit-daily-guess";
import type {
  DailyGuessLetterState,
  DailyGuessResponse,
  DailyPuzzleGuess,
} from "../../types/words";
import GameKeyboard from "./GameKeyboard";

type LetterStatus = DailyGuessLetterState | "default";

type CellState = {
  value: string;
  status: LetterStatus;
};

type GameResult = "playing" | "won" | "lost";
type ShareButtonState = "idle" | "copied" | "error";

const ROWS = 6;
const COLUMNS = 5;

const DEFAULT_STATUS: LetterStatus = "default";

const STATUS_PRIORITY: Record<LetterStatus, number> = {
  default: 0,
  absent: 1,
  present: 2,
  correct: 3,
};

const CELL_STYLES: Record<LetterStatus, string> = {
  default: "bg-[#1E1827] text-[#F8F5FF] border border-[#9C7CD8]",
  present: "bg-[#E19B30] text-[#1B0F02]",
  absent: "bg-[#120B16] text-[#F8F5FF]",
  correct: "bg-[#0F8F74] text-[#F5FFFA]",
};

const SHARE_SYMBOLS: Record<LetterStatus, string> = {
  default: "⬜",
  absent: "⬛",
  present: "🟨",
  correct: "🟩",
};
const SHARE_STATUS_RESET_MS = 2500;

const createEmptyGrid = (): CellState[][] =>
  Array.from({ length: ROWS }, () =>
    Array.from({ length: COLUMNS }, () => ({
      value: "",
      status: DEFAULT_STATUS,
    })),
  );

const getFirstEmptyColumn = (row: CellState[]) => {
  const index = row.findIndex((cell) => !cell.value);
  return index === -1 ? COLUMNS : index;
};

const getNextEmptyAfter = (row: CellState[], fromIndex: number) => {
  for (let column = fromIndex + 1; column < COLUMNS; column += 1) {
    if (!row[column].value) {
      return column;
    }
  }
  return null;
};

const getPreviousFilledColumn = (row: CellState[], fromIndex: number) => {
  for (
    let column = Math.min(fromIndex, COLUMNS - 1);
    column >= 0;
    column -= 1
  ) {
    if (row[column]?.value) {
      return column;
    }
  }
  return null;
};

const DailyGame = () => {
  const { updateUser, user } = useAuth();

  const {
    data: dailyStatus,
    isLoading: isPuzzleLoading,
    error: puzzleError,
  } = useDailyWordsPuzzleQuery();

  const guessMutation = useSubmitDailyGuessMutation();

  const dailyIdentifier =
    dailyStatus?.puzzle.dailyId ?? dailyStatus?.puzzle.date ?? "";

  const [grid, setGrid] = useState<CellState[][]>(() => createEmptyGrid());
  const [currentRow, setCurrentRow] = useState(0);
  const [selectedCol, setSelectedCol] = useState(0);
  const [keyboardState, setKeyboardState] = useState<
    Record<string, LetterStatus>
  >({});
  const [gameStatus, setGameStatus] = useState<GameResult>("playing");
  const [feedback, setFeedback] = useState<string>("");
  const [isRowShaking, setIsRowShaking] = useState(false);
  const [highlightEmptyCells, setHighlightEmptyCells] = useState(false);
  const shakeTimeout = useRef<ReturnType<typeof window.setTimeout> | null>(
    null,
  );
  const highlightTimeout = useRef<ReturnType<typeof window.setTimeout> | null>(
    null,
  );
  const shareStatusTimeout = useRef<ReturnType<
    typeof window.setTimeout
  > | null>(null);
  const [shareButtonState, setShareButtonState] =
    useState<ShareButtonState>("idle");
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [hasShownResultModal, setHasShownResultModal] = useState(false);
  const [lastScoreAwarded, setLastScoreAwarded] = useState<number | null>(null);

  const isInputLocked =
    gameStatus !== "playing" || guessMutation.isPending || !dailyIdentifier;

  const completedRows = useMemo(
    () =>
      grid.filter(
        (row) =>
          row.some((cell) => cell.value) &&
          row.every((cell) => cell.status !== DEFAULT_STATUS),
      ),
    [grid],
  );

  const completedAttempts = completedRows.length;
  const isGameFinished = gameStatus !== "playing" && completedAttempts > 0;
  const shareRows = useMemo(
    () =>
      completedRows.map((row) =>
        row
          .map((cell) => SHARE_SYMBOLS[cell.status] ?? SHARE_SYMBOLS.default)
          .join(""),
      ),
    [completedRows],
  );
  const shareButtonDisabled = !isGameFinished || shareRows.length === 0;
  const resolvedScore = lastScoreAwarded ?? 0;
  const currentStreak = user?.streak ?? 0;
  const resultTitle =
    gameStatus === "won" ? "Você venceu!" : "Tentativas esgotadas";
  const resultLabel = gameStatus === "won" ? "Vitória" : "Derrota";
  const resultDescription =
    gameStatus === "won"
      ? "Parabéns! Você encontrou a palavra do dia."
      : "Não foi dessa vez, mas amanhã tem outra chance.";
  const shareButtonLabelPrimary =
    shareButtonState === "idle"
      ? "Compartilhar resultado"
      : shareButtonState === "copied"
        ? "Copiado!"
        : "Tentar novamente";
  const shareButtonLabelModal =
    shareButtonState === "idle"
      ? "Compartilhar"
      : shareButtonState === "copied"
        ? "Copiado!"
        : "Tentar novamente";

  const synchronizePointers = (row: CellState[]) => {
    const nextEmpty = getFirstEmptyColumn(row);
    const nextSelected =
      nextEmpty >= COLUMNS ? Math.max(COLUMNS - 1, 0) : nextEmpty;
    setSelectedCol(nextSelected);
  };

  const triggerRowShake = () => {
    if (shakeTimeout.current) {
      window.clearTimeout(shakeTimeout.current);
    }
    setIsRowShaking(true);
    shakeTimeout.current = window.setTimeout(() => {
      setIsRowShaking(false);
      shakeTimeout.current = null;
    }, 600);
  };

  const triggerHighlightEmpty = () => {
    if (highlightTimeout.current) {
      window.clearTimeout(highlightTimeout.current);
    }
    setHighlightEmptyCells(true);
    highlightTimeout.current = window.setTimeout(() => {
      setHighlightEmptyCells(false);
      highlightTimeout.current = null;
    }, 600);
  };

  useEffect(() => {
    return () => {
      if (shakeTimeout.current) {
        window.clearTimeout(shakeTimeout.current);
      }
      if (highlightTimeout.current) {
        window.clearTimeout(highlightTimeout.current);
      }
      if (shareStatusTimeout.current) {
        window.clearTimeout(shareStatusTimeout.current);
      }
    };
  }, []);

  useEffect(() => {
    if (shareStatusTimeout.current) {
      window.clearTimeout(shareStatusTimeout.current);
      shareStatusTimeout.current = null;
    }
    setHasShownResultModal(false);
    setIsResultModalOpen(false);
    setShareButtonState("idle");
  }, [dailyIdentifier]);

  useEffect(() => {
    if (!dailyStatus || !dailyIdentifier) {
      return;
    }

    const baseGrid = createEmptyGrid();
    const nextKeyboard: Record<string, LetterStatus> = {};

    const sortedGuesses: DailyPuzzleGuess[] = [...(dailyStatus.guesses ?? [])]
      .slice()
      .sort((a, b) => a.attemptNumber - b.attemptNumber);

    sortedGuesses.forEach((guess) => {
      const rowIndex = guess.attemptNumber - 1;
      if (rowIndex < 0 || rowIndex >= ROWS) {
        return;
      }

      baseGrid[rowIndex] = baseGrid[rowIndex].map((cell, columnIndex) => {
        const letterData = guess.letters[columnIndex];
        if (!letterData) {
          return cell;
        }

        const upper = letterData.letter.toUpperCase();
        const status = letterData.state as LetterStatus;

        const currentKeyboardStatus = nextKeyboard[upper];
        if (
          !currentKeyboardStatus ||
          STATUS_PRIORITY[status] > STATUS_PRIORITY[currentKeyboardStatus]
        ) {
          nextKeyboard[upper] = status;
        }

        return {
          value: upper,
          status,
        };
      });
    });

    setGrid(baseGrid);
    setKeyboardState(nextKeyboard);
    setLastScoreAwarded(dailyStatus.scoreAwarded ?? null);

    const backendStatus = dailyStatus.status;

    if (backendStatus === "in_progress") {
      setGameStatus("playing");
      const nextRowIndex = Math.min(dailyStatus.attemptsUsed, ROWS - 1);
      setCurrentRow(nextRowIndex);
      synchronizePointers(baseGrid[nextRowIndex]);
      setFeedback("");
      return;
    }

    const finalRowIndex = Math.min(
      Math.max(dailyStatus.attemptsUsed - 1, 0),
      ROWS - 1,
    );
    setCurrentRow(finalRowIndex);
    synchronizePointers(baseGrid[finalRowIndex]);

    if (backendStatus === "won") {
      setGameStatus("won");
      setFeedback("");
    } else {
      setGameStatus("lost");
      setFeedback("");
    }
  }, [dailyIdentifier, dailyStatus]);

  useEffect(() => {
    if (isGameFinished && !hasShownResultModal) {
      setIsResultModalOpen(true);
      setHasShownResultModal(true);
    }
  }, [hasShownResultModal, isGameFinished]);

  const handleLetter = (letter: string) => {
    if (isInputLocked) {
      return;
    }

    const upperLetter = letter.toUpperCase();

    const insertionColumn = Math.min(Math.max(selectedCol, 0), COLUMNS - 1);

    if (insertionColumn < 0 || insertionColumn >= COLUMNS) {
      setFeedback("Linha completa, envie ou apague uma letra.");
      return;
    }

    setGrid((previous) => {
      const next = previous.map((row, rowIndex) => {
        if (rowIndex !== currentRow) {
          return row;
        }

        return row.map(
          (cell, columnIndex): CellState =>
            columnIndex === insertionColumn
              ? { ...cell, value: upperLetter, status: DEFAULT_STATUS }
              : cell,
        );
      });

      const updatedRow = next[currentRow];
      const nextEmpty = getNextEmptyAfter(updatedRow, insertionColumn);
      setSelectedCol(nextEmpty !== null ? nextEmpty : insertionColumn);

      return next;
    });
    setFeedback("");
  };

  const handleDelete = () => {
    if (isInputLocked) {
      return;
    }

    const activeRow = grid[currentRow];
    const targetIndex = activeRow[selectedCol]?.value
      ? selectedCol
      : getPreviousFilledColumn(activeRow, selectedCol - 1);

    if (targetIndex === null) {
      return;
    }

    setGrid((previous) => {
      const next = previous.map((row, rowIndex) =>
        rowIndex === currentRow
          ? row.map(
              (cell, columnIndex): CellState =>
                columnIndex === targetIndex
                  ? { ...cell, value: "", status: DEFAULT_STATUS }
                  : cell,
            )
          : row,
      );

      setSelectedCol(targetIndex);

      return next;
    });
    setFeedback("");
  };

  const applyAttemptResult = (attempt: DailyGuessResponse["attempt"]) => {
    const attemptRowIndex = attempt.attemptNumber - 1;

    setGrid((previous) =>
      previous.map((row, rowIndex) => {
        if (rowIndex !== attemptRowIndex) {
          return row;
        }

        return row.map((cell, columnIndex): CellState => {
          const letterData = attempt.letters[columnIndex];
          if (!letterData) {
            return cell;
          }

          return {
            value: letterData.letter.toUpperCase(),
            status: letterData.state as LetterStatus,
          };
        });
      }),
    );

    setKeyboardState((previous) => {
      const next = { ...previous };
      attempt.letters.forEach(({ letter, state }) => {
        const upper = letter.toUpperCase();
        const current = next[upper];

        if (!current || STATUS_PRIORITY[state] > STATUS_PRIORITY[current]) {
          next[upper] = state;
        }
      });
      return next;
    });
  };

  const handleGuessSuccess = (data: DailyGuessResponse) => {
    applyAttemptResult(data.attempt);
    setLastScoreAwarded(data.scoreAwarded ?? null);

    const userUpdate: Partial<{
      score: number;
      streak: number;
    }> = { score: data.userScore };

    if (data.status === "won") {
      userUpdate.streak = (user?.streak ?? 0) + 1;
    } else if (data.status === "lost") {
      userUpdate.streak = 0;
    }

    updateUser(userUpdate);

    if (data.status === "in_progress") {
      setGameStatus("playing");
      const nextRowIndex = Math.min(data.attempt.attemptNumber, ROWS - 1);
      setCurrentRow(nextRowIndex);

      const updatedRow = grid[nextRowIndex] ?? createEmptyGrid()[0];
      const nextEmpty = getFirstEmptyColumn(updatedRow);
      const nextSelected =
        nextEmpty >= COLUMNS ? Math.max(COLUMNS - 1, 0) : nextEmpty;
      setSelectedCol(nextSelected);

      setFeedback("");
      return;
    }

    setGameStatus(data.status);
    setFeedback("");
  };

  const extractErrorMessage = (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const responseData = error.response?.data as { message?: string };
      if (responseData?.message) {
        return responseData.message;
      }
      return error.message;
    }

    return "Não foi possível enviar a tentativa. Tente novamente.";
  };

  const evaluateGuess = () => {
    if (isInputLocked || !dailyIdentifier) {
      return;
    }

    const guess = grid[currentRow].map((cell) => cell.value).join("");
    if (guess.length !== COLUMNS) {
      triggerHighlightEmpty();
      setFeedback("");
      return;
    }

    guessMutation.mutate(
      {
        guessWord: guess,
        dailyId: dailyIdentifier,
      },
      {
        onSuccess: handleGuessSuccess,
        onError: (error) => {
          if (
            axios.isAxiosError(error) &&
            (error.response?.data as { error?: string })?.error ===
              "Guess word is not allowed"
          ) {
            setFeedback("");
            triggerRowShake();
            return;
          }

          setFeedback(extractErrorMessage(error));
        },
      },
    );
  };

  const buildShareText = () => {
    if (!isGameFinished || !shareRows.length) {
      return null;
    }

    const attemptsLabel =
      gameStatus === "won" ? `${completedAttempts}/${ROWS}` : `X/${ROWS}`;
    const header = dailyStatus?.date
      ? `Words Daily ${dailyStatus.date}`
      : "Words Daily";
    const origin =
      typeof window !== "undefined" && window.location
        ? window.location.origin
        : "";
    const link = origin ? `${origin}/game/daily` : "/game/daily";
    const board = shareRows.join("\n");

    return [`${header} ${attemptsLabel}`, board, link]
      .filter(Boolean)
      .join("\n");
  };

  const copyShareToClipboard = async (text: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    if (typeof document !== "undefined") {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      textArea.setAttribute("readonly", "");
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);
      if (!successful) {
        throw new Error("execCommand falhou");
      }
      return;
    }

    throw new Error("Clipboard API indisponível");
  };

  const updateShareButtonState = (state: ShareButtonState) => {
    if (shareStatusTimeout.current) {
      window.clearTimeout(shareStatusTimeout.current);
      shareStatusTimeout.current = null;
    }
    setShareButtonState(state);
    if (state !== "idle") {
      shareStatusTimeout.current = window.setTimeout(() => {
        setShareButtonState("idle");
        shareStatusTimeout.current = null;
      }, SHARE_STATUS_RESET_MS);
    }
  };

  const handleShareResult = async () => {
    const shareText = buildShareText();
    if (!shareText) {
      updateShareButtonState("error");
      return;
    }

    try {
      await copyShareToClipboard(shareText);
      updateShareButtonState("copied");
    } catch {
      updateShareButtonState("error");
    }
  };

  const closeResultModal = () => {
    setIsResultModalOpen(false);
  };

  const handleArrowLeft = () => {
    if (isInputLocked) {
      return;
    }
    const newCol = selectedCol - 1;
    if (newCol >= 0) {
      setSelectedCol(newCol);
    }
  };

  const handleArrowRight = () => {
    if (isInputLocked) {
      return;
    }
    const newCol = selectedCol + 1;
    if (newCol < COLUMNS) {
      setSelectedCol(newCol);
    }
  };

  const handleKeyPress = (key: string) => {
    if (key === "ENTER") {
      evaluateGuess();
    } else if (key === "DELETE") {
      handleDelete();
    } else if (key === "ARROWLEFT") {
      handleArrowLeft();
    } else if (key === "ARROWRIGHT") {
      handleArrowRight();
    } else {
      handleLetter(key);
    }
  };

  const handleCellClick = (rowIndex: number, columnIndex: number) => {
    if (isInputLocked || rowIndex !== currentRow) {
      return;
    }
    setSelectedCol(columnIndex);
  };

  const getRowStateClass = (rowIndex: number) => {
    if (rowIndex > currentRow) {
      return "opacity-30 saturate-50 pointer-events-none";
    }
    if (rowIndex === currentRow) {
      return "opacity-100";
    }
    return "opacity-90";
  };

  if (isPuzzleLoading) {
    return (
      <div className="text-center text-sm text-slate-300">
        Carregando puzzle diário...
      </div>
    );
  }

  if (puzzleError) {
    return (
      <div className="max-w-md text-center text-sm text-red-400">
        {axios.isAxiosError(puzzleError)
          ? ((
              puzzleError.response?.data as {
                message?: string;
              }
            )?.message ?? puzzleError.message)
          : "Não foi possível carregar o puzzle diário."}
      </div>
    );
  }

  if (!dailyStatus) {
    return null;
  }

  return (
    <>
      <div className="flex flex-col items-center gap-8 text-white ">
        <header className="flex w-full flex-col items-center gap-3">
          <div className="flex w-full flex-col items-center gap-3   sm:flex-row sm:items-center sm:justify-between">
            <Link
              to="/game"
            className="inline-flex items-center text-slate-200! gap-2 rounded-md border border-neutral-700 px-4 py-2 text-sm font-semibold  transition hover:border-neutral-500 hover:text-white"
            >
              {"\u2190"} Voltar para modos
            </Link>
            <div className="flex flex-1 flex-col items-center text-center sm:px-6">
              <p className="text-sm uppercase tracking-[0.4em] text-slate-400">
                Daily
              </p>
              <h1 className="text-3xl font-semibold text-white">
                Descubra a palavra do dia
              </h1>
            </div>
            <div className="hidden w-[170px] sm:block" aria-hidden="true" />
          </div>
          <p className="text-xs text-slate-500">{dailyStatus.date}</p>
        </header>

        <div className="flex flex-col gap-2">
          {grid.map((row, rowIndex) => {
            const rowClass = getRowStateClass(rowIndex);
            const isCurrentRow = rowIndex === currentRow && !isInputLocked;
            return (
              <div
                key={`row-${rowIndex}`}
                className={`flex gap-2 ${rowClass} ${
                  isRowShaking && rowIndex === currentRow ? "shake-row" : ""
                }`}
              >
                {row.map((cell, columnIndex) => {
                  const isSelected =
                    isCurrentRow && columnIndex === selectedCol;
                  const shakingCell = isRowShaking && rowIndex === currentRow;
                  const shouldHighlight =
                    highlightEmptyCells && isCurrentRow && !cell.value;
                  return (
                    <button
                      type="button"
                      key={`cell-${rowIndex}-${columnIndex}`}
                      disabled={!isCurrentRow}
                      onClick={() => handleCellClick(rowIndex, columnIndex)}
                      className={`flex h-14 w-14 items-center justify-center rounded-md text-2xl font-semibold uppercase transition ${
                        CELL_STYLES[cell.status]
                      } ${
                        isSelected
                          ? "ring-2 ring-[#F2B94B] shadow-[0_0_8px_rgba(242,185,75,0.55)]"
                          : ""
                      } ${
                        shakingCell ? "border-2 border-red-500" : ""
                      } ${shouldHighlight ? "cell-highlight" : ""}
                    } ${isCurrentRow ? "cursor-pointer" : "cursor-default"}`}
                    >
                      {cell.value}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {feedback ? <p className="text-sm text-slate-300">{feedback}</p> : null}

        <GameKeyboard
          statuses={keyboardState}
          disabled={isInputLocked}
          onKeyPress={handleKeyPress}
        />

        <div className="flex flex-col items-center gap-2">
          {isGameFinished ? (
            <>
              <button
                type="button"
                onClick={handleShareResult}
                className="rounded-md cursor-pointer  bg-[#9C7CD8] px-4 py-2 text-sm font-semibold text-[#120B16] transition hover:bg-[#B793FF]"
              >
                {shareButtonLabelPrimary}
              </button>
              <button
                type="button"
                onClick={() => setIsResultModalOpen(true)}
                className="text-xs font-semibold cursor-pointer text-slate-300 underline decoration-dotted underline-offset-4 transition hover:text-white"
              >
                Ver resumo do dia
              </button>
            </>
          ) : null}
        </div>
      </div>

      {isResultModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="relative w-full max-w-md rounded-lg bg-[#1B1422] p-6 text-white shadow-2xl">
            <button
              type="button"
              onClick={closeResultModal}
              className="absolute right-4 cursor-pointer top-4 text-lg font-bold text-slate-400 transition hover:text-white"
              aria-label="Fechar resumo"
            >
              X
            </button>
            <div className="mb-4 text-center">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                Resultado diário
              </p>
              <h2 className="text-2xl font-semibold text-white">
                {resultTitle}
              </h2>
              <p className="text-sm text-slate-400">{dailyStatus.date}</p>
              <p className="mt-2 text-xs text-slate-300">{resultDescription}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-center text-xs uppercase text-slate-400">
              <div className="rounded-lg border border-[#3B2D46] p-3">
                <p className="mb-1">Tentativas</p>
                <p className="text-xl font-semibold text-white">
                  {completedAttempts}/{ROWS}
                </p>
              </div>
              <div className="rounded-lg border border-[#3B2D46] p-3">
                <p className="mb-1">Pontuação</p>
                <p className="text-xl font-semibold text-white">
                  {resolvedScore}
                </p>
              </div>
              <div className="rounded-lg border border-[#3B2D46] p-3">
                <p className="mb-1">Status</p>
                <p className="text-xl font-semibold text-white">
                  {resultLabel}
                </p>
              </div>
              <div className="rounded-lg border border-[#3B2D46] p-3">
                <p className="mb-1">Streak</p>
                <p className="text-xl font-semibold text-white">
                  {currentStreak}
                </p>
              </div>
            </div>
            {shareRows.length ? (
              <div className="mt-6 rounded-md bg-[#22182F] p-4 text-center text-2xl leading-tight">
                {shareRows.map((row, index) => (
                  <div className="font-mono" key={`share-row-${index}`}>
                    {row}
                  </div>
                ))}
              </div>
            ) : null}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleShareResult}
                disabled={shareButtonDisabled}
                className={`cursor-pointer flex-1 rounded-md px-4 py-2 text-sm font-semibold transition focus:outline-none ${
                  shareButtonDisabled
                    ? "cursor-not-allowed bg-[#2F2437] text-slate-500 opacity-60"
                    : "bg-[#9C7CD8] text-[#120B16] hover:bg-[#B793FF]"
                }`}
              >
                {shareButtonLabelModal}
              </button>
              <button
                type="button"
                onClick={closeResultModal}
                className="flex-1 rounded-md cursor-pointer border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-slate-400"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default DailyGame;
