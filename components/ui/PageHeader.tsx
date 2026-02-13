export function PageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string | null;
}) {
  return (
    <div>
      <h1 className="page-title">{title}</h1>
      {subtitle ? <p className="body-text mt-2 opacity-70">{subtitle}</p> : null}
    </div>
  );
}
