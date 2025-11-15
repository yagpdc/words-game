import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../hooks/auth/use-auth.hook";
import { useDailyWordsPuzzleQuery } from "../../hooks/words/use-daily-words-puzzle";
import { useSubmitDailyGuessMutation } from "../../hooks/words/use-submit-daily-guess";
import type {
  DailyGuessLetterState,
  DailyGuessResponse,
  DailyPuzzleGuess,
} from "../../types/words";

type LetterStatus = DailyGuessLetterState | "default";

type CellState = {
  value: string;
  status: LetterStatus;
};

type GameResult = "playing" | "won" | "lost";

const ROWS = 6;
const COLUMNS = 5;

const KEYBOARD_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "DELETE"],
];

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

const KEYBOARD_STYLES: Record<LetterStatus, string> = {
  default: "bg-[#3A2C44] text-white hover:bg-[#4B3B58]",
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

const DailyGame = () => {
  const { updateUser } = useAuth();

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
      setFeedback(
        typeof dailyStatus.remainingAttempts === "number"
          ? `Tentativas restantes: ${dailyStatus.remainingAttempts}`
          : "",
      );
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
      setFeedback(`A letra "${upperLetter}" não existe nesta palavra.`);
      return;
    }

    const activeRow = grid[currentRow];
    const firstEmpty = getFirstEmptyColumn(activeRow);
    const isRowFull = firstEmpty === COLUMNS;
    const insertionColumn =
      isRowFull || selectedCol < firstEmpty ? selectedCol : firstEmpty;

    if (insertionColumn >= COLUMNS) {
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
      const nextEmpty = getFirstEmptyColumn(updatedRow);
      const nextSelected =
        nextEmpty >= COLUMNS ? Math.max(COLUMNS - 1, 0) : nextEmpty;
      setSelectedCol(nextSelected);

      return next;
    });
    setFeedback("");
  };

  const handleDelete = () => {
    if (isInputLocked) {
      return;
    }

    const activeRow = grid[currentRow];
    const firstEmpty = getFirstEmptyColumn(activeRow);

    if (firstEmpty === 0 && !activeRow[0].value) {
      return;
    }

    const deleteIndex =
      firstEmpty === COLUMNS ? COLUMNS - 1 : Math.max(firstEmpty - 1, 0);

    setGrid((previous) => {
      const next = previous.map((row, rowIndex) =>
        rowIndex === currentRow
          ? row.map(
              (cell, columnIndex): CellState =>
                columnIndex === deleteIndex
                  ? { ...cell, value: "", status: DEFAULT_STATUS }
                  : cell,
            )
          : row,
      );

      const updatedRow = next[currentRow];
      const nextEmpty = getFirstEmptyColumn(updatedRow);
      const nextSelected =
        nextEmpty >= COLUMNS ? Math.max(COLUMNS - 1, 0) : nextEmpty;
      setSelectedCol(nextSelected);

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
    updateUser({ score: data.userScore });

    if (data.status === "in_progress") {
      setGameStatus("playing");
      const nextRowIndex = Math.min(data.attempt.attemptNumber, ROWS - 1);
      setCurrentRow(nextRowIndex);

      const updatedRow = grid[nextRowIndex] ?? createEmptyGrid()[0];
      const nextEmpty = getFirstEmptyColumn(updatedRow);
      const nextSelected =
        nextEmpty >= COLUMNS ? Math.max(COLUMNS - 1, 0) : nextEmpty;
      setSelectedCol(nextSelected);

      setFeedback(
        typeof data.remainingAttempts === "number"
          ? `Tentativas restantes: ${data.remainingAttempts}`
          : "",
      );
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
      setFeedback("Complete a palavra antes de enviar.");
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
            <div key={`row-${rowIndex}`} className={`flex gap-2 ${rowClass}`}>
              {row.map((cell, columnIndex) => {
                const isSelected = isCurrentRow && columnIndex === selectedCol;
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

      <div className="flex flex-col gap-2">
        {KEYBOARD_ROWS.map((row, rowIndex) => (
          <div
            key={`keyboard-row-${rowIndex}`}
            className="flex justify-center gap-2"
          >
            {row.map((key) => {
              const upperKey = key.toUpperCase();
              const status = keyboardState[upperKey] ?? "default";
              const isAction = key === "ENTER" || key === "DELETE";
              const isDisabled =
                isInputLocked || (status === "absent" && !isAction);
              return (
                <button
                  key={key}
                  type="button"
                  disabled={isDisabled}
                  className={`min-w-12 rounded-md px-3 py-2 text-sm font-semibold transition focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 ${
                    isAction ? "text-xs uppercase" : ""
                  } ${KEYBOARD_STYLES[status]}`}
                  onClick={() => handleKeyPress(upperKey)}
                >
                  {key === "DELETE"
                    ? "Apagar"
                    : key === "ENTER"
                      ? "Enter"
                      : key}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DailyGame;
