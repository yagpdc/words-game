import { useEffect, useState } from "react";
import { getFrogAsset } from "../constants/avatar-options";

type AchievementUnlockModalProps = {
  achievementId: string;
  onClose: () => void;
};

const ACHIEVEMENT_INFO: Record<
  string,
  {
    title: string;
    description: string;
    itemId: string;
    itemLabel: string;
    itemType: "frog" | "hat" | "body";
  }
> = {
  "30_STREAK_INFINITY": {
    title: "🏆 Desbloqueado 🏆",
    description: "30 Palavras Seguidas no Modo Infinito",
    itemId: "frogo-minion",
    itemLabel: "Frogo Minion",
    itemType: "frog",
  },
};

const AchievementUnlockModal = ({
  achievementId,
  onClose,
}: AchievementUnlockModalProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const achievement = ACHIEVEMENT_INFO[achievementId];

  useEffect(() => {
    // Pequeno delay para ativar a animação
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  if (!achievement) {
    onClose();
    return null;
  }

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 200); // Aguarda a animação de saída
  };

  const getItemImage = () => {
    if (achievement.itemType === "frog") {
      return getFrogAsset(achievement.itemId);
    }
    // Para futuros hats e bodies
    return "";
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 transition-opacity duration-200 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
      onClick={handleClose}
    >
      <div
        className={`relative max-w-md w-full transition-all duration-300 ${
          isVisible ? "scale-100 opacity-100" : "scale-90 opacity-0"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Brilho de fundo */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 via-purple-500/20 to-pink-500/20 blur-3xl animate-pulse" />

        {/* Conteúdo do modal */}
        <div className="relative bg-gradient-to-br from-neutral-900 to-neutral-950 border-2 border-amber-400/50 rounded-3xl p-8 shadow-[0_20px_80px_rgba(251,191,36,0.3)]">
          {/* Header com título */}
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 bg-clip-text text-transparent animate-[shimmer_2s_ease-in-out_infinite]">
              {achievement.title}
            </h2>
            <p className="text-neutral-300 mt-2 text-sm">
              {achievement.description}
            </p>
          </div>

          {/* Preview do item desbloqueado */}
          <div className="relative mb-6">
            {/* Círculo de brilho */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-40 h-40 bg-gradient-to-br from-amber-400/30 to-purple-500/30 rounded-full blur-2xl animate-pulse" />
            </div>

            {/* Imagem do item */}
            <div className="relative flex items-center justify-center h-48 animate-[float_3s_ease-in-out_infinite]">
              <img
                src={getItemImage()}
                alt={achievement.itemLabel}
                className="max-h-full max-w-[200px] object-contain drop-shadow-[0_10px_30px_rgba(251,191,36,0.5)]"
              />
            </div>
          </div>

          {/* Nome do item */}
          <div className="text-center mb-6">
            <div className="inline-block px-6 py-3 ">
              <p className="text-lg font-bold text-amber-300">
                {achievement.itemLabel}
              </p>
              <p className="text-xs text-neutral-400 mt-1">
                Desbloqueado!
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="w-full rounded-xl cursor-pointer bg-gradient-to-r from-amber-600 to-amber-500 px-6 py-3.5 text-base font-bold text-neutral-900 transition-all duration-200 hover:from-amber-500 hover:to-amber-400 active:scale-95 shadow-[0_10px_30px_rgba(251,191,36,0.3)]"
          >
            Incrível
          </button>
        </div>
      </div>
    </div>
  );
};

export default AchievementUnlockModal;
