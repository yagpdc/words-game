import { useMemo, useState } from "react";
import GameKeyboard from "./GameKeyboard";

type LetterStatus = "default" | "present" | "absent" | "correct";

type CellState = {
  value: string;
  status: LetterStatus;
};

type GameResult = "playing" | "won" | "lost";

const ROWS = 6;
const COLUMNS = 5;
const TARGET_WORD = "TORCE";

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

const InfinityGame = () => {
  const [grid, setGrid] = useState<CellState[][]>(() => createEmptyGrid());
  const [currentRow, setCurrentRow] = useState(0);
  const [selectedCol, setSelectedCol] = useState(0);
  const [keyboardState, setKeyboardState] = useState<
    Record<string, LetterStatus>
  >({});
  const [gameStatus, setGameStatus] = useState<GameResult>("playing");
  const [feedback, setFeedback] = useState<string>("");

  const blockedLetters = useMemo(() => {
    return new Set(
      Object.entries(keyboardState)
        .filter(([, status]) => status === "absent")
        .map(([letter]) => letter),
    );
  }, [keyboardState]);

  const isInputLocked = gameStatus !== "playing";

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
              ? {
                  ...cell,
                  value: upperLetter,
                  status: DEFAULT_STATUS,
                }
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
          ? row.map((cell, columnIndex) =>
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

  const evaluateGuess = (guess: string) => {
    const guessLower = guess.toLowerCase();
    const targetLower = TARGET_WORD.toLowerCase();

    const letterCounts: Record<string, number> = {};
    for (const letter of targetLower) {
      letterCounts[letter] = (letterCounts[letter] ?? 0) + 1;
    }

    const statuses: LetterStatus[] = Array.from(
      { length: COLUMNS },
      () => "absent" as LetterStatus,
    );

    for (let index = 0; index < COLUMNS; index += 1) {
      const guessChar = guessLower[index];
      if (guessChar === targetLower[index]) {
        statuses[index] = "correct";
        letterCounts[guessChar] -= 1;
      }
    }

    for (let index = 0; index < COLUMNS; index += 1) {
      if (statuses[index] === "correct") {
        continue;
      }

      const guessChar = guessLower[index];
      if (letterCounts[guessChar] > 0) {
        statuses[index] = "present";
        letterCounts[guessChar] -= 1;
      } else {
        statuses[index] = "absent";
      }
    }

    setGrid((previous) =>
      previous.map((row, rowIndex) =>
        rowIndex === currentRow
          ? row.map(
              (cell, columnIndex): CellState => ({
                ...cell,
                status: statuses[columnIndex],
              }),
            )
          : row,
      ),
    );

    setKeyboardState((previous) => {
      const next = { ...previous };
      statuses.forEach((status, index) => {
        const letter = guess[index];
        const current = next[letter];
        if (!current || STATUS_PRIORITY[status] > STATUS_PRIORITY[current]) {
          next[letter] = status;
        }
      });
      return next;
    });

    if (statuses.every((status) => status === "correct")) {
      setGameStatus("won");
      setFeedback("Você venceu!");
      return;
    }

    if (currentRow === ROWS - 1) {
      setGameStatus("lost");
      setFeedback(`Fim de jogo! A palavra era ${TARGET_WORD}.`);
      return;
    }

    setCurrentRow((prev) => prev + 1);
    setSelectedCol(0);
    setFeedback("");
  };

  const evaluateGuessAndSubmit = () => {
    if (isInputLocked) {
      return;
    }

    const guess = grid[currentRow].map((cell) => cell.value).join("");
    if (guess.length !== COLUMNS) {
      setFeedback("Complete a palavra antes de enviar.");
      return;
    }

    evaluateGuess(guess);
  };

  const handleKeyPress = (key: string) => {
    if (key === "ENTER") {
      evaluateGuessAndSubmit();
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

  return (
    <div className="flex flex-col items-center gap-8 text-white">
      <header className="text-center">
        <p className="text-sm uppercase tracking-[0.4em] text-slate-400">
          Infinity
        </p>
        <h1 className="text-3xl font-semibold text-white">
          Descubra a palavra
        </h1>
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

      <GameKeyboard
        statuses={keyboardState}
        disabled={isInputLocked}
        onKeyPress={handleKeyPress}
      />
    </div>
  );
};

export default InfinityGame;
