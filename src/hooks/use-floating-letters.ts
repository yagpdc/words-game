import { useEffect, useRef, useState } from "react";

type Side = "top" | "right" | "bottom" | "left";

type RelativeCardRect = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

type ActiveLetter = {
  id: number;
  x: number;
  y: number;
  letter: string;
  visible: boolean;
};

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LETTER_COUNT = LETTERS.length;
const LETTER_FONT_STACK =
  '"Doto","Baloo 2","Fredoka One","Comic Sans MS","Trebuchet MS",cursive';

const PIECE_INTERVAL_MS = 1800;
const PIECE_VISIBLE_MS = 900;
const PIECE_ENTER_MS = 300;
const PIECES_PER_BATCH = 30;
const PIECE_STAGGER_MS = 80;
const SIDE_OFFSET = 90;
const EDGE_MARGIN = 32;
const CARD_EXCLUSION_PADDING = 20;
const MIN_DISTANCE_BETWEEN_LETTERS = 180;
const MIN_DISTANCE_SQUARED =
  MIN_DISTANCE_BETWEEN_LETTERS * MIN_DISTANCE_BETWEEN_LETTERS;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const pickPositionForSide = (
  side: Side,
  sectionRect: DOMRect,
  cardRect: RelativeCardRect,
): { x: number; y: number } | null => {
  const cardWidth = Math.max(cardRect.right - cardRect.left, 1);
  const cardHeight = Math.max(cardRect.bottom - cardRect.top, 1);

  const randomX = () =>
    clamp(
      cardRect.left + Math.random() * cardWidth,
      EDGE_MARGIN,
      sectionRect.width - EDGE_MARGIN,
    );
  const randomY = () =>
    clamp(
      cardRect.top + Math.random() * cardHeight,
      EDGE_MARGIN,
      sectionRect.height - EDGE_MARGIN,
    );

  switch (side) {
    case "top": {
      const y = cardRect.top - SIDE_OFFSET;
      if (y < EDGE_MARGIN) return null;
      return { x: randomX(), y };
    }
    case "bottom": {
      const y = cardRect.bottom + SIDE_OFFSET;
      if (y > sectionRect.height - EDGE_MARGIN) return null;
      return { x: randomX(), y };
    }
    case "left": {
      const x = cardRect.left - SIDE_OFFSET;
      if (x < EDGE_MARGIN) return null;
      return { x, y: randomY() };
    }
    case "right": {
      const x = cardRect.right + SIDE_OFFSET;
      if (x > sectionRect.width - EDGE_MARGIN) return null;
      return { x, y: randomY() };
    }
    default:
      return null;
  }
};

const pickFallbackPosition = (
  sectionRect: DOMRect,
  cardRect: RelativeCardRect,
): { x: number; y: number } | null => {
  const x =
    EDGE_MARGIN +
    Math.random() * Math.max(sectionRect.width - EDGE_MARGIN * 2, 1);
  const y =
    EDGE_MARGIN +
    Math.random() * Math.max(sectionRect.height - EDGE_MARGIN * 2, 1);

  const insideCard =
    x >= cardRect.left &&
    x <= cardRect.right &&
    y >= cardRect.top &&
    y <= cardRect.bottom;

  if (insideCard) {
    return null;
  }

  return { x, y };
};

const isFarFromLetters = (
  pos: { x: number; y: number },
  letters: ActiveLetter[],
) =>
  letters.every((letter) => {
    const dx = letter.x - pos.x;
    const dy = letter.y - pos.y;
    return dx * dx + dy * dy >= MIN_DISTANCE_SQUARED;
  });

const findPlacement = (
  sectionRect: DOMRect,
  relativeCard: RelativeCardRect,
  existingLetters: ActiveLetter[],
) => {
  const sides: Side[] = ["top", "right", "bottom", "left"].sort(
    () => Math.random() - 0.5,
  );

  for (const side of sides) {
    const candidate = pickPositionForSide(side, sectionRect, relativeCard);
    if (candidate && isFarFromLetters(candidate, existingLetters)) {
      return candidate;
    }
  }

  const fallbackAttempts = 30;
  for (let attempt = 0; attempt < fallbackAttempts; attempt += 1) {
    const fallback = pickFallbackPosition(sectionRect, relativeCard);
    if (fallback && isFarFromLetters(fallback, existingLetters)) {
      return fallback;
    }
  }

  return null;
};

const getRandomLetter = () => LETTERS[Math.floor(Math.random() * LETTER_COUNT)];

export const useFloatingLetters = () => {
  const [letters, setLetters] = useState<ActiveLetter[]>([]);
  const sectionRef = useRef<HTMLElement | null>(null);
  const cardRef = useRef<HTMLFormElement | null>(null);
  const lettersRef = useRef<ActiveLetter[]>([]);

  useEffect(() => {
    lettersRef.current = letters;
  }, [letters]);

  useEffect(() => {
    const spawnTimeouts = new Set<ReturnType<typeof window.setTimeout>>();
    const removalTimeouts = new Set<ReturnType<typeof window.setTimeout>>();
    const enterFrames = new Set<number>();

    const spawnLetter = () => {
      if (!sectionRef.current || !cardRef.current) {
        return;
      }

      const sectionRect = sectionRef.current.getBoundingClientRect();
      const cardRect = cardRef.current.getBoundingClientRect();

      const relativeCard: RelativeCardRect = {
        left: cardRect.left - sectionRect.left - CARD_EXCLUSION_PADDING,
        right: cardRect.right - sectionRect.left + CARD_EXCLUSION_PADDING,
        top: cardRect.top - sectionRect.top - CARD_EXCLUSION_PADDING,
        bottom: cardRect.bottom - sectionRect.top + CARD_EXCLUSION_PADDING,
      };

      const placement = findPlacement(
        sectionRect,
        relativeCard,
        lettersRef.current,
      );

      if (!placement) {
        return;
      }

      const letter = getRandomLetter();
      const newId = Date.now() + Math.random();

      setLetters((previous) => {
        const next = [
          ...previous,
          {
            id: newId,
            x: placement.x,
            y: placement.y,
            letter,
            visible: false,
          },
        ];
        lettersRef.current = next;
        return next;
      });

      const frameId = window.requestAnimationFrame(() => {
        setLetters((prev) => {
          const next = prev.map((item) =>
            item.id === newId ? { ...item, visible: true } : item,
          );
          lettersRef.current = next;
          return next;
        });
        enterFrames.delete(frameId);
      });
      enterFrames.add(frameId);

      const removalTimeout = window.setTimeout(() => {
        setLetters((prev) => {
          const next = prev.filter((item) => item.id !== newId);
          lettersRef.current = next;
          return next;
        });
        removalTimeouts.delete(removalTimeout);
      }, PIECE_VISIBLE_MS);
      removalTimeouts.add(removalTimeout);
    };

    const spawnBatch = () => {
      for (let index = 0; index < PIECES_PER_BATCH; index += 1) {
        const timeoutId = window.setTimeout(
          spawnLetter,
          index * PIECE_STAGGER_MS,
        );
        spawnTimeouts.add(timeoutId);
      }
    };

    spawnBatch();
    const intervalId = window.setInterval(spawnBatch, PIECE_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
      spawnTimeouts.forEach((timeoutId) => window.clearTimeout(timeoutId));
      removalTimeouts.forEach((timeoutId) => window.clearTimeout(timeoutId));
      enterFrames.forEach((frameId) => window.cancelAnimationFrame(frameId));
    };
  }, []);

  return {
    sectionRef,
    cardRef,
    letters,
    enterDuration: PIECE_ENTER_MS,
    letterFontFamily: LETTER_FONT_STACK,
  };
};
