import type { ChangeEvent } from "react";

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
  return (
    <label className="form-control w-full">
      <span className="label-text mb-1 text-sm font-medium">{label}</span>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        step={step}
        className={`input input-bordered w-full ${inputClassName} ${error ? "input-error" : ""}`}
      />
      {error ? <span className="mt-1 text-xs text-error">{error}</span> : null}
    </label>
  );
}
