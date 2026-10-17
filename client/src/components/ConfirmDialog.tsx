import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createContext, useCallback, useContext, useId, useRef, useState, type ReactNode } from "react";

/**
 * Pengganti window.confirm dan window.prompt: dialog bergaya aplikasi dengan
 * ringkasan konteks, fokus terkunci di dalam dialog, dan tombol berlabel jelas.
 *
 *   const { confirm, promptReason } = useConfirm();
 *   if (!(await confirm({ title: "Hapus foto?", destructive: true }))) return;
 *   const reason = await promptReason({ title: "Tolak dokumen", label: "Alasan", minLength: 5 });
 */

type ConfirmOptions = {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type PromptOptions = ConfirmOptions & {
  label: string;
  placeholder?: string;
  defaultValue?: string;
  minLength?: number;
  maxLength?: number;
  /** Jika false, isian boleh kosong (hasil ""), misalnya alasan opsional. */
  required?: boolean;
};

type Pending =
  | { kind: "confirm"; options: ConfirmOptions; resolve: (value: boolean) => void }
  | { kind: "prompt"; options: PromptOptions; resolve: (value: string | null) => void };

type ConfirmApi = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  promptReason: (options: PromptOptions) => Promise<string | null>;
};

const ConfirmContext = createContext<ConfirmApi | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const [text, setText] = useState("");
  const [touched, setTouched] = useState(false);
  const inputId = useId();
  const resolvedRef = useRef(false);

  const confirm = useCallback((options: ConfirmOptions) => new Promise<boolean>(resolve => {
    resolvedRef.current = false;
    setPending({ kind: "confirm", options, resolve });
  }), []);
  const promptReason = useCallback((options: PromptOptions) => new Promise<string | null>(resolve => {
    resolvedRef.current = false;
    setText(options.defaultValue ?? "");
    setTouched(false);
    setPending({ kind: "prompt", options, resolve });
  }), []);

  const close = (result: boolean | string | null) => {
    if (!pending || resolvedRef.current) return;
    resolvedRef.current = true;
    if (pending.kind === "confirm") pending.resolve(result === true);
    else pending.resolve(typeof result === "string" ? result : null);
    setPending(null);
  };

  const options = pending?.options;
  const prompt = pending?.kind === "prompt" ? pending.options : null;
  const minLength = prompt ? (prompt.required === false ? 0 : prompt.minLength ?? 1) : 0;
  const tooShort = !!prompt && text.trim().length < minLength;
  const submit = () => {
    if (pending?.kind === "prompt") {
      setTouched(true);
      if (tooShort) return;
      close(text.trim());
    } else {
      close(true);
    }
  };

  return (
    <ConfirmContext.Provider value={{ confirm, promptReason }}>
      {children}
      <AlertDialog open={!!pending} onOpenChange={open => { if (!open) close(pending?.kind === "confirm" ? false : null); }}>
        <AlertDialogContent>
          <form onSubmit={event => { event.preventDefault(); submit(); }} className="space-y-4">
            <AlertDialogHeader>
              <AlertDialogTitle>{options?.title}</AlertDialogTitle>
              {options?.description && <AlertDialogDescription asChild><div>{options.description}</div></AlertDialogDescription>}
            </AlertDialogHeader>
            {prompt && (
              <div className="space-y-2">
                <Label htmlFor={inputId}>{prompt.label}{prompt.required === false ? " (opsional)" : ""}</Label>
                <Textarea
                  id={inputId}
                  autoFocus
                  rows={4}
                  value={text}
                  maxLength={prompt.maxLength ?? 2000}
                  placeholder={prompt.placeholder}
                  aria-invalid={touched && tooShort}
                  aria-describedby={`${inputId}-hint`}
                  onChange={event => setText(event.target.value)}
                />
                <p id={`${inputId}-hint`} className={`text-xs ${touched && tooShort ? "text-destructive" : "text-muted-foreground"}`}>
                  {minLength > 1 ? `Minimal ${minLength} karakter. ` : ""}{text.trim().length}/{prompt.maxLength ?? 2000}
                </p>
              </div>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel type="button">{options?.cancelLabel ?? "Batal"}</AlertDialogCancel>
              <Button type="submit" variant={options?.destructive ? "destructive" : "default"} autoFocus={!prompt}>
                {options?.confirmLabel ?? "Lanjutkan"}
              </Button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmApi {
  const api = useContext(ConfirmContext);
  if (!api) throw new Error("useConfirm harus dipakai di dalam ConfirmProvider");
  return api;
}
