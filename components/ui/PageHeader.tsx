export function PageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string | null;
}) {
  return (
    <div>
      <h1 className="text-3xl font-bold text-neutral">{title}</h1>
      {subtitle ? <p className="mt-2 opacity-70">{subtitle}</p> : null}
    </div>
  );
}
