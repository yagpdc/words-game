import axios from "axios";
import { useEffect, useMemo, useRef, useState } from "react";
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
  default: "bg-[#2B2232] text-slate-200 border border-[#4C3A55]",
  present: "bg-[#D3AD69] text-[#FAFAFF]",
  absent: "bg-[#312A2C] text-[#FAFAFF]",
  correct: "bg-[#3AA394] text-[#FAFAFF]",
};

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

  const blockedLetters = useMemo(
    () =>
      new Set(
        Object.entries(keyboardState)
          .filter(([, status]) => status === "absent")
          .map(([letter]) => letter),
      ),
    [keyboardState],
  );

  const isInputLocked =
    gameStatus !== "playing" || guessMutation.isPending || !dailyIdentifier;

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
    };
  }, []);

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
      setFeedback(
        dailyStatus.scoreAwarded
          ? `Você venceu! +${dailyStatus.scoreAwarded} pts`
          : "Você venceu!",
      );
    } else {
      setGameStatus("lost");
      setFeedback("Tentativas esgotadas para hoje.");
    }
  }, [dailyIdentifier, dailyStatus]);

  const handleLetter = (letter: string) => {
    if (isInputLocked) {
      return;
    }

    const upperLetter = letter.toUpperCase();

    if (blockedLetters.has(upperLetter)) {
      return;
    }

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
    if (data.status === "won") {
      setFeedback(
        data.scoreAwarded
          ? `Você venceu! +${data.scoreAwarded} pts`
          : "Você venceu!",
      );
    } else {
      setFeedback("Tentativas esgotadas para hoje.");
    }
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

  const handleKeyPress = (key: string) => {
    if (key === "ENTER") {
      evaluateGuess();
    } else if (key === "DELETE") {
      handleDelete();
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
    <div className="flex flex-col items-center gap-8 text-white">
      <header className="text-center">
        <p className="text-sm uppercase tracking-[0.4em] text-slate-400">
          Daily
        </p>
        <h1 className="text-3xl font-semibold text-white">
          Descubra a palavra do dia
        </h1>
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
                const isSelected = isCurrentRow && columnIndex === selectedCol;
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
    </div>
  );
};

export default DailyGame;
