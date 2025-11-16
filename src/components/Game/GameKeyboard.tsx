import { useEffect } from "react";
import { IoBackspaceOutline } from "react-icons/io5";

type KeyboardLetterStatus = "default" | "present" | "absent" | "correct";

const DEFAULT_LAYOUT = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "DELETE"],
];

const KEYBOARD_STYLES: Record<KeyboardLetterStatus, string> = {
  default: "bg-[#2B1F40] text-[#FBFAFF] hover:bg-[#4B3571]",
  present: "bg-[#E19B30] text-[#1B0F02]",
  absent: "bg-[#120B16] text-[#F8F5FF]",
  correct: "bg-[#0F8F74] text-[#F5FFFA]",
};

const isActionKey = (key: string) => key === "ENTER" || key === "DELETE";

type GameKeyboardProps = {
  statuses: Record<string, KeyboardLetterStatus>;
  disabled?: boolean;
  layout?: string[][];
  onKeyPress: (key: string) => void;
  capturePhysicalInput?: boolean;
};

const GameKeyboard = ({
  statuses,
  disabled = false,
  layout = DEFAULT_LAYOUT,
  onKeyPress,
  capturePhysicalInput = true,
}: GameKeyboardProps) => {
  useEffect(() => {
    if (!capturePhysicalInput || disabled) {
      return;
    }

    const handlePhysicalKey = (event: KeyboardEvent) => {
      const { key } = event;

      if (key === "Enter") {
        event.preventDefault();
        onKeyPress("ENTER");
        return;
      }

      if (key === "Backspace" || key === "Delete") {
        event.preventDefault();
        onKeyPress("DELETE");
        return;
      }

      if (/^[a-zA-Z]$/.test(key)) {
        event.preventDefault();
        onKeyPress(key.toUpperCase());
      }
    };

    window.addEventListener("keydown", handlePhysicalKey);
    return () => window.removeEventListener("keydown", handlePhysicalKey);
  }, [capturePhysicalInput, disabled, onKeyPress]);

  return (
    <div className="flex flex-col gap-2">
      {layout.map((row, rowIndex) => (
        <div
          key={`keyboard-row-${rowIndex}`}
          className="flex justify-center gap-2"
        >
          {row.map((key) => {
            const upperKey = key.toUpperCase();
            const status = statuses[upperKey] ?? "default";
            const action = isActionKey(upperKey);
            const isDisabled = disabled;

            return (
              <button
                key={key}
                type="button"
                disabled={isDisabled}
                className={`min-w-12 rounded-md px-3 py-2 text-sm font-semibold transition focus:outline-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
                  action ? "text-xs uppercase" : ""
                } ${KEYBOARD_STYLES[status]}`}
                onClick={() => onKeyPress(upperKey)}
              >
                {upperKey === "DELETE" ? (
                  <IoBackspaceOutline size={24} />
                ) : upperKey === "ENTER" ? (
                  "Enter"
                ) : (
                  key
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default GameKeyboard;
export type { KeyboardLetterStatus };
