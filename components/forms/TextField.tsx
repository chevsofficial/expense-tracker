import type { ChangeEvent } from "react";
import { fieldBase, labelBase } from "@/components/ui/formStyles";

type TextFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  error?: string;
  type?: string;
  step?: string | number;
  inputClassName?: string;
};

export function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  error,
  type = "text",
  step,
  inputClassName = "",
}: TextFieldProps) {
  const classes = [fieldBase, inputClassName, error ? "border-error" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <label className="w-full">
      <span className={labelBase}>{label}</span>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        step={step}
        className={classes}
      />
      {error ? <span className="mt-1 text-xs text-error">{error}</span> : null}
    </label>
  );
}
