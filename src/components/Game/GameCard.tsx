export type GameCardTypes = "infinity" | "daily" | "quartet" | "double";

interface GameCardProps {
  type: GameCardTypes;
}

type DataCards = {
  title: string;
  description: string;
};

const GameCard = ({ type }: GameCardProps) => {
  const dataCards: DataCards[] = [
    {
      title: "Infinity",
      description: "Modo infinito onde sÃ³ acaba quando vocÃª perde.",
    },
    {
      title: "Daily",
      description: "Modo padrÃ£o onde vocÃª precisa acertar a palavra do dia",
    },
    {
      title: "Quartet",
      description: "Modo onde vocÃª tem que acertar 4 palavras aleatÃ³rias.",
    },
    {
      title: "Double",
      description: "Modo onde vocÃª tem que acertar duas palavras aleatÃ³rias.",
    },
  ];

  const cardData = dataCards.find((card) => card.title.toLowerCase() === type);

  return (
    <div className="border border-stone-700 h-[300px] w-[300px] px-6 gap-5 rounded-sm cursor-pointer flex items-center flex-col text-center justify-center hover:border-stone-400 
      
      transition duration-400 ">
      <h2 className="text-4xl">{cardData?.title.toLocaleUpperCase()}</h2>
      <p className="text-xs">{cardData?.description}</p>
    </div>
  );
};

export default GameCard;
