import { useMemo, useState } from "react";

type LetterStatus = "default" | "present" | "absent" | "correct";

type CellState = {
  value: string;
  status: LetterStatus;
};

type GameResult = "playing" | "won" | "lost";

const ROWS = 6;
const COLUMNS = 5;
const TARGET_WORD = "TORCE";

const KEYBOARD_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "DELETE"],
];

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
      status: "default" as LetterStatus,
    })),
  );

const getFirstEmptyColumn = (row: CellState[]) => {
  const index = row.findIndex((cell) => !cell.value);
  return index === -1 ? COLUMNS : index;
};

const InfinityGame = () => {
  const [grid, setGrid] = useState<CellState[][]>(() => createEmptyGrid());
  const [currentRow, setCurrentRow] = useState(0);
  const [currentCol, setCurrentCol] = useState(0);
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

  const synchronizePointers = (row: CellState[]) => {
    const nextEmpty = getFirstEmptyColumn(row);
    setCurrentCol(nextEmpty);
    setSelectedCol(nextEmpty >= COLUMNS ? Math.max(COLUMNS - 1, 0) : nextEmpty);
  };

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
    const normalizedCurrent = getFirstEmptyColumn(activeRow);
    const isRowFull = normalizedCurrent === COLUMNS;
    const insertionColumn =
      isRowFull || selectedCol < normalizedCurrent
        ? selectedCol
        : normalizedCurrent;

    if (insertionColumn >= COLUMNS) {
      setFeedback("Linha completa, envie ou apague uma letra.");
      return;
    }

    setGrid((previous) => {
      const next = previous.map((row, rowIndex) => {
        if (rowIndex !== currentRow) {
          return row;
        }
        return row.map((cell, columnIndex) =>
          columnIndex === insertionColumn
            ? { ...cell, value: upperLetter, status: "default" }
            : cell,
        );
      });

      synchronizePointers(next[currentRow]);
      return next;
    });
    setFeedback("");
  };

  const handleDelete = () => {
    if (isInputLocked) {
      return;
    }

    const activeRow = grid[currentRow];
    const normalizedCurrent = getFirstEmptyColumn(activeRow);

    if (normalizedCurrent === 0 && !activeRow[0].value) {
      return;
    }

    const deleteIndex =
      normalizedCurrent === COLUMNS
        ? COLUMNS - 1
        : Math.max(normalizedCurrent - 1, 0);

    setGrid((previous) => {
      const next = previous.map((row, rowIndex) =>
        rowIndex === currentRow
          ? row.map((cell, columnIndex) =>
              columnIndex === deleteIndex
                ? { ...cell, value: "", status: "default" }
                : cell,
            )
          : row,
      );
      synchronizePointers(next[currentRow]);
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

    const statuses: LetterStatus[] = Array(COLUMNS).fill("absent");

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
          ? row.map((cell, columnIndex) => ({
              ...cell,
              status: statuses[columnIndex],
            }))
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
    setCurrentCol(0);
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

export default InfinityGame;
