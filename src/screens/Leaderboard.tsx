import axios from "axios";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/auth/use-auth.hook";
import { useWordsRankingQuery } from "../hooks/words/use-words-ranking";

const Leaderboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const {
    data: ranking,
    isLoading,
    error,
    refetch,
  } = useWordsRankingQuery();

  const currentUserId = user?.id;

  const processedError = useMemo(() => {
    if (!error) return null;
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 401) {
        logout();
        navigate("/");
        return null;
      }

      if (status && status >= 500) {
        return "Não foi possível carregar o ranking.";
      }

      const message = (error.response?.data as { message?: string })?.message;
      return message ?? error.message;
    }

    return "Não foi possível carregar o ranking.";
  }, [error, logout, navigate]);

  if (isLoading) {
    return (
      <div className="text-sm text-neutral-300">Carregando ranking...</div>
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

  if (!ranking || ranking.length === 0) {
    return (
      <div className="text-sm text-neutral-400">
        Ainda não há jogadores no ranking diário.
      </div>
    );
  }

  return (
    <section className="flex flex-col items-center gap-6 text-white">
      <header className="text-center">
        <p className="text-xs uppercase tracking-[0.35em] text-neutral-500">
          Words · Daily
        </p>
        <h1 className="text-3xl font-semibold">Ranking diário</h1>
      </header>

      <div className="w-full max-w-xl overflow-hidden rounded-lg border border-neutral-800 bg-[#1b171f]">
        <div className="grid grid-cols-[3rem,1fr,5rem,5rem] border-b border-neutral-800 bg-[#231d29] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
          <span className="text-center">Pos</span>
          <span>Jogador</span>
          <span className="text-center">Score</span>
          <span className="text-center">Streak</span>
        </div>

        <ul className="divide-y divide-neutral-800">
          {ranking.map((item, index) => {
            const isCurrent = item.id === currentUserId;

            return (
              <li
                key={item.id}
                className={`grid grid-cols-[3rem,1fr,5rem,5rem] items-center px-4 py-2 text-sm ${
                  isCurrent
                    ? "bg-[#272134] font-semibold text-slate-50"
                    : "text-neutral-200"
                }`}
              >
                <span className="text-center text-xs text-neutral-500">
                  {index + 1}
                </span>
                <span className="truncate">
                  {item.name}
                  {isCurrent ? (
                    <span className="ml-2 rounded bg-amber-500/10 px-2 py-px text-[10px] font-semibold uppercase text-amber-300">
                      você
                    </span>
                  ) : null}
                </span>
                <span className="text-center text-sm">{item.score}</span>
                <span className="text-center text-sm">{item.streak}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
};

export default Leaderboard;
