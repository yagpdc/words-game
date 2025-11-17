import { useMemo } from "react";
import type { WordsHistoryItem } from "../../types/words";
import type { DailyGuessLetterState } from "../../types/words";

type HistoryMatchDetailsProps = {
  item: WordsHistoryItem;
  statusLabel: string;
  statusClass: string;
  formatDate: (value?: string | null) => string;
  onClose: () => void;
};

type CellStatus = DailyGuessLetterState | "empty";

const CELL_STYLES: Record<CellStatus, string> = {
  correct:
    "bg-emerald-600 text-white border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.25)]",
  present:
    "bg-amber-500 text-[#1F1303] border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.20)]",
  absent: "bg-[#23182F] text-neutral-400 border-[#33223F]",
  empty:
    "border border-dashed border-neutral-700/70 text-neutral-600 bg-transparent",
};

const DOT_STYLES: Record<DailyGuessLetterState, string> = {
  correct: "bg-emerald-500",
  present: "bg-amber-400",
  absent: "bg-neutral-600",
};

const patternDigitToState = (digit: string): DailyGuessLetterState => {
  switch (digit) {
    case "2":
      return "correct";
    case "1":
      return "present";
    default:
      return "absent";
  }
};

const HistoryMatchDetails = ({
  item,
  statusLabel,
  statusClass,
  formatDate,
  onClose,
}: HistoryMatchDetailsProps) => {
  const sortedGuesses = useMemo(
    () =>
      [...(item.guesses ?? [])].sort(
        (a, b) => a.attemptNumber - b.attemptNumber,
      ),
    [item.guesses],
  );

  const wordLength = useMemo(() => {
    if (item.puzzleWord) {
      return item.puzzleWord.length;
    }

    if (sortedGuesses.length > 0) {
      return sortedGuesses[0].guessWord.length;
    }

    return 5;
  }, [item.puzzleWord, sortedGuesses]);

  const totalRows = Math.max(
    item.maxAttempts ?? sortedGuesses.length,
    sortedGuesses.length,
    6,
  );

  const boardRows = useMemo(() => {
    return Array.from({ length: totalRows }, (_, rowIndex) => {
      const guess = sortedGuesses[rowIndex];

      if (!guess) {
        return Array.from({ length: wordLength }, () => ({
          letter: "",
          status: "empty" as const,
        }));
      }

      const letters = guess.guessWord.toUpperCase().split("");

      return Array.from({ length: wordLength }, (_, columnIndex) => ({
        letter: letters[columnIndex] ?? "",
        status: patternDigitToState(guess.pattern.charAt(columnIndex) ?? "0"),
      }));
    });
  }, [sortedGuesses, totalRows, wordLength]);

  const puzzleCode = item.puzzleId ? item.puzzleId.slice(-8) : "--------";

  return (
    <div className="relative flex w-full flex-col gap-6 rounded-2xl border border-neutral-800 bg-[#0f0b14] p-6 shadow-2xl">
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full border border-neutral-700 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-neutral-400 transition hover:border-neutral-500 hover:text-white cursor-pointer"
      >
        Fechar
      </button>

      <header className="pr-16">
        <p className="text-xs uppercase tracking-[0.35em] text-neutral-500">
          Partida #{puzzleCode}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h2 className="text-3xl font-semibold text-white">
            {item.puzzleWord?.toUpperCase() ?? "Palavra oculta"}
          </h2>
          <span
            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusClass}`}
          >
            {statusLabel}
          </span>
        </div>
        <p className="mt-1 text-sm text-neutral-400">
          Data do jogo: {formatDate(item.date)} · Finalizado em:{" "}
          {formatDate(item.finishedAt)}
        </p>
      </header>

      <section className="flex flex-col gap-3 rounded-xl border border-neutral-800 bg-[#120b17] p-5">
        <p className="text-xs uppercase tracking-[0.4em] text-neutral-500">
          Tabuleiro
        </p>
        <div className="flex flex-col items-center gap-2">
          {boardRows.map((row, rowIndex) => (
            <div className="flex gap-2" key={`row-${rowIndex}`}>
              {row.map((cell, cellIndex) => (
                <div
                  key={`cell-${rowIndex}-${cellIndex}`}
                  className={`flex h-12 w-12 items-center justify-center rounded-lg border text-2xl font-bold uppercase tracking-wide ${CELL_STYLES[cell.status]}`}
                >
                  {cell.letter}
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-neutral-800 bg-[#120b17] p-4">
          <p className="text-xs uppercase tracking-[0.35em] text-neutral-500">
            Tentativas
          </p>
          <p className="mt-1 text-2xl font-semibold text-white">
            {item.attemptsUsed}/{item.maxAttempts}
          </p>
        </div>
        <div className="rounded-xl border border-neutral-800 bg-[#120b17] p-4">
          <p className="text-xs uppercase tracking-[0.35em] text-neutral-500">
            Score
          </p>
          <p className="mt-1 text-2xl font-semibold text-white">
            {item.score ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-neutral-800 bg-[#120b17] p-4">
          <p className="text-xs uppercase tracking-[0.35em] text-neutral-500">
            ID do puzzle
          </p>
          <p className="mt-1 font-mono text-xl tracking-widest text-neutral-200">
            #{puzzleCode}
          </p>
        </div>
      </section>

      {sortedGuesses.length > 0 ? (
        <section className="rounded-xl border border-neutral-800 bg-[#120b17] p-5">
          <header className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-neutral-500">
                Sequência de tentativas
              </p>
              <p className="text-sm text-neutral-400">
                {sortedGuesses.length} registro(s)
              </p>
            </div>
          </header>

          <ol className="mt-4 flex flex-col gap-3">
            {sortedGuesses.map((guess) => (
              <li
                key={guess.attemptNumber}
                className="rounded-lg border border-neutral-800/80 bg-[#0c0811] px-4 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs uppercase tracking-wide text-neutral-500">
                  <span>Tentativa #{guess.attemptNumber}</span>
                  <span>{formatDate(guess.createdAt)}</span>
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
                  <p className="font-mono text-xl tracking-[0.4em] text-white">
                    {guess.guessWord.toUpperCase()}
                  </p>
                  <div className="flex items-center gap-1">
                    {guess.pattern
                      .slice(0, wordLength)
                      .split("")
                      .map((digit, index) => {
                        const status = patternDigitToState(digit);
                        return (
                          <span
                            key={`${guess.attemptNumber}-${index}`}
                            className={`h-3 w-3 rounded-full ${DOT_STYLES[status]}`}
                          />
                        );
                      })}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : (
        <section className="rounded-xl border border-dashed border-neutral-800/70 bg-[#120b17]/40 p-5 text-center text-sm text-neutral-400">
          Esta partida não possui tentativas registradas.
        </section>
      )}
    </div>
  );
};

export default HistoryMatchDetails;
