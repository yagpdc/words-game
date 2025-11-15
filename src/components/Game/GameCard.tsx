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
    ? "cursor-not-allowed opacity-60"
    : "cursor-pointer hover:border-stone-400";

  return (
    <div
      className={`border border-stone-700 h-[300px] w-[300px] px-6 gap-5 rounded-sm flex items-center flex-col text-center justify-center text-slate-200 transition duration-400 ${stateClasses}`}
    >
      <h2 className="text-4xl">{cardData?.title.toLocaleUpperCase()}</h2>
      <p className="text-xs text-slate-200">{cardData?.description}</p>
    </div>
  );
};

export default GameCard;
