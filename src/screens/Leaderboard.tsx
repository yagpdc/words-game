import axios from "axios";
import { useEffect, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import PerfectScrollbar from "perfect-scrollbar";
import "perfect-scrollbar/css/perfect-scrollbar.css";
import { useAuth } from "../hooks/auth/use-auth.hook";
import { useWordsRankingQuery } from "../hooks/words/use-words-ranking";
import AvatarPreview from "../components/AvatarPreview";
import { normalizeAvatarConfig } from "../utils/avatar";
import { FaCrown } from "react-icons/fa";
import { useOnlineUsers } from "../hooks/socket/use-online-users";

const Leaderboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { data: ranking, isLoading, error, refetch } = useWordsRankingQuery();

  const currentUserId = user?.id;
  const { onlineUsers, isConnected } = useOnlineUsers();
  const onlineUsersSet = useMemo(() => new Set(onlineUsers), [onlineUsers]);

  useEffect(() => {
    if (!scrollContainerRef.current || !ranking || ranking.length === 0) {
      return;
    }

    const ps = new PerfectScrollbar(scrollContainerRef.current, {
      wheelSpeed: 1,
      wheelPropagation: false,
      minScrollbarLength: 20,
    });

    return () => {
      ps.destroy();
    };
  }, [ranking]);

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
      <div className="flex w-full items-center justify-start">
        <Link
          to="/game"
            className="inline-flex items-center gap-2 rounded-md border border-neutral-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-neutral-500 hover:text-white"
        >
          {"\u2190"} Voltar para modos
        </Link>
      </div>
      <header className="text-center">
        <p className="text-xs uppercase tracking-[0.35em] text-neutral-500 mb-4">
          Words · Daily
        </p>
        <h1 className="text-3xl font-semibold">Ranking</h1>
      </header>

      <div className="w-full overflow-hidden rounded-lg border border-neutral-800 bg-[#1b171f]">
        <div
          ref={scrollContainerRef}
          className="relative max-h-[500px] overflow-hidden"
          style={{ position: 'relative' }}
        >
          <table className="w-full table-auto text-sm">
            <thead className="sticky top-0 z-10 bg-[#231d29]">
              <tr className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                <th className="px-5 py-2 text-left">Jogador</th>
                <th className="px-5 py-2 text-center">Pos</th>
                <th className="px-5 py-2 text-center">Streak</th>
                <th className="px-5 py-2 text-center">Score</th>
                <th className="px-5 py-2 text-center">Recorde Infinity</th>
              </tr>
            </thead>
            <tbody>
            {ranking.map((item, index) => {
              const isCurrent = item.id === currentUserId;
              const avatarConfig = normalizeAvatarConfig({
                avatar: item.avatar ?? {},
              });
              const isOnline = isCurrent
                ? isConnected
                : item.isOnline === true || onlineUsersSet.has(item.id);

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
                    <div className="flex items-center gap-3">
                      <AvatarPreview
                        frogType={avatarConfig.frogType}
                        hat={avatarConfig.hat}
                        body={avatarConfig.body}
                        background={avatarConfig.background}
                        size={42}
                        className="border border-neutral-800"
                      />
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className={`inline-flex h-2.5 w-2.5 shrink-0 rounded-full ${
                            isOnline
                              ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]"
                              : "bg-neutral-600"
                          }`}
                          title={isOnline ? "Online" : "Offline"}
                        />
                        <span className="truncate">{item.name}</span>
                        {index === 0 ? (
                          <FaCrown className="text-yellow-500 text-xs" />
                        ) : null}
                        {isCurrent ? (
                          <span className="ml-1 rounded bg-amber-500/10 px-2 py-px text-[10px] font-semibold uppercase text-amber-300">
                            você
                          </span>
                        ) : null}
                      </div>
                    </div>
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
                  <td className="px-5 py-2 text-center">
                    {item.infiniteRecord !== undefined && item.infiniteRecord > 0 ? (
                      <span className="text-sm font-medium text-emerald-300">
                        {item.infiniteRecord}
                      </span>
                    ) : (
                      <span className="text-xs text-neutral-600">-</span>
                    )}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

export default Leaderboard;