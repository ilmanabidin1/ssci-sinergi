import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { useRef, type KeyboardEvent, type ReactNode } from "react";

export type ChoiceOption<T extends string> = {
  value: T;
  title: ReactNode;
  description?: ReactNode;
  extra?: ReactNode;
};

/**
 * Kelompok kartu pilihan tunggal dengan pola radiogroup: status terpilih
 * diumumkan pembaca layar (aria-checked), panah kiri/kanan/atas/bawah
 * berpindah pilihan, dan ring fokus terlihat untuk pengguna keyboard.
 */
export function ChoiceCards<T extends string>({
  label,
  value,
  onChange,
  options,
  className,
  size = "md",
}: {
  label: string;
  value: T | undefined;
  onChange: (value: T) => void;
  options: ChoiceOption<T>[];
  className?: string;
  size?: "sm" | "md";
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeIndex = Math.max(0, options.findIndex(option => option.value === value));

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const delta = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    const next = (index + delta + options.length) % options.length;
    refs.current[next]?.focus();
    onChange(options[next]!.value);
  };

  return (
    <div role="radiogroup" aria-label={label} className={className}>
      {options.map((option, index) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            ref={node => { refs.current[index] = node; }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={index === activeIndex ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={event => onKeyDown(event, index)}
            className={cn(
              "relative w-full rounded-lg border text-left outline-none transition focus-visible:border-gold-500 focus-visible:ring-[3px] focus-visible:ring-gold-400/50",
              size === "sm" ? "p-3" : "p-4",
              active ? "border-primary bg-primary/10 ring-2 ring-primary" : "border-border bg-white hover:border-navy-900/30",
            )}
          >
            {active && (
              <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-navy-900 text-gold-300" aria-hidden="true">
                <Check className="h-3 w-3" />
              </span>
            )}
            <span className={cn("block pr-7 font-semibold text-navy-900", size === "sm" && "text-sm")}>{option.title}</span>
            {option.description && <span className="mt-1 block text-xs text-muted-foreground">{option.description}</span>}
            {option.extra}
          </button>
        );
      })}
    </div>
  );
}
