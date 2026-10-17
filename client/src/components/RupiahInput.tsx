import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { forwardRef, useLayoutEffect, useRef, type ComponentProps } from "react";

const format = (digits: string) => (digits ? Number(digits).toLocaleString("id-ID") : "");

type Props = Omit<ComponentProps<"input">, "value" | "onChange" | "type"> & {
  value: number | string | null | undefined;
  /** Dipanggil dengan angka bulat, atau undefined jika kosong. */
  onValueChange: (value: number | undefined) => void;
};

/**
 * Input nominal Rupiah dengan prefiks "Rp" dan pemisah ribuan id-ID.
 * Posisi kursor dipertahankan saat mengedit di tengah angka.
 */
export const RupiahInput = forwardRef<HTMLInputElement, Props>(function RupiahInput({ value, onValueChange, className, ...props }, ref) {
  const innerRef = useRef<HTMLInputElement | null>(null);
  const caretDigits = useRef<number | null>(null);
  const digits = value === null || value === undefined || value === "" ? "" : String(Math.round(Number(value)) || 0).replace(/\D/g, "");
  const display = format(digits);

  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el || caretDigits.current === null || document.activeElement !== el) return;
    let seen = 0;
    let pos = 0;
    while (pos < display.length && seen < caretDigits.current) {
      if (/\d/.test(display[pos]!)) seen += 1;
      pos += 1;
    }
    el.setSelectionRange(pos, pos);
    caretDigits.current = null;
  }, [display]);

  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground" aria-hidden="true">Rp</span>
      <Input
        {...props}
        ref={node => {
          innerRef.current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) ref.current = node;
        }}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        className={cn("pl-9 tabular-nums", className)}
        value={display}
        onChange={event => {
          const el = event.target;
          const before = el.value.slice(0, el.selectionStart ?? el.value.length);
          caretDigits.current = before.replace(/\D/g, "").length;
          const nextDigits = el.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 15);
          onValueChange(nextDigits ? Number(nextDigits) : undefined);
        }}
      />
    </div>
  );
});
