/** Card shell shared by the sign-in and sign-up forms. */
export function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-full flex-col gap-6 rounded-lg border border-border bg-surface p-6 shadow-sm">
      {children}
    </div>
  );
}

export function AuthHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="font-display text-lg font-semibold text-foreground">
        {title}
      </h1>
      <p className="text-[13px] font-medium text-foreground-secondary">{description}</p>
    </div>
  );
}

export function Field({
  label,
  name,
  type = "text",
  autoComplete,
  placeholder,
  required = true,
  defaultValue,
  value,
  onChange,
  /**
   * Marks the field as the one at fault — red border and `aria-invalid`. The
   * message itself is announced by a toast, so it is deliberately not
   * rendered here; the highlight is what says *which* of four inputs to fix.
   */
  error,
  inputMode,
  maxLength,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  maxLength?: number;
}) {
  return (
    <div className="flex w-full flex-col gap-1.5">
      <label
        htmlFor={name}
        className="text-[13px] font-medium text-foreground"
      >
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        required={required}
        defaultValue={onChange ? undefined : defaultValue}
        value={onChange ? value : undefined}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        inputMode={inputMode}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        className={`min-h-11 w-full rounded-md border bg-hover px-3 text-[13px] font-medium text-foreground outline-none focus:border-border-emphasis ${
          error ? "border-danger/60" : "border-border-strong"
        }`}
      />
    </div>
  );
}

export function SubmitButton({
  children,
  pending,
}: {
  children: React.ReactNode;
  pending: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex min-h-11 w-full items-center justify-center rounded-md border border-brand bg-brand px-2.5 text-[13px] font-medium text-brand-contrast hover:bg-brand-hover disabled:opacity-60"
    >
      {children}
    </button>
  );
}

export function OrDivider() {
  return (
    <div className="flex w-full items-center gap-3">
      <span className="h-px flex-1 bg-hover" />
      <span className="text-xs font-medium text-foreground-muted">หรือ</span>
      <span className="h-px flex-1 bg-hover" />
    </div>
  );
}
