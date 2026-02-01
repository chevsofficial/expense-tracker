"use client";

type ProgressBarProps = {
  value: number;
};

export function ProgressBar({ value }: ProgressBarProps) {
  const clamped = Math.min(Math.max(value, 0), 1);
  return (
    <div className="flex items-center gap-2">
      <progress className="progress progress-primary w-full" value={clamped} max={1} />
    </div>
  );
}
