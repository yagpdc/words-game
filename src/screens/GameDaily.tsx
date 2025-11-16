import DailyGame from "../components/Game/DailyGame";

const GameDaily = () => {
  return (
    <div className="flex w-full justify-center">
      <div className="flex w-3/4 flex-col gap-6">
        <DailyGame />
      </div>
    </div>
  );
};

export default GameDaily;
