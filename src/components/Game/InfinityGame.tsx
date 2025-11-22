import axios from "axios";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import AchievementUnlockModal from "../AchievementUnlockModal";
import { WORDS_ENDPOINTS } from "../../api/words";
import { useAuth } from "../../hooks/auth/use-auth.hook";
import {
  useAbandonInfiniteRunMutation,
  useStartInfiniteRunMutation,
  useSubmitInfiniteGuessMutation,
  useWordsInfiniteRunQuery,
} from "../../hooks/words";
import type {
  WordsInfiniteGuess,
  WordsInfiniteHistoryEntry,
} from "../../types/words";
import GameKeyboard from "./GameKeyboard";

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

const STATUS_PRIORITY: Record<LetterStatus, number> = {
  default: 0,
  absent: 1,
  present: 2,
  correct: 3,
};

const CELL_STYLES: Record<LetterStatus, string> = {
  default: "bg-[#1E1827] text-[#FDF7FF] border border-[#3A3141]",
  present: "bg-[#E19B30] text-[#1B0F02]",
  absent: "bg-[#312A2C] text-[#FAFAFF]",
  correct: "bg-[#0F8F74] text-[#F5FFFA]",
};

const HISTORY_RESULT_STYLES: Partial<
  Record<WordsInfiniteHistoryEntry["result"], string>
> = {
  won: "bg-emerald-700/20 text-emerald-300 border border-emerald-500/50",
  lost: "bg-rose-800/20 text-rose-300 border border-rose-500/50",
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
  columns: number,
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

const getPreviousFilledIndex = (letters: string[], fromIndex: number) => {
  for (
    let column = Math.min(fromIndex, letters.length - 1);
    column >= 0;
    column -= 1
  ) {
    if (letters[column]) {
      return column;
    }
  }
  return null;
};

const formatResultLabel = (
  result: WordsInfiniteHistoryEntry["result"],
): string => {
  if (result === "won") {
    return "Vitória";
  }
  if (result === "lost") {
    return "Derrota";
  }
  return "Em andamento";
};

const getHistoryColorClass = (
  result: WordsInfiniteHistoryEntry["result"],
): string =>
  HISTORY_RESULT_STYLES[result] ??
  "bg-slate-700/40 text-slate-200 border border-slate-500/40";

const getErrorMessage = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string } | undefined;
    return data?.message ?? error.message ?? "Erro inesperado.";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Erro inesperado. Tente novamente.";
};

const InfinityGame = () => {
  const { updateUser } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: run,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useWordsInfiniteRunQuery({
    retry: false,
    refetchOnWindowFocus: false,
  });

  const startRunMutation = useStartInfiniteRunMutation();
  const guessMutation = useSubmitInfiniteGuessMutation();
  const abandonMutation = useAbandonInfiniteRunMutation();

  const [draftLetters, setDraftLetters] = useState<string[]>(() =>
    buildDraftLetters(DEFAULT_COLUMNS),
  );
  const [selectedCol, setSelectedCol] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [isRowShaking, setIsRowShaking] = useState(false);
  const [highlightEmptyCells, setHighlightEmptyCells] = useState(false);
  const [lockedPositions, setLockedPositions] = useState<Set<number>>(new Set());
  const [isTransitioning, setIsTransitioning] = useState(false);
  const shakeTimeout = useRef<ReturnType<typeof window.setTimeout> | null>(
    null,
  );
  const highlightTimeout = useRef<ReturnType<typeof window.setTimeout> | null>(
    null,
  );
  const transitionTimeout = useRef<ReturnType<typeof window.setTimeout> | null>(
    null,
  );
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [hasShownResultModal, setHasShownResultModal] = useState(false);
  const previousGuessCountRef = useRef(0);
  const [achievementQueue, setAchievementQueue] = useState<string[]>([]);
  const [currentAchievement, setCurrentAchievement] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (shakeTimeout.current) {
        window.clearTimeout(shakeTimeout.current);
      }
      if (highlightTimeout.current) {
        window.clearTimeout(highlightTimeout.current);
      }
      if (transitionTimeout.current) {
        window.clearTimeout(transitionTimeout.current);
      }
    };
  }, []);

  // Processa fila de achievements
  useEffect(() => {
    if (achievementQueue.length > 0 && !currentAchievement) {
      const [nextAchievement, ...remaining] = achievementQueue;
      setCurrentAchievement(nextAchievement);
      setAchievementQueue(remaining);
    }
  }, [achievementQueue, currentAchievement]);

  const handleAchievementClose = () => {
    setCurrentAchievement(null);
  };

  const showAchievements = async (achievements: string[]) => {
    if (achievements && achievements.length > 0) {
      // Adiciona achievements à fila para mostrar modais
      setAchievementQueue((prev) => [...prev, ...achievements]);

      // Refetch do profile para atualizar achievements no contexto
      try {
        const profileData = await queryClient.fetchQuery({
          queryKey: ["words-profile"],
          queryFn: async () => {
            const { data } = await axios.get(WORDS_ENDPOINTS.profile);
            return data;
          },
        });

        // Atualiza o user no contexto com os novos achievements
        if (profileData) {
          updateUser(profileData);
        }
      } catch (error) {
        console.error("Erro ao atualizar profile após achievement:", error);
      }
    }
  };

  const columns = run?.nextWord?.length ?? DEFAULT_COLUMNS;
  const maxAttempts = run?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const remainingWordsCount =
    run?.remainingWords ??
    run?.wordsRemaining ??
    (run?.totalWords != null && run?.wordsPlayed != null
      ? Math.max(run.totalWords - run.wordsPlayed, 0)
      : 0);

  const isEntryPending = (result?: WordsInfiniteHistoryEntry["result"]) =>
    result === "pending" || result === "in_progress" || result === "active";

  const pendingEntry = useMemo(
    () => run?.history?.find((entry) => isEntryPending(entry.result)) ?? null,
    [run?.history],
  );

  const historyWithoutPending = useMemo(
    () => (run?.history ?? []).filter((entry) => !isEntryPending(entry.result)),
    [run?.history],
  );

  const completedHistory = useMemo(
    () => historyWithoutPending.filter((entry) => entry.result === "won"),
    [historyWithoutPending],
  );

  const historyEntryForBoard = useMemo(() => {
    if (!run) {
      return null;
    }

    if (run.status === "active") {
      return pendingEntry;
    }

    if (run.status === "failed") {
      return (
        historyWithoutPending.find((entry) => entry.result === "lost") ??
        historyWithoutPending[historyWithoutPending.length - 1] ??
        null
      );
    }

    return historyWithoutPending[historyWithoutPending.length - 1] ?? null;
  }, [historyWithoutPending, pendingEntry, run]);

  const boardGuesses =
    run?.status === "active"
      ? pendingEntry?.guesses?.length
        ? pendingEntry.guesses
        : (run?.guesses ?? [])
      : (historyEntryForBoard?.guesses ?? []);
  const resolvedAttempts =
    run?.status === "active"
      ? (run?.attemptsUsed ?? boardGuesses.length)
      : (historyEntryForBoard?.attemptsUsed ?? boardGuesses.length);
  const currentGuessCount = Math.max(boardGuesses.length, resolvedAttempts);

  const hudAttemptsUsed =
    run?.status === "active"
      ? (run?.attemptsUsed ?? currentGuessCount)
      : (historyEntryForBoard?.attemptsUsed ?? currentGuessCount);

  const isRunActive = run?.status === "active";
  const isMutationRunning =
    startRunMutation.isPending ||
    guessMutation.isPending ||
    abandonMutation.isPending;

  const isInputLocked =
    !isRunActive || isMutationRunning || isLoading || isFetching;

  const getLockedPositions = useCallback(() => {
    const locked = new Set<number>();
    const lockedLetters: string[] = Array(columns).fill("");

    boardGuesses.forEach((guess) => {
      const pattern = guess.pattern ?? "";
      const guessWord = guess.guessWord ?? "";

      pattern.split("").forEach((patternChar, index) => {
        if (patternChar === "2" && index < columns) {
          locked.add(index);
          lockedLetters[index] = guessWord[index]?.toUpperCase() ?? "";
        }
      });
    });

    return { locked, lockedLetters };
  }, [boardGuesses, columns]);

  const resetDraft = useCallback(() => {
    const { locked, lockedLetters } = getLockedPositions();
    const newDraft = buildDraftLetters(columns);

    // Preenche as posições travadas
    locked.forEach((pos) => {
      if (lockedLetters[pos]) {
        newDraft[pos] = lockedLetters[pos];
      }
    });

    setDraftLetters(newDraft);
    setLockedPositions(locked);

    // Seleciona a primeira posição não travada
    let firstUnlocked = 0;
    while (firstUnlocked < columns && locked.has(firstUnlocked)) {
      firstUnlocked++;
    }
    setSelectedCol(firstUnlocked < columns ? firstUnlocked : 0);
  }, [columns, getLockedPositions]);

  useEffect(() => {
    if (!run) {
      resetDraft();
      updateUser({
        infiniteCurrentScore: 0,
        infiniteStatus: "idle",
      });
      return;
    }

    updateUser({
      infiniteCurrentScore: run.currentScore,
      infiniteRecord: run.record,
      infiniteStatus: run.status,
    });
  }, [run, resetDraft, updateUser]);

  useEffect(() => {
    if (currentGuessCount > previousGuessCountRef.current) {
      resetDraft();
    }
    if (
      currentGuessCount === 0 &&
      previousGuessCountRef.current > 0 &&
      isRunActive
    ) {
      // Usuário acertou e passou para próxima palavra - dispara animação
      setIsTransitioning(true);
      if (transitionTimeout.current) {
        window.clearTimeout(transitionTimeout.current);
      }
      transitionTimeout.current = window.setTimeout(() => {
        setIsTransitioning(false);
        transitionTimeout.current = null;
      }, 800);
      resetDraft();
    }
    previousGuessCountRef.current = currentGuessCount;
  }, [currentGuessCount, isRunActive, resetDraft]);
  useEffect(() => {
    if (!run || run.status === "active") {
      setIsResultModalOpen(false);
      setHasShownResultModal(false);
      return;
    }

    if (!hasShownResultModal) {
      setIsResultModalOpen(true);
      setHasShownResultModal(true);
    }
  }, [hasShownResultModal, run]);

  useEffect(() => {
    setSelectedCol((previous) => Math.min(previous, columns - 1));
  }, [columns]);

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

  const handleGuessError = (mutationError: unknown) => {
    triggerRowShake();
    if (axios.isAxiosError(mutationError)) {
      const responseData = mutationError.response?.data as
        | { error?: string; message?: string }
        | undefined;
      if (responseData?.error === "Guess word is not allowed") {
        setFeedback("Palavra inválida. Tente outro termo.");
        return;
      }
      if (responseData?.message) {
        setFeedback(responseData.message);
        return;
      }
    }
    setFeedback(getErrorMessage(mutationError));
  };

  const boardRows = useMemo(() => {
    const rows: CellState[][] = [];

    boardGuesses.forEach((guess) => {
      rows.push(buildRowFromGuess(guess, columns));
    });

    const shouldShowDraftRow =
      isRunActive && rows.length < maxAttempts && !isMutationRunning;

    if (shouldShowDraftRow) {
      rows.push(buildRowFromDraft(draftLetters, columns));
    }

    while (rows.length < maxAttempts) {
      rows.push(buildEmptyRow(columns));
    }

    return rows;
  }, [
    boardGuesses,
    columns,
    draftLetters,
    isMutationRunning,
    isRunActive,
    maxAttempts,
  ]);

  const activeRowIndex = Math.min(currentGuessCount, maxAttempts - 1);

  const keyboardState = useMemo(() => {
    const states: Record<string, LetterStatus> = {};

    boardGuesses.forEach((guess) => {
      const guessWord = guess.guessWord ?? "";
      const pattern = guess.pattern ?? "";

      guessWord.split("").forEach((letter, index) => {
        const status = PATTERN_STATUS_MAP[pattern[index]] ?? "default";
        const upper = letter.toUpperCase();
        const currentStatus = states[upper];

        if (
          !currentStatus ||
          STATUS_PRIORITY[status] > STATUS_PRIORITY[currentStatus]
        ) {
          states[upper] = status;
        }
      });
    });

    return states;
  }, [boardGuesses]);

  const handleLetter = (letter: string) => {
    if (isInputLocked) {
      return;
    }

    const upper = letter.toUpperCase();
    const insertionColumn = Math.min(Math.max(selectedCol, 0), columns - 1);

    // Não permite editar posições travadas
    if (lockedPositions.has(insertionColumn)) {
      // Pula para a próxima posição não travada
      let nextCol = insertionColumn + 1;
      while (nextCol < columns && lockedPositions.has(nextCol)) {
        nextCol++;
      }
      if (nextCol < columns) {
        setSelectedCol(nextCol);
      }
      return;
    }

    setDraftLetters((previous) => {
      const next = [...previous];
      next[insertionColumn] = upper;

      // Procura a próxima posição vazia que não esteja travada
      let nextCol = insertionColumn + 1;
      while (nextCol < columns) {
        if (!lockedPositions.has(nextCol) && !next[nextCol]) {
          setSelectedCol(nextCol);
          return next;
        }
        if (!lockedPositions.has(nextCol)) {
          break;
        }
        nextCol++;
      }

      setSelectedCol(nextCol < columns ? nextCol : insertionColumn);
      return next;
    });
    setFeedback("");
  };

  const handleDelete = () => {
    if (isInputLocked) {
      return;
    }

    setDraftLetters((previous) => {
      const next = [...previous];
      const hasValueAtPointer = Boolean(next[selectedCol]);
      const targetIndex = hasValueAtPointer
        ? selectedCol
        : getPreviousFilledIndex(next, selectedCol - 1);

      if (targetIndex === null) {
        return next;
      }

      // Não permite deletar posições travadas
      if (lockedPositions.has(targetIndex)) {
        // Move para a posição anterior não travada
        let prevCol = targetIndex - 1;
        while (prevCol >= 0 && lockedPositions.has(prevCol)) {
          prevCol--;
        }
        if (prevCol >= 0) {
          setSelectedCol(prevCol);
        }
        return next;
      }

      next[targetIndex] = "";
      setSelectedCol(Math.max(targetIndex, 0));
      return next;
    });
    setFeedback("");
  };

  const handleSubmitGuess = () => {
    if (!run || !isRunActive || isInputLocked) {
      return;
    }

    if (draftLetters.some((letter) => !letter)) {
      triggerHighlightEmpty();
      setFeedback("Complete a palavra antes de enviar.");
      return;
    }

    const guessWord = draftLetters.join("");
    setFeedback("");

    guessMutation.mutate(
      { guessWord },
      {
        onSuccess: (data) => {
          resetDraft();
          // Verifica se há achievements desbloqueados
          if (data.unlockedAchievements && data.unlockedAchievements.length > 0) {
            showAchievements(data.unlockedAchievements);
          }
        },
        onError: handleGuessError,
      },
    );
  };

  const handleArrowLeft = () => {
    if (isInputLocked) {
      return;
    }

    let newCol = selectedCol - 1;
    // Pula posições travadas ao navegar para a esquerda
    while (newCol >= 0 && lockedPositions.has(newCol)) {
      newCol--;
    }
    if (newCol >= 0) {
      setSelectedCol(newCol);
    }
  };

  const handleArrowRight = () => {
    if (isInputLocked) {
      return;
    }

    let newCol = selectedCol + 1;
    // Pula posições travadas ao navegar para a direita
    while (newCol < columns && lockedPositions.has(newCol)) {
      newCol++;
    }
    if (newCol < columns) {
      setSelectedCol(newCol);
    }
  };

  const handleKeyPress = (key: string) => {
    if (key === "ENTER") {
      handleSubmitGuess();
      return;
    }
    if (key === "DELETE") {
      handleDelete();
      return;
    }
    if (key === "ARROWLEFT") {
      handleArrowLeft();
      return;
    }
    if (key === "ARROWRIGHT") {
      handleArrowRight();
      return;
    }
    handleLetter(key);
  };

  const handleCellClick = (rowIndex: number, columnIndex: number) => {
    if (
      isInputLocked ||
      !isRunActive ||
      rowIndex !== activeRowIndex ||
      currentGuessCount !== rowIndex
    ) {
      return;
    }
    setSelectedCol(columnIndex);
  };

  const handleStartRun = () => {
    setIsResultModalOpen(false);
    setHasShownResultModal(false);
    startRunMutation.mutate(undefined, {
      onError: (mutationError) => {
        setFeedback(getErrorMessage(mutationError));
      },
    });
  };

  const handleAbandonRun = () => {
    if (!isRunActive || abandonMutation.isPending) {
      return;
    }
    abandonMutation.mutate(undefined, {
      onSuccess: (data) => {
        // Verifica se há achievements desbloqueados
        if (data.unlockedAchievements && data.unlockedAchievements.length > 0) {
          showAchievements(data.unlockedAchievements);
        }
      },
      onError: (mutationError) => {
        setFeedback(getErrorMessage(mutationError));
      },
    });
  };

  const closeResultModal = () => setIsResultModalOpen(false);

  const runFinished = run?.status === "failed" || run?.status === "completed";
  const runSummary = run?.summary ?? {
    score: run?.currentScore ?? 0,
    record: run?.record ?? 0,
    wordsPlayed: run?.wordsPlayed ?? historyWithoutPending.length,
    wordsRemaining: remainingWordsCount,
  };
  const modalTitle =
    run?.status === "completed"
      ? "Você completou todas as palavras!"
      : "Sua run terminou";
  const modalDescription =
    run?.status === "completed"
      ? "Todas as palavras foram usadas. Inicie uma nova run para continuar."
      : "Veja abaixo o histórico completo antes de tentar novamente.";

  if (isLoading && !run) {
    return (
      <div className="flex flex-col items-center gap-4 text-center text-white">
        <p className="text-lg font-semibold">Carregando modo infinito...</p>
        <p className="text-sm text-slate-300">
          Buscando sua run atual. Aguarde um instante.
        </p>
      </div>
    );
  }

  if (error && !run) {
    return (
      <div className="flex flex-col items-center gap-4 text-center text-white">
        <p className="text-lg font-semibold">
          NÇœo foi possÇ¬vel carregar a run.
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="rounded-md bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-500"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!run) {
    return (
      <div className="flex flex-col items-center gap-6 text-white">
        <header className="text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
            Infinite
          </p>
          <h1 className="text-3xl font-semibold text-white">
            Comece uma nova run
          </h1>
        </header>
        <p className="max-w-md text-center text-sm text-slate-300">
          Inicie uma run para receber palavras aleatorias e tente acertar o
          minimo possivel com apenas 5 tentativas. Ao errar, voce perde toda a
          sequencia.
        </p>
        <button
          type="button"
          onClick={handleStartRun}
          disabled={startRunMutation.isPending}
          className="rounded-md bg-purple-600 px-6 py-3 cursor-pointer text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {startRunMutation.isPending ? "Iniciando..." : "Iniciar run"}
        </button>
        {feedback ? <p className="text-sm text-rose-300">{feedback}</p> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 text-white">
      <header className="flex w-full flex-col items-center gap-6">
        <div className="flex w-full flex-col items-center gap-3 text-center sm:flex-row sm:items-center sm:justify-between">
          <Link
            to="/game"
            className="inline-flex items-center gap-2  text-slate-200! rounded-md border border-neutral-700 px-4 py-2 text-sm font-semibold  transition hover:border-neutral-500 hover:text-white"
          >
            {"\u2190"} Voltar para modos
          </Link>
          <div className="flex flex-1 flex-col items-center text-center sm:px-6">
            <p className="text-sm uppercase tracking-[0.4em] text-slate-400">
              Infinite
            </p>
            <h1 className="text-3xl font-semibold">Jogo Infinito</h1>
            <p className="text-sm text-slate-300">
              Acerte a palavra em até 5 tentativas para seguir pontuando e
              buscar o recorde.
            </p>
          </div>
          <div className="hidden w-[170px] sm:block" aria-hidden="true" />
        </div>
        <div className="grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-700 bg-[#130F1A] p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Score Atual
            </p>
            <p className="text-3xl font-semibold text-white">
              {run.currentScore}
            </p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-[#130F1A] p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Recorde
            </p>
            <p className="text-3xl font-semibold text-emerald-300">
              {run.record}
            </p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-[#130F1A] p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Restantes
            </p>
            <p className="text-3xl font-semibold text-white">
              {remainingWordsCount}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-slate-300">
          <span className="rounded-full border border-slate-600 px-3 py-1 font-semibold text-white">
            Tentativas {hudAttemptsUsed}/{maxAttempts}
          </span>
          {isRunActive ? (
            <span className="rounded-full border border-emerald-500/40 px-3 py-1 text-emerald-300">
              Run ativa
            </span>
          ) : (
            <span className="rounded-full border border-rose-500/40 px-3 py-1 text-rose-300">
              Run finalizada
            </span>
          )}

          <div className="flex flex-wrap justify-center gap-3">
            {isRunActive ? (
              <button
                type="button"
                onClick={handleAbandonRun}
                disabled={abandonMutation.isPending}
                className="rounded-md border cursor-pointer border-rose-500/50 px-4 py-2 text-sm font-semibold text-rose-200 transition hover:border-rose-400/80 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {abandonMutation.isPending ? "Abandonando..." : "Abandonar run"}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStartRun}
                disabled={startRunMutation.isPending}
                className="rounded-md bg-purple-600  cursor-pointer px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {startRunMutation.isPending
                  ? "Reiniciando..."
                  : "Jogar novamente"}
              </button>
            )}
          </div>
        </div>
      </header>
      <div className="flex flex-col items-center gap-4">
        <div className={`flex flex-col gap-2 transition-all duration-700 ease-out ${
          isTransitioning ? "word-transition-slide" : ""
        }`}>
          {boardRows.map((row, rowIndex) => {
            const isCurrentRow =
              isRunActive &&
              rowIndex === activeRowIndex &&
              currentGuessCount === rowIndex;
            const isFutureRow = rowIndex > currentGuessCount;
            const shakingRow = isRowShaking && rowIndex === activeRowIndex;

            return (
              <div
                key={`row-${rowIndex}`}
                className={`flex gap-2 ${
                  isFutureRow
                    ? "opacity-30"
                    : rowIndex === currentGuessCount
                      ? "opacity-100"
                      : "opacity-90"
                } ${shakingRow ? "shake-row" : ""}`}
                style={
                  isTransitioning
                    ? {
                        animation: `word-transition-slide 0.8s cubic-bezier(0.4, 0, 0.2, 1)`,
                        animationDelay: `${rowIndex * 50}ms`,
                      }
                    : undefined
                }
              >
                {row.map((cell, columnIndex) => {
                  const isSelected =
                    isCurrentRow && columnIndex === selectedCol && isRunActive;
                  const shouldHighlight =
                    highlightEmptyCells && isCurrentRow && !cell.value;
                  const isLocked = isCurrentRow && lockedPositions.has(columnIndex);
                  return (
                    <button
                      type="button"
                      key={`cell-${rowIndex}-${columnIndex}`}
                      disabled={!isCurrentRow || isLocked}
                      onClick={() => handleCellClick(rowIndex, columnIndex)}
                      className={`flex h-14 w-14 items-center justify-center rounded-md text-2xl font-semibold uppercase transition ${
                        isLocked ? "bg-emerald-600/80 text-white border-2 border-emerald-400" : CELL_STYLES[cell.status]
                      } ${
                        isSelected
                          ? "ring-2 ring-[#F2B94B] shadow-[0_0_8px_rgba(242,185,75,0.55)]"
                          : ""
                      } ${
                        shakingRow ? "border-2 border-red-500" : ""
                      } ${shouldHighlight ? "cell-highlight" : ""} ${
                        isCurrentRow && !isLocked ? "cursor-pointer" : "cursor-not-allowed"
                      }`}
                    >
                      {cell.value}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
        {feedback ? <p className="text-sm text-rose-300">{feedback}</p> : null}
        <GameKeyboard
          statuses={keyboardState}
          disabled={isInputLocked}
          onKeyPress={handleKeyPress}
        />
      </div>

      {completedHistory.length ? (
        <section className="rounded-2xl border border-slate-800 bg-[#120D18] p-4">
          <h2 className="text-lg font-semibold text-white">
            Palavras vencidas
          </h2>
          <p className="text-xs text-slate-400">
            Nenhuma palavra se repete. Veja o que você já conquistou nesta run.
          </p>
          <div className="mt-4 flex flex-col gap-3">
            {completedHistory.map((entry) => (
              <div
                key={`${entry.word ?? "word"}-${entry.order ?? "order"}`}
                className="flex flex-col gap-1 rounded-xl border border-slate-700/50 bg-[#1A1423] p-4 text-sm"
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-lg font-semibold uppercase tracking-wide text-white">
                      {entry.word ?? "Palavra oculta"}
                    </p>
                    <span
                      className={`mt-1 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${getHistoryColorClass(entry.result)}`}
                    >
                      {formatResultLabel(entry.result)} • {entry.attemptsUsed}{" "}
                      tentativas
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Ordem {entry.order ?? "-"}
                  </p>
                </div>
                {entry.guesses?.length ? (
                  <div className="mt-3 flex flex-col gap-2">
                    {entry.guesses.map((guess, guessIndex) => (
                      <div
                        key={`${guess.guessWord}-${guessIndex}`}
                        className="flex gap-2"
                      >
                        {buildRowFromGuess(guess, columns).map(
                          (cell, cellIndex) => (
                            <div
                              key={`${guess.guessWord}-${guessIndex}-${cellIndex}`}
                              className={`flex h-8 w-8 items-center justify-center rounded-md text-xs font-bold uppercase ${CELL_STYLES[cell.status]}`}
                            >
                              {cell.value}
                            </div>
                          ),
                        )}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {runFinished ? (
        <section className="rounded-2xl border border-slate-800 bg-gradient-to-br from-[#1B0F24] to-[#09050D] p-6 text-white">
          <h2 className="text-2xl font-semibold">
            {run?.status === "completed"
              ? "Você completou todas as palavras!"
              : "Sua run terminou"}
          </h2>
          <p className="text-sm text-slate-300">
            {run?.status === "completed"
              ? "Todas as palavras foram usadas. Inicie uma nova run para continuar."
              : "Reveja o histórico completo antes de tentar novamente."}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setIsResultModalOpen(true)}
              className="rounded-md border border-slate-500 px-4 py-2 text-sm font-semibold text-white transition hover:border-slate-300"
            >
              Ver resumo da run
            </button>
            <button
              type="button"
              onClick={handleStartRun}
              disabled={startRunMutation.isPending}
              className="rounded-md bg-purple-600 px-4 py-2 cursor-pointer  text-sm font-semibold text-white transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {startRunMutation.isPending
                ? "Reiniciando..."
                : "Jogar novamente"}
            </button>
          </div>
        </section>
      ) : null}

      {isResultModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="relative w-full max-w-2xl rounded-2xl bg-[#1B1422] p-6 text-white shadow-2xl">
            <button
              type="button"
              onClick={closeResultModal}
              className="absolute right-4 top-4 text-lg font-bold text-slate-400 transition hover:text-white"
              aria-label="Fechar resumo"
            >
              ×
            </button>
            <div className="space-y-2 text-center">
              <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
                Infinite
              </p>
              <h3 className="text-2xl font-semibold">{modalTitle}</h3>
              <p className="text-sm text-slate-300">{modalDescription}</p>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-4">
              <div className="rounded-xl border border-slate-700 bg-[#140B1C] p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Score
                </p>
                <p className="text-2xl font-semibold text-white">
                  {runSummary.score}
                </p>
              </div>
              <div className="rounded-xl border border-slate-700 bg-[#140B1C] p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Recorde
                </p>
                <p className="text-2xl font-semibold text-emerald-300">
                  {runSummary.record}
                </p>
              </div>
              <div className="rounded-xl border border-slate-700 bg-[#140B1C] p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Palavras jogadas
                </p>
                <p className="text-2xl font-semibold text-white">
                  {runSummary.wordsPlayed}
                </p>
              </div>
              <div className="rounded-xl border border-slate-700 bg-[#140B1C] p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Restantes
                </p>
                <p className="text-2xl font-semibold text-white">
                  {runSummary.wordsRemaining}
                </p>
              </div>
            </div>
            <div className="mt-6">
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                Histórico da run
              </p>
              <div className="mt-3 max-h-64 space-y-3 overflow-y-auto pr-1">
                {historyWithoutPending.length ? (
                  historyWithoutPending.map((entry) => (
                    <div
                      key={`${entry.word ?? "word"}-${entry.order ?? "order"}-modal`}
                      className="rounded-xl border border-slate-700 bg-[#221830] p-4 text-sm"
                    >
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-lg font-semibold uppercase tracking-wide text-white">
                            {entry.word ?? "Palavra oculta"}
                          </p>
                          <span
                            className={`mt-1 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${getHistoryColorClass(entry.result)}`}
                          >
                            {formatResultLabel(entry.result)} •{" "}
                            {entry.attemptsUsed} tentativas
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">
                          Ordem {entry.order ?? "-"}
                        </p>
                      </div>
                      {entry.guesses?.length ? (
                        <div className="mt-3 flex flex-col gap-2">
                          {entry.guesses.map((guess, guessIndex) => (
                            <div
                              key={`${entry.word ?? "word"}-${guessIndex}-modal`}
                              className="flex gap-2"
                            >
                              {buildRowFromGuess(guess, columns).map(
                                (cell, cellIndex) => (
                                  <div
                                    key={`${entry.word ?? "word"}-${guessIndex}-${cellIndex}-modal`}
                                    className={`flex h-8 w-8 items-center justify-center rounded-md text-xs font-bold uppercase ${CELL_STYLES[cell.status]}`}
                                  >
                                    {cell.value}
                                  </div>
                                ),
                              )}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-400">
                    Ainda não há histórico disponível.
                  </p>
                )}
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={closeResultModal}
                className="flex-1 rounded-md cursor-pointer  border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-slate-400"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => {
                  closeResultModal();
                  handleStartRun();
                }}
                disabled={startRunMutation.isPending}
                className="flex-1 rounded-md bg-purple-600 cursor-pointer  px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {startRunMutation.isPending
                  ? "Reiniciando..."
                  : "Jogar novamente"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Achievement Unlock Modal */}
      {currentAchievement && (
        <AchievementUnlockModal
          achievementId={currentAchievement}
          onClose={handleAchievementClose}
        />
      )}
    </div>
  );
};

export default InfinityGame;
