import { Link } from "react-router-dom";
import GameCard, { type GameCardTypes } from "./GameCard";

const CARD_TYPES: GameCardTypes[] = ["daily", "infinity", "quartet", "double"];

const CARD_ROUTES: Partial<Record<GameCardTypes, string>> = {
  daily: "/game/daily",
};

const GameLayout = () => {
  return (
    <div className="grid grid-cols-2  gap-20 ">
      {CARD_TYPES.map((type) => {
        const route = CARD_ROUTES[type];
        if (route) {
          return (
            <Link
              key={type}
              to={route}
              className="flex items-center justify-center"
            >
              <GameCard type={type} />
            </Link>
          );
        }

        return (
          <div
            key={type}
            className="flex items-center justify-center opacity-60"
          >
            <GameCard type={type} disabled />
          </div>
        );
      })}
    </div>
  );
};

export default GameLayout;
