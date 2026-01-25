import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/src/server/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-base-200">
      <header className="border-b bg-base-100">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="text-lg font-semibold">Expense Tracker</div>
          <nav className="flex items-center gap-4">
            <Link className="btn btn-ghost btn-sm" href="/app/dashboard">
              Dashboard
            </Link>
            <Link className="btn btn-ghost btn-sm" href="/app/settings/categories">
              Categories
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl px-6 py-6">{children}</main>
    </div>
  );
}
