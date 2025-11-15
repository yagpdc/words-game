import axios from "axios";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/auth/use-auth.hook";
import { useWordsRankingQuery } from "../hooks/words/use-words-ranking";

const Leaderboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const { data: ranking, isLoading, error, refetch } = useWordsRankingQuery();

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
    <section className="flex w-full max-w-4xl flex-col items-center gap-6 text-white">
      <header className="text-center">
        <p className="text-xs uppercase tracking-[0.35em] text-neutral-500">
          Words · Daily
        </p>
        <h1 className="text-3xl font-semibold">Ranking diário</h1>
      </header>

      <div className="w-full overflow-hidden rounded-lg border border-neutral-800 bg-[#1b171f]">
        <table className="w-full table-auto text-sm">
          <thead>
            <tr className="bg-[#231d29] text-xs font-semibold uppercase tracking-wide text-neutral-400">
              <th className="px-5 py-2 text-left">Jogador</th>
              <th className="px-5 py-2 text-center">Pos</th>
              <th className="px-5 py-2 text-center">Streak</th>
              <th className="px-5 py-2 text-center">Score</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((item, index) => {
              const isCurrent = item.id === currentUserId;

              return (
                <tr
                  key={item.id}
                  className={`border-b border-neutral-800 ${
                    isCurrent
                      ? "bg-[#272134] font-semibold text-slate-50"
                      : "text-neutral-200"
                  }`}
                >
                  <td className="px-5 py-2">
                    <span className="truncate">
                      {item.name}
                      {isCurrent ? (
                        <span className="ml-2 rounded bg-amber-500/10 px-2 py-px text-[10px] font-semibold uppercase text-amber-300">
                          você
                        </span>
                      ) : null}
                    </span>
                  </td>
                  <td className="px-5 py-2 text-center text-xs text-neutral-500">
                    {index + 1}
                  </td>
                  <td className="px-5 py-2 text-center text-sm font-medium">
                    {item.streak}
                  </td>
                  <td className="px-5 py-2 text-center text-sm font-medium">
                    {item.score}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default Leaderboard;
