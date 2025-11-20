import { Link } from "react-router-dom";
import { useMyCoopRoom } from "../hooks/words/use-my-coop-room";
import { useForceLeaveCoopRoom } from "../hooks/words/use-force-leave-coop";

type InfinityMode = "solo" | "coop" | "versus";

interface InfinityModeCardProps {
  mode: InfinityMode;
  disabled?: boolean;
}

const InfinityModeCard = ({ mode, disabled = false }: InfinityModeCardProps) => {
  const modeData = {
    solo: {
      title: "Solo",
      description: "Jogue sozinho e tente quebrar seu recorde pessoal",
      icon: "🎯",
      route: "/game/infinity",
    },
    coop: {
      title: "Co-op",
      description: "Jogue em dupla colaborando para completar palavras",
      icon: "🤝",
      route: "/game/infinity/coop/lobby",
    },
    versus: {
      title: "Versus",
      description: "Enfrente outro jogador em tempo real",
      icon: "⚔️",
      route: "/game/infinity/versus/lobby",
    },
  };

  const data = modeData[mode];
  const stateClasses = disabled
    ? "cursor-not-allowed opacity-60 bg-neutral-900/50"
    : "cursor-pointer hover:border-purple-500/50 hover:shadow-[0_0_20px_rgba(147,51,234,0.3)] bg-neutral-900/80";

  const content = (
    <div
      className={`border border-neutral-800 rounded-2xl p-6 flex flex-col gap-4 text-slate-200 transition-all duration-300 ${stateClasses} h-full min-h-[220px]`}
    >
      <div className="text-5xl mb-2">{data.icon}</div>
      <div className="flex-1 flex flex-col justify-center gap-3">
        <h2 className="text-2xl font-bold text-white">{data.title}</h2>
        <p className="text-sm text-neutral-400 leading-relaxed">
          {data.description}
        </p>
      </div>

      {disabled && (
        <div className="flex items-center gap-2 text-xs text-amber-400 uppercase tracking-wide">
          <span>🔒</span>
          <span>Em breve</span>
        </div>
      )}
    </div>
  );

  if (disabled) {
    return <div>{content}</div>;
  }

  return (
    <Link to={data.route} className="transform transition-transform hover:scale-105">
      {content}
    </Link>
  );
};

const InfinityModeSelection = () => {
  const { data: myRoomData, refetch: refetchMyRoom } = useMyCoopRoom();
  const forceLeaveRoomMutation = useForceLeaveCoopRoom();

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Link
            to="/game"
            className="inline-flex items-center gap-2 rounded-md border border-neutral-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-neutral-500 hover:text-white"
          >
            {"\u2190"} Voltar
          </Link>
        </div>
        <h1 className="text-4xl font-bold text-white mb-2">Modo Infinity</h1>
        <p className="text-neutral-400">
          Escolha como você quer jogar o modo infinito
        </p>
      </div>

      {myRoomData?.room && (
        <div className="mb-6 rounded-lg bg-amber-500/10 border border-amber-500/30 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="text-amber-300 font-semibold mb-1">
                ⚠️ Você está em uma sala co-op ativa
              </p>
              <p className="text-amber-200/80 text-sm">
                Sala: <span className="font-mono font-bold">{myRoomData.room.roomId}</span> - 
                Status: {myRoomData.room.status === "waiting" ? "Aguardando" : "Jogando"}
              </p>
            </div>
            <button
              onClick={async () => {
                await forceLeaveRoomMutation.mutateAsync();
                await refetchMyRoom();
              }}
              disabled={forceLeaveRoomMutation.isPending}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-50 cursor-pointer whitespace-nowrap"
            >
              {forceLeaveRoomMutation.isPending ? "Saindo..." : "Sair da Sala"}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <InfinityModeCard mode="solo" />
        <InfinityModeCard mode="coop" />
        <InfinityModeCard mode="versus" disabled />
      </div>
    </div>
  );
};

export default InfinityModeSelection;
