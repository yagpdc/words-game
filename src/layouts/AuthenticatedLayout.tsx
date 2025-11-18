import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/auth/use-auth.hook";
import type { ReactNode } from "react";
import { AiOutlineFire } from "react-icons/ai";
import AvatarPreview from "../components/AvatarPreview";
import { normalizeAvatarConfig } from "../utils/avatar";

type AuthenticatedLayoutProps = {
  children: ReactNode;
};

const AuthenticatedLayout = ({ children }: AuthenticatedLayoutProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const avatarConfig = normalizeAvatarConfig(user?.config);

  const atProfile = location.pathname === "/profile";
  const atLeaderboard = location.pathname === "/leaderboard";
  const atHistory = location.pathname === "/history";

  const handleProfile = () => {
    if (!user) return;

    if (atProfile) {
      navigate("/game");
    } else {
      navigate("/profile");
    }
  };

  const handleLeaderboard = () => {
    if (!user) return;

    if (atLeaderboard) {
      navigate("/game");
    } else {
      navigate("/leaderboard");
    }
  };

  const handleHistory = () => {
    if (!user) return;

    if (atHistory) {
      navigate("/game");
    } else {
      navigate("/history");
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const mainAlignment =
    atLeaderboard || atHistory
      ? "items-start justify-center px-8 py-10"
      : "items-center justify-center";

  return (
    <section className="flex min-h-screen justify-center  items-center flex-col bg-[#1f1f1f] text-white">
      <header className="flex items-center w-3/4 justify-between border-b border-neutral-800 px-6 py-4">
        <div className="flex items-center gap-3 text-left">
          <AvatarPreview
            frogType={avatarConfig.frogType}
            hat={avatarConfig.hat}
            body={avatarConfig.body}
            background={avatarConfig.background}
            size={56}
            className="rounded-xl border border-neutral-800 shadow-[0_0_15px_rgba(147,51,234,0.25)]"
          />
          <div>
            <p className="text-xs uppercase tracking-wide text-neutral-500">
              Jogador atual
            </p>
            <p className="text-lg font-semibold">{user?.name ?? "Convidado"}</p>
          </div>
        </div>

        <nav className="flex items-center gap-3">
          <div className=" flex items-center gap-2 px-3 py-1.5">
            <p className="text-[20px] uppercase tracking-wide text-orange-500">
              <AiOutlineFire />
            </p>
            <p className="text-base font-semibold">{user?.streak ?? 0}</p>
          </div>
          <button
            type="button"
            onClick={handleProfile}
            className={`rounded border px-4 py-2 text-sm font-semibold transition cursor-pointer ${
              atProfile
                ? "border-purple-500 bg-neutral-800 hover:border-purple-400"
                : "border-neutral-700 hover:border-neutral-500"
            }`}
          >
            Perfil
          </button>

          <button
            type="button"
            onClick={handleLeaderboard}
            className={`inline-flex items-center gap-1 rounded border px-3 py-2 text-sm font-semibold transition cursor-pointer ${
              atLeaderboard
                ? "border-purple-500 bg-neutral-800 hover:border-purple-400"
                : "border-neutral-700 hover:border-neutral-500"
            }`}
          >
            <span className="text-xs">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-4 w-4 fill-current"
              >
                <path d="M7 3h10v2h3a1 1 0 0 1 1 1v1.5A5.5 5.5 0 0 1 15 13h-1.06A4 4 0 0 1 13 16v1h2a1 1 0 0 1 .8 1.6L14 21h-4l-1.8-2.4A1 1 0 0 1 9 17h2v-1a4 4 0 0 1-.94-3H9A5.5 5.5 0 0 1 3 7.5V6a1 1 0 0 1 1-1h3V3Zm2 2v2a3 3 0 0 0 6 0V5H9Zm-4 2.5A3.5 3.5 0 0 0 8.5 11H9V7H5v0.5Zm10 3.5h.5A3.5 3.5 0 0 0 19 7.5V7h-4v4Z" />
              </svg>
            </span>
            <span>Ranking</span>
          </button>
          <button
            type="button"
            onClick={handleHistory}
            className={`rounded border px-4 py-2 text-sm font-semibold transition cursor-pointer ${
              atHistory
                ? "border-purple-500 bg-neutral-800 hover:border-purple-400"
                : "border-neutral-700 hover:border-neutral-500"
            }`}
          >
            Histórico
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="rounded bg-red-900 px-4 py-2 text-sm font-semibold transition hover:bg-red-700 hover:cursor-pointer"
          >
            Sair
          </button>
        </nav>
      </header>

      <main className={`flex flex-1 bg-[#1f1f1f]  w-full ${mainAlignment}`}>
        {children}
      </main>
    </section>
  );
};

export default AuthenticatedLayout;
