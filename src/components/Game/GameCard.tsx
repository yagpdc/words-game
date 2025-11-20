import { useEffect, useState } from "react";

export type GameCardTypes = "infinity" | "daily" | "quartet" | "double";

interface GameCardProps {
  type: GameCardTypes;
  disabled?: boolean;
}

type DataCards = {
  title: string;
  description: string;
};

const GameCard = ({ type, disabled = false }: GameCardProps) => {
  const [countdown, setCountdown] = useState<string>("00:00");

  useEffect(() => {
    if (type !== "daily") return;

    const update = () => {
      try {
        // Get current time in Brasília (America/Sao_Paulo) by formatting to that timezone
        const brazilNow = new Date(
          new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })
        );

        const target = new Date(brazilNow);
        target.setHours(21, 0, 0, 0);

        if (brazilNow.getTime() >= target.getTime()) {
          // already past today's 21:00 -> use tomorrow 21:00
          target.setDate(target.getDate() + 1);
        }

        const diff = Math.max(0, target.getTime() - brazilNow.getTime());
        const totalSeconds = Math.floor(diff / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        const formatted = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
        setCountdown(formatted);
      } catch (err) {
        setCountdown("00:00");
      }
    };

    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [type]);
  const dataCards: DataCards[] = [
    {
      title: "Infinity",
      description: "Modo infinito: só acaba quando você perde.",
    },
    {
      title: "Daily",
      description: "Modo padrão: você precisa acertar a palavra do dia",
    },
    {
      title: "Quartet",
      description: "Modo quarteto: você tem que acertar 4 palavras aleatórias.",
    },
    {
      title: "Double",
      description:
        "Modo double: você tem que acertar duas palavras aleatórias.",
    },
  ];

  const cardData = dataCards.find((card) => card.title.toLowerCase() === type);

  const stateClasses = disabled
    ? "cursor-not-allowed opacity-60 bg-neutral-900/50"
    : "cursor-pointer hover:border-purple-500/50 hover:shadow-[0_0_20px_rgba(147,51,234,0.3)] bg-neutral-900/80";

  return (
    <div
      className={`relative border border-neutral-800 rounded-2xl p-6 flex flex-col gap-4 text-slate-200 transition-all duration-300 ${stateClasses} h-full min-h-[200px]`}
    >
      {/* Countdown for Daily mode (Brasília time, next 21:00) */}
      {type === "daily" && (
        <div className="absolute top-3 right-3 bg-neutral-900/60 px-3 py-1 rounded-md text-xs text-neutral-200 flex items-center gap-2">
          <span className="text-xs text-neutral-300">Próxima palavra:</span>
          <span className="font-medium">{countdown}</span>
        </div>
      )}
      <div className="flex-1 flex flex-col justify-center gap-3">
        <h2 className="text-2xl font-bold text-white">
          {cardData?.title.toLocaleUpperCase()}
        </h2>
        <p className="text-sm text-neutral-400 leading-relaxed">
          {cardData?.description}
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
};

export default GameCard;
