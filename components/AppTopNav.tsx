import Link from "next/link";

export function AppTopNav({
  appName,
  rightSlot,
}: {
  appName: string;
  rightSlot?: React.ReactNode;
}) {
  return (
    <div className="navbar border-b border-base-200 bg-base-100">
      <div className="flex-1">
        <Link href="/app/dashboard" className="btn btn-ghost text-xl">
          {appName}
        </Link>
      </div>
      <div className="flex-none gap-2">{rightSlot}</div>
    </div>
  );
}
