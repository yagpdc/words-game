import axios from "axios";
import { useMemo, useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/auth/use-auth.hook";
import { useWordsHistoryQuery } from "../hooks/words/use-words-history";
import type { WordsHistoryItem, WordsHistoryStatus } from "../types/words";
import HistoryMatchDetails from "../components/History/HistoryMatchDetails";

const STATUS_LABELS: Record<WordsHistoryStatus, string> = {
  won: "Vitória",
  lost: "Derrota",
  abandoned: "Abandonado",
  in_progress: "Em progresso",
};

const STATUS_STYLES: Record<WordsHistoryStatus, string> = {
  won: "bg-emerald-500/15 text-emerald-300 border-emerald-500/50",
  lost: "bg-red-500/10 text-red-300 border-red-500/50",
  abandoned: "bg-amber-500/10 text-amber-300 border-amber-500/40",
  in_progress: "bg-sky-500/10 text-sky-300 border-sky-500/40",
};

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "medium",
  timeStyle: "short",
});

const formatDate = (value?: string | null) => {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return dateFormatter.format(parsed);
};

const formatGuessList = (item: WordsHistoryItem) => {
  if (!item.guesses?.length) {
    return "Nenhuma tentativa registrada.";
  }

  return item.guesses
    .map((guess) => `${guess.attemptNumber}. ${guess.guessWord}`)
    .join(" · ");
};

const History = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedItem, setSelectedItem] = useState<WordsHistoryItem | null>(
    null,
  );

  const {
    data: history,
    error,
    isLoading,
    isFetching,
    refetch,
  } = useWordsHistoryQuery(
    {
      page,
      pageSize,
    },
    {
      placeholderData: (previousData) => previousData,
    },
  );

  const processedError = useMemo(() => {
    if (!error) {
      return null;
    }

    if (axios.isAxiosError(error)) {
      const status = error.response?.status;

      if (status === 401) {
        logout();
        navigate("/");
        return null;
      }

      const message = (error.response?.data as { message?: string })?.message;
      if (message) {
        return message;
      }
    }

    return "Não foi possível carregar o histórico.";
  }, [error, logout, navigate]);

  const totalItems = history?.totalItems ?? 0;
  const totalPages = history ? Math.max(history.totalPages, 1) : 1;
  const isEmpty =
    !isLoading && history !== undefined && history.items.length === 0;

  const handlePreviousPage = () => {
    setPage((previous) => Math.max(previous - 1, 1));
  };

  const handleNextPage = () => {
    setPage((previous) => previous + 1);
  };

  const canGoPrevious = page > 1 && !isFetching;
  const canGoNext =
    history !== undefined && page < totalPages && !isFetching && !isEmpty;

  const handlePageSizeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setPageSize(Number(event.target.value));
    setPage(1);
  };

  const handleSelectItem = (item: WordsHistoryItem) => {
    setSelectedItem(item);
  };

  const handleCloseDetails = () => {
    setSelectedItem(null);
  };

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-neutral-400">
        Buscando histórico...
      </div>
    );
  }

  if (processedError) {
    return (
      <div className="flex flex-col items-center gap-3 text-sm text-red-400">
        <p>{processedError}</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="rounded border border-neutral-700 px-3 py-1 text-xs font-semibold text-neutral-200 transition hover:border-neutral-500"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <section className="flex w-full max-w-5xl flex-col gap-5 text-white">
      <header className="flex items-center flex-col">
        <p className="text-xs uppercase tracking-[0.35em] text-neutral-500">
          Words · Histórico
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-neutral-400">
          <h1 className="text-3xl font-semibold text-white">Partidas</h1>
          <span className="text-xs uppercase tracking-wide text-neutral-500">
            {totalItems} partidas registradas
          </span>
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
        <div className="text-neutral-400">
          Página {history?.page ?? page} de {totalPages}
        </div>
        <label className="flex items-center gap-3 text-xs uppercase tracking-wide text-neutral-500">
          Itens por página
          <select
            value={pageSize}
            onChange={handlePageSizeChange}
            className="rounded border border-neutral-700 bg-[#131313] px-3 py-1 text-sm font-semibold text-white focus:border-purple-500 focus:outline-none"
          >
            {[10, 20, 50].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      </div>

      {isEmpty ? (
        <div className="rounded border border-dashed border-neutral-800 bg-[#1b171f]/50 p-8 text-center text-sm text-neutral-400">
          Ainda não há partidas registradas para sua conta.
        </div>
      ) : (
        <div className="w-full overflow-hidden rounded-xl border border-neutral-800 bg-[#141015]">
          <table className="w-full table-auto text-sm">
            <thead>
              <tr className="bg-[#1d1721] text-xs font-semibold uppercase tracking-wide text-neutral-400">
                <th className="px-5 py-3 text-left">Data</th>
                <th className="px-5 py-3 text-left">Palavra</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-center">Tentativas</th>
                <th className="px-5 py-3 text-center">Score</th>
                <th className="px-5 py-3 text-left">Tentativas registradas</th>
              </tr>
            </thead>
            <tbody>
              {history?.items.map((item) => (
                <tr
                  key={item.userPuzzleId}
                  className="cursor-pointer border-t border-neutral-900 text-neutral-200 transition hover:bg-white/5 focus-within:bg-white/10"
                  onClick={() => handleSelectItem(item)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleSelectItem(item);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                >
                  <td className="px-5 py-3 text-sm text-neutral-300">
                    <div>{formatDate(item.date)}</div>
                    <p className="text-xs text-neutral-500">
                      Finalizado: {formatDate(item.finishedAt)}
                    </p>
                  </td>
                  <td className="px-5 py-3">
                    <div className="font-semibold uppercase tracking-wide">
                      {item.puzzleWord ?? "—"}
                    </div>
                    <p className="text-xs text-neutral-500">
                      #{item.puzzleId ? item.puzzleId.slice(-6) : "------"}
                    </p>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_STYLES[item.status]}`}
                    >
                      {STATUS_LABELS[item.status]}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center font-semibold">
                    {item.attemptsUsed}/{item.maxAttempts}
                  </td>
                  <td className="px-5 py-3 text-center font-semibold">
                    {item.score ?? 0}
                  </td>
                  <td className="px-5 py-3 text-xs text-neutral-400">
                    {formatGuessList(item)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between gap-4 text-sm">
        <button
          type="button"
          onClick={handlePreviousPage}
          disabled={!canGoPrevious}
          className="rounded border border-neutral-700 px-4 py-2 font-semibold text-neutral-200 transition hover:border-neutral-500 disabled:cursor-not-allowed disabled:border-neutral-900 disabled:text-neutral-600"
        >
          Página anterior
        </button>
        <div className="text-xs uppercase tracking-wide text-neutral-500">
          {isFetching ? "Atualizando..." : ""}
        </div>
        <button
          type="button"
          onClick={handleNextPage}
          disabled={!canGoNext}
          className="rounded border border-neutral-700 px-4 py-2 font-semibold text-neutral-200 transition hover:border-neutral-500 disabled:cursor-not-allowed disabled:border-neutral-900 disabled:text-neutral-600"
        >
          Próxima página
        </button>
      </div>
      {selectedItem ? (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 px-4 py-10 backdrop-blur-sm"
          aria-modal="true"
          role="dialog"
          onClick={handleCloseDetails}
        >
          <div
            className="max-h-[90vh] w-full max-w-4xl overflow-y-auto"
            onClick={(event) => event.stopPropagation()}
          >
            <HistoryMatchDetails
              item={selectedItem}
              statusLabel={STATUS_LABELS[selectedItem.status]}
              statusClass={STATUS_STYLES[selectedItem.status]}
              formatDate={formatDate}
              onClose={handleCloseDetails}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default History;
