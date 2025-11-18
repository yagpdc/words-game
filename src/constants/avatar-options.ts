export type AvatarHatId = string | null;
export type AvatarBodyId = string | null;
export type AvatarBackgroundId = string;

export const FROG_OPTIONS: { id: string; label: string; allowAccessories?: boolean }[] = [
  { id: "frogo", label: "Frogo Clássico", allowAccessories: true },
  { id: "frogo-minion", label: "Frogo Minion", allowAccessories: false },
  { id: "frogo-piriguete", label: "Frogo Piriguete", allowAccessories: true },
];

export const HAT_OPTIONS: { id: string | null; label: string }[] = [
  { id: null, label: "Sem chapéu" },
  { id: "hat_01", label: "Cartola" },
  { id: "hat_02", label: "Abóbora" },
  { id: "hat_03", label: "Maçã" },
  { id: "hat_04", label: "Construtor" },
  { id: "hat_05", label: "Bruxinha" },
];

export const BODY_OPTIONS: { id: string | null; label: string }[] = [
  { id: null, label: "Sem roupa" },
  { id: "body_01", label: "Bruxinha" },
  { id: "body_02", label: "Sailor moon" },
];

export const BACKGROUND_OPTIONS: { id: string; label: string; gradient: [string, string] }[] = [
  { id: "twilight", label: "Twilight", gradient: ["#2b1f33", "#0b0812"] },
  { id: "sunset", label: "Sunset", gradient: ["#402218", "#1b0b06"] },
  { id: "ocean", label: "Ocean", gradient: ["#0f1a2b", "#02070f"] },
  { id: "jungle", label: "Jungle", gradient: ["#1f2a1e", "#0b120b"] },
  { id: "neon", label: "Neon", gradient: ["#3b0764", "#0f172a"] },
  { id: "cyber", label: "Cyber", gradient: ["#111827", "#0f172a"] },
  { id: "desert", label: "Desert", gradient: ["#3a1c0f", "#120806"] },
  { id: "spring", label: "Spring", gradient: ["#1b2a1b", "#091106"] },
];

export const DEFAULT_AVATAR_TYPE_ID = FROG_OPTIONS[0]?.id ?? "frogo";
export const DEFAULT_AVATAR_HAT_ID: AvatarHatId = null;
export const DEFAULT_AVATAR_BODY_ID: AvatarBodyId = null;
export const DEFAULT_AVATAR_BACKGROUND_ID: AvatarBackgroundId =
  BACKGROUND_OPTIONS[0]?.id ?? "twilight";

export const getFrogAsset = (id?: string) =>
  `/avatar/type/${id ?? DEFAULT_AVATAR_TYPE_ID}.png`;
export const getHatAsset = (id?: string | null) =>
  id ? `/avatar/hats/${id}.png` : undefined;
export const getBodyAsset = (id?: string | null) =>
  id ? `/avatar/bodies/${id}.png` : undefined;

export type HatDisplay = {
  widthPercent: number;
  topPercent: number;
  translateXPercent?: number;
  scale?: number;
};

export const HAT_DISPLAY: Record<string, HatDisplay> = {
  hat_01: { widthPercent: 42, topPercent: -4, translateXPercent: 12 },
  hat_02: { widthPercent: 45, topPercent: 2, translateXPercent: 10 },
  hat_03: { widthPercent: 38, topPercent: 4, translateXPercent: 10 },
  hat_04: { widthPercent: 46, topPercent: 3, translateXPercent: 10 },
  hat_05: { widthPercent: 48, topPercent: 5, translateXPercent: 10 },
};

export type BodyDisplay = {
  widthPercent: number;
  topPercent: number;
  translateXPercent?: number;
};

export const BODY_DISPLAY: Record<string, BodyDisplay> = {
  body_01: { widthPercent: 72, topPercent: 65, translateXPercent: -6 },
  body_02: { widthPercent: 72, topPercent: 66, translateXPercent: -6 },
};

export const BACKGROUND_GRADIENTS: Record<string, readonly [string, string]> =
  BACKGROUND_OPTIONS.reduce<Record<string, readonly [string, string]>>(
    (acc, option) => {
      acc[option.id] = option.gradient;
      return acc;
    },
    {},
  );
