import {
  DEFAULT_AVATAR_HAT_ID,
  DEFAULT_AVATAR_BODY_ID,
  DEFAULT_AVATAR_BACKGROUND_ID,
  DEFAULT_AVATAR_TYPE_ID,
  type AvatarHatId,
  type AvatarBodyId,
  type AvatarBackgroundId,
} from "../constants/avatar-options";

export type NormalizedAvatarConfig = {
  frogType: string;
  hat: AvatarHatId;
  body: AvatarBodyId;
  background: AvatarBackgroundId;
};

const coerceId = (value: unknown, fallback: string) =>
  typeof value === "string" && value.trim().length > 0 ? value : fallback;

const coerceNullable = <T extends string | null>(value: unknown): T | null =>
  typeof value === "string" && value.trim().length > 0
    ? (value as T)
    : null;

export const normalizeAvatarConfig = (
  rawConfig?: Record<string, unknown>,
): NormalizedAvatarConfig => {
  if (!rawConfig || typeof rawConfig !== "object") {
    return {
      frogType: DEFAULT_AVATAR_TYPE_ID,
      hat: DEFAULT_AVATAR_HAT_ID,
      body: DEFAULT_AVATAR_BODY_ID,
      background: DEFAULT_AVATAR_BACKGROUND_ID,
    };
  }

  const avatar = rawConfig.avatar;
  const avatarRecord =
    avatar && typeof avatar === "object"
      ? (avatar as Record<string, unknown>)
      : null;

  const rawType =
    avatarRecord && typeof avatarRecord.frogType === "string"
      ? (avatarRecord.frogType as string)
      : undefined;

  const rawHat =
    avatarRecord &&
    (typeof avatarRecord.hat === "string" || avatarRecord.hat === null)
      ? (avatarRecord.hat as string | null)
      : undefined;

  const rawBody =
    avatarRecord &&
    (typeof avatarRecord.body === "string" || avatarRecord.body === null)
      ? (avatarRecord.body as string | null)
      : undefined;

  const rawBackground =
    avatarRecord && typeof avatarRecord.background === "string"
      ? (avatarRecord.background as string)
      : undefined;

  return {
    frogType: coerceId(rawType, DEFAULT_AVATAR_TYPE_ID),
    hat: (coerceNullable(rawHat) as AvatarHatId) ?? DEFAULT_AVATAR_HAT_ID,
    body: (coerceNullable(rawBody) as AvatarBodyId) ?? DEFAULT_AVATAR_BODY_ID,
    background: coerceId(rawBackground, DEFAULT_AVATAR_BACKGROUND_ID),
  };
};
