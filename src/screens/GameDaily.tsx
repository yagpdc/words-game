import { Link } from "react-router-dom";
import DailyGame from "../components/Game/DailyGame";

const GameDaily = () => {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          to="/game"
          className="inline-flex items-center gap-2 rounded-md border border-neutral-700 px-4 py-2 text-sm font-semibold text-neutral-200 transition hover:border-neutral-500 hover:text-white"
        >
          {"\u2190"} Voltar para modos
        </Link>
      </div>
      <DailyGame />
    </div>
  );
};

export default GameDaily;
