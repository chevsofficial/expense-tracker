type SubmitButtonProps = {
  isLoading?: boolean;
  children: string;
  className?: string;
  type?: "button" | "submit" | "reset";
  onClick?: () => void;
};

export function SubmitButton({
  isLoading = false,
  children,
  className,
  type = "submit",
  onClick,
}: SubmitButtonProps) {
  return (
    <button
      type={type}
      className={`btn btn-primary ${isLoading ? "btn-disabled" : ""} ${className ?? ""}`}
      disabled={isLoading}
      onClick={onClick}
    >
      {isLoading ? <span className="loading loading-spinner"></span> : null}
      {children}
    </button>
  );
}
