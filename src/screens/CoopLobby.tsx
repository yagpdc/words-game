import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useCreateCoopRoom } from "../hooks/words/use-create-coop-room";
import { useJoinCoopRoom } from "../hooks/words/use-join-coop-room";
import { useMyCoopRoom } from "../hooks/words/use-my-coop-room";
import { useForceLeaveCoopRoom } from "../hooks/words/use-force-leave-coop";
import { useCoopRoomSocket } from "../hooks/socket/use-coop-room-socket";
import type {
  WordsInfiniteRoom,
  RoomPlayerJoinedEvent,
  RoomGameStartedEvent,
  RoomPlayerLeftEvent,
} from "../types/words";
import AvatarPreview from "../components/AvatarPreview";

const CoopLobby = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [room, setRoom] = useState<WordsInfiniteRoom | null>(null);
  const [joinRoomId, setJoinRoomId] = useState("");
  const [mode, setMode] = useState<"select" | "create" | "join">("select");
  const [error, setError] = useState<string | null>(null);

  const createRoomMutation = useCreateCoopRoom();
  const joinRoomMutation = useJoinCoopRoom();
  const forceLeaveRoomMutation = useForceLeaveCoopRoom();
  const { data: myRoomData, refetch: refetchMyRoom } = useMyCoopRoom();

  // Check for existing active room on mount
  useEffect(() => {
    if (myRoomData?.room) {
      setRoom(myRoomData.room);

      // If game already started, navigate to game
      if (myRoomData.run && myRoomData.room.status === "playing") {
        navigate(`/game/infinity/coop/${myRoomData.room.roomId}`, {
          state: {
            run: myRoomData.run,
            currentTurnPlayerId: myRoomData.currentTurnPlayerId,
          },
        });
      } else if (myRoomData.room.status === "waiting") {
        // If waiting, show the waiting room
        setMode("create");
      }
    }
  }, [myRoomData, navigate]);

  // Socket handlers
  const handlePlayerJoined = useCallback((event: RoomPlayerJoinedEvent) => {
    setRoom((prev) => {
      // If we don't yet have the room state (race between socket and initial query),
      // trigger a refetch to populate authoritative data from the server.
      if (!prev || prev.roomId !== event.roomId) {
        // refetchMyRoom is available in outer scope
        if (refetchMyRoom) {
          refetchMyRoom().then((res) => {
            const data = res?.data;
            if (data?.room) {
              setRoom(data.room);
            }
          }).catch((err) => {
            console.error("Erro ao refetchMyRoom após player-joined:", err);
          });
        }
        return prev;
      }

      return {
        ...prev,
        players: event.playersCount === 2
          ? [...prev.players, event.player]
          : prev.players,
      };
    });
  }, []);

  const handleGameStarted = useCallback(
    (event: RoomGameStartedEvent) => {
      navigate(`/game/infinity/coop/${event.roomId}`, {
        state: {
          run: event.run,
          currentTurnPlayerId: event.currentTurnPlayerId,
        },
      });
    },
    [navigate]
  );

  const handlePlayerLeft = useCallback((event: RoomPlayerLeftEvent) => {
    setRoom((prev) => {
      if (!prev || prev.roomId !== event.roomId) return prev;
      return {
        ...prev,
        players: prev.players.filter((p) => p.userId !== event.playerId),
      };
    });
  }, []);

  useCoopRoomSocket(room?.roomId ?? null, {
    onPlayerJoined: handlePlayerJoined,
    onGameStarted: handleGameStarted,
    onPlayerLeft: handlePlayerLeft,
  });

  // Auto-join room from URL
  useEffect(() => {
    const roomIdFromUrl = searchParams.get("room");
    if (roomIdFromUrl && mode === "select") {
      setJoinRoomId(roomIdFromUrl);
      setMode("join");
      handleJoinRoom(roomIdFromUrl);
    }
  }, [searchParams, mode]);

  const handleCreateRoom = async () => {
    setError(null);
    try {
      const result = await createRoomMutation.mutateAsync();
      console.log("🎮 Sala criada:", result);
      setRoom(result.room);
      setMode("create");
    } catch (err: any) {
      setError(err.response?.data?.message || "Erro ao criar sala");
    }
  };

  const handleJoinRoom = async (roomId?: string) => {
    const targetRoomId = roomId || joinRoomId.trim();
    if (!targetRoomId) {
      setError("Digite o ID da sala");
      return;
    }

    setError(null);
    try {
      const result = await joinRoomMutation.mutateAsync(targetRoomId);
      setRoom(result.room);
      setMode("create");

      if (result.run) {
        navigate(`/game/infinity/coop/${targetRoomId}`, {
          state: {
            run: result.run,
            currentTurnPlayerId: result.room.players[0]?.userId,
          },
        });
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Erro ao entrar na sala. Verifique o ID."
      );
    }
  };

  const handleLeaveRoom = async () => {
    if (!room) return;

    try {
      await forceLeaveRoomMutation.mutateAsync();
      setRoom(null);
      setMode("select");
      setError(null);
      await refetchMyRoom();
    } catch (err: any) {
      console.error("Erro ao sair da sala:", err);
    }
  };

  const handleCopyRoomId = () => {
    if (room?.roomId) {
      navigator.clipboard.writeText(room.roomId);
    }
  };

  const handleCopyRoomLink = () => {
    if (room?.roomId) {
      const link = `${window.location.origin}/game/infinity/coop/lobby?room=${room.roomId}`;
      navigator.clipboard.writeText(link);
    }
  };

  if (mode === "select") {
    return (
      <div className="w-full max-w-2xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Link
            to="/game/infinity/mode"
            className="inline-flex items-center gap-2 rounded-md border border-neutral-700 px-4 py-2 text-sm font-semibold text-slate-200! transition hover:border-neutral-500 hover:text-white mb-6"
          >
            {"\u2190"} Voltar
          </Link>
          <h1 className="text-4xl font-bold text-white mb-2">Lobby Co-op</h1>
          <p className="text-neutral-400">Crie ou entre em uma sala para jogar</p>
        </div>

        {myRoomData?.room && (
          <div className="mb-6 rounded-lg bg-amber-500/10 border border-amber-500/30 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-amber-300 font-semibold mb-1">
                  ⚠️ Você está em uma sala ativa
                </p>
                <p className="text-amber-200/80 text-sm">
                  Sala: <span className="font-mono font-bold">{myRoomData.room.roomId}</span> - Status: {myRoomData.room.status === "waiting" ? "Aguardando" : "Jogando"}
                </p>
              </div>
              <button
                onClick={async () => {
                  try {
                    await forceLeaveRoomMutation.mutateAsync();
                    await refetchMyRoom();
                    setError(null);
                  } catch (err: any) {
                    setError("Erro ao sair da sala");
                  }
                }}
                disabled={forceLeaveRoomMutation.isPending}
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-50 cursor-pointer whitespace-nowrap"
              >
                {forceLeaveRoomMutation.isPending ? "Saindo..." : "Sair da Sala"}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-lg bg-red-500/10 border border-red-500/30 p-4 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="grid gap-6">
          <button
            onClick={handleCreateRoom}
            disabled={createRoomMutation.isPending}
            className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-8 text-left transition-all hover:border-purple-500/50 hover:shadow-[0_0_20px_rgba(147,51,234,0.3)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <div className="text-4xl mb-4">🎮</div>
            <h2 className="text-2xl font-bold text-white mb-2">Criar Sala</h2>
            <p className="text-neutral-400 text-sm">
              {createRoomMutation.isPending
                ? "Criando sala..."
                : "Crie uma nova sala e aguarde um parceiro"}
            </p>
          </button>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-8">
            <div className="text-4xl mb-4">🔑</div>
            <h2 className="text-2xl font-bold text-white mb-2">Entrar em Sala</h2>
            <p className="text-neutral-400 text-sm mb-4">
              Digite o ID da sala para entrar
            </p>
            <div className="flex gap-3">
              <input
                type="text"
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                placeholder="ID DA SALA"
                maxLength={6}
                className="flex-1 rounded-lg bg-neutral-800 border border-neutral-700 px-4 py-3 text-white uppercase tracking-widest focus:border-purple-500 focus:outline-none"
              />
              <button
                onClick={() => handleJoinRoom()}
                disabled={joinRoomMutation.isPending || !joinRoomId.trim()}
                className="rounded-lg bg-purple-600 px-6 py-3 font-semibold text-white transition hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {joinRoomMutation.isPending ? "Entrando..." : "Entrar"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!room) {
    console.log("⚠️ Renderizando Carregando - mode:", mode, "room:", room);
    return (
      <div className="w-full max-w-3xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Link
            to="/game/infinity/mode"
            className="inline-flex items-center gap-2 rounded-md border border-neutral-700 px-4 py-2 text-sm font-semibold text-slate-200! transition hover:border-neutral-500 hover:text-white mb-6"
          >
            {"\u2190"} Voltar
          </Link>
          <h1 className="text-4xl font-bold text-white mb-2">Carregando...</h1>
        </div>
      </div>
    );
  }

  const hasPartner = room.players.length === 2;

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <Link
          to="/game/infinity/mode"
          className="inline-flex items-center gap-2 rounded-md border border-neutral-700 px-4 py-2 text-sm font-semibold text-slate-200! transition hover:border-neutral-500 hover:text-white mb-6"
        >
          {"\u2190"} Voltar para modos
        </Link>
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-4xl font-bold text-white">Sala de Espera</h1>
          <div className="flex items-center gap-2 text-lg font-semibold">
            <span className="text-white">{room.players.length}</span>
            <span className="text-neutral-600">/</span>
            <span className="text-neutral-400">2</span>
            <span className="text-neutral-500 text-sm ml-1">jogadores</span>
          </div>
        </div>
        <p className="text-neutral-400">
          {hasPartner
            ? "Sala completa! Iniciando jogo..."
            : `Aguardando ${2 - room.players.length} jogador(es) para iniciar`}
        </p>
      </div>

      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-8 mb-6">
        <div className="flex flex-col gap-6">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <p className="text-xs uppercase tracking-wide text-neutral-500">
                Código da Sala
              </p>
              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold ${
                hasPartner
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-amber-500/20 text-amber-400'
              }`}>
                <div className={`w-1.5 h-1.5 rounded-full ${
                  hasPartner ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                }`}></div>
                {hasPartner ? 'Completa' : 'Aguardando'}
              </div>
            </div>
            <p className="text-5xl font-bold text-white tracking-[0.3em] mb-5 font-mono">
              {room.roomId}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleCopyRoomId}
                className="inline-flex items-center gap-2 rounded-lg bg-neutral-800 border border-neutral-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-700 cursor-pointer"
                title="Copiar ID"
              >
                📋 Copiar ID
              </button>
              <button
                onClick={handleCopyRoomLink}
                className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-700 cursor-pointer"
                title="Copiar Link"
              >
                🔗 Copiar Link para Compartilhar
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs uppercase tracking-wide text-neutral-500">
                Jogadores
              </p>
              <div className="flex items-center gap-1.5 text-sm">
                <span className="font-bold text-white">{room.players.length}</span>
                <span className="text-neutral-600">/</span>
                <span className="text-neutral-400">2</span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {room.players.map((player, index) => (
                <div
                  key={player.userId}
                  className="rounded-xl border border-neutral-700 bg-neutral-800/50 p-4 flex items-center gap-4 relative overflow-hidden"
                >
                  {player.isCreator && (
                    <div className="absolute top-2 right-2">
                      <span className="text-xs">👑</span>
                    </div>
                  )}
                  <div className="relative">
                    <AvatarPreview
                      frogType={player.avatar?.frogType}
                      hat={player.avatar?.hat}
                      body={player.avatar?.body}
                      background={player.avatar?.background}
                      size={60}
                    />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-neutral-900 flex items-center justify-center border-2 border-neutral-800">
                      <span className="text-[10px] font-bold text-neutral-400">{index + 1}</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-white text-lg">{player.name}</p>
                    {player.isCreator && (
                      <p className="text-xs text-purple-400">Criador da Sala</p>
                    )}
                    {!player.isCreator && (
                      <p className="text-xs text-neutral-500">Jogador</p>
                    )}
                  </div>
                </div>
              ))}

              {!hasPartner && (
                <div className="rounded-xl border-2 border-dashed border-neutral-700 bg-neutral-800/20 p-6 flex flex-col items-center justify-center min-h-[100px] gap-3">
                  <div className="relative">
                    <div className="text-4xl opacity-30">👤</div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-2xl animate-pulse">⏳</div>
                    </div>
                  </div>
                  <p className="text-neutral-500 text-sm text-center font-semibold">
                    Aguardando...
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {!hasPartner && (
        <div className="rounded-lg bg-purple-500/10 border border-purple-500/30 p-5 mb-6">
          <div className="flex items-start gap-3">
            <div className="text-2xl">💡</div>
            <div className="flex-1">
              <p className="text-purple-300 font-semibold mb-2">
                Como convidar um parceiro:
              </p>
              <ul className="text-purple-200/80 text-sm space-y-1 list-disc list-inside">
                <li>Compartilhe o <strong>ID da sala</strong> ({room.roomId})</li>
                <li>Ou envie o <strong>link direto</strong> usando o botão acima</li>
                <li>O jogo iniciará automaticamente quando o segundo jogador entrar</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {hasPartner && (
        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-5 mb-6">
          <div className="flex items-center gap-3">
            <div className="text-2xl">✅</div>
            <div className="flex-1">
              <p className="text-emerald-300 font-semibold mb-1">
                Sala completa!
              </p>
              <p className="text-emerald-200/80 text-sm">
                O jogo iniciará em breve. Prepare-se para jogar!
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-emerald-400 text-sm font-semibold">Iniciando...</span>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={handleLeaveRoom}
        disabled={forceLeaveRoomMutation.isPending}
        className="w-full rounded-lg border border-neutral-700 px-6 py-3 font-semibold text-neutral-300 transition hover:border-red-500 hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {forceLeaveRoomMutation.isPending ? "Saindo..." : "Sair da Sala"}
      </button>
    </div>
  );
};

export default CoopLobby;
