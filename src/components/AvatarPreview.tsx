import {
  getFrogAsset,
  getHatAsset,
  getBodyAsset,
  HAT_DISPLAY,
  BODY_DISPLAY,
  BACKGROUND_GRADIENTS,
  DEFAULT_AVATAR_BACKGROUND_ID,
} from "../constants/avatar-options";
import type {
  AvatarHatId,
  AvatarBodyId,
  AvatarBackgroundId,
  BodyDisplay,
} from "../constants/avatar-options";

const DEFAULT_HAT_DISPLAY = {
  widthPercent: 46,
  topPercent: 4,
  translateXPercent: 0,
  scale: 1,
};

const DEFAULT_BODY_DISPLAY: BodyDisplay = {
  widthPercent: 60,
  topPercent: 58,
  translateXPercent: 0,
};

type AvatarPreviewProps = {
  frogType?: string;
  hat?: AvatarHatId;
  body?: AvatarBodyId;
  background?: AvatarBackgroundId;
  size?: number;
  className?: string;
};

const AvatarPreview = ({
  frogType = "default",
  hat,
  body,
  background,
  size = 64,
  className = "",
}: AvatarPreviewProps) => {
  const frogImage = getFrogAsset(frogType);
  const hatImage = hat ? getHatAsset(hat) : undefined;
  const bodyImage = body ? getBodyAsset(body) : undefined;
  const hatDisplay =
    (hat ? HAT_DISPLAY[hat] : undefined) ?? DEFAULT_HAT_DISPLAY;
  const bodyDisplay =
    (body ? BODY_DISPLAY[body] : undefined) ?? DEFAULT_BODY_DISPLAY;
  const renderBodyAboveHat = Boolean(body && bodyDisplay.renderAboveHat);
  const hatElement = hatImage ? (
    <img
      src={hatImage}
      alt="Chapéu do avatar"
      className="pointer-events-none absolute object-contain"
      style={{
        width: `${hatDisplay.widthPercent}%`,
        top: `${hatDisplay.topPercent}%`,
        left: "50%",
        transform: `translateX(-50%) translateX(${hatDisplay.translateXPercent ?? 0}%) scale(${hatDisplay.scale ?? 1})`,
      }}
      draggable={false}
    />
  ) : null;
  const bodyElement = bodyImage ? (
    <img
      src={bodyImage}
      alt="Roupa do avatar"
      className="pointer-events-none absolute object-contain"
      style={{
        width: `${bodyDisplay.widthPercent}%`,
        top: `${bodyDisplay.topPercent}%`,
        left: "50%",
        transform: `translate(-50%, -50%) translateX(${bodyDisplay.translateXPercent ?? 0}%)`,
      }}
      draggable={false}
    />
  ) : null;
  const gradient =
    BACKGROUND_GRADIENTS[background ?? DEFAULT_AVATAR_BACKGROUND_ID] ??
    BACKGROUND_GRADIENTS[DEFAULT_AVATAR_BACKGROUND_ID];

  const FROG_SCALE = 0.82;
  const FROG_OFFSET_Y = 6;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl ${className}`}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(180deg, ${gradient[0]}, ${gradient[1]})`,
      }}
    >
      {frogImage ? (
        <img
          src={frogImage}
          alt="Base do avatar"
          className="h-full w-full object-contain"
          style={{
            transform: `translateY(${FROG_OFFSET_Y}%) scale(${FROG_SCALE})`,
            transformOrigin: "center",
          }}
          draggable={false}
        />
      ) : null}
      {renderBodyAboveHat ? hatElement : bodyElement}
      {renderBodyAboveHat ? bodyElement : hatElement}
    </div>
  );
};

export default AvatarPreview;
