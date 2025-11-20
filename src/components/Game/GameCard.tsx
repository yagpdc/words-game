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
      className={`border border-neutral-800 rounded-2xl p-6 flex flex-col gap-4 text-slate-200 transition-all duration-300 ${stateClasses} h-full min-h-[200px]`}
    >
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
