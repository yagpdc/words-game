import { Link } from "react-router-dom";
import GameCard, { type GameCardTypes } from "./GameCard";

const CARD_TYPES: GameCardTypes[] = ["daily", "infinity", "quartet", "double"];

const CARD_ROUTES: Partial<Record<GameCardTypes, string>> = {
  daily: "/game/daily",
  infinity: "/game/infinity/mode",
};

const GameLayout = () => {
  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Modos de Jogo</h1>
        <p className="text-neutral-400">Escolha um modo e comece a jogar</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {CARD_TYPES.map((type) => {
          const route = CARD_ROUTES[type];
          if (route) {
            return (
              <Link
                key={type}
                to={route}
                className="transform transition-transform hover:scale-105"
              >
                <GameCard type={type} />
              </Link>
            );
          }

          return (
            <div
              key={type}
              className="opacity-60"
            >
              <GameCard type={type} disabled />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GameLayout;
