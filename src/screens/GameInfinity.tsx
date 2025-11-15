import { Link } from "react-router-dom";
import InfinityGame from "../components/Game/InfinityGame";

const GameInfinity = () => {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          to="/game"
          className="inline-flex items-center gap-2 rounded-md border border-neutral-700 px-4 py-2 text-sm font-semibold text-neutral-200 transition hover:border-neutral-500 hover:text-white"
        >
          ← Voltar para modos
        </Link>
      </div>
      <InfinityGame />
    </div>
  );
};

export default GameInfinity;
