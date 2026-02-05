import Link from "next/link";

export default function CheckEmailPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-base-100 text-base-content">
      <div className="card bg-base-100 shadow-xl w-full max-w-md">
        <div className="card-body">
          <h1 className="text-2xl font-bold text-neutral">Check your email</h1>
          <p className="opacity-70 mt-2">
            We sent you a sign-in link. If you don’t see it, check spam or try again.
          </p>

          <Link className="btn btn-outline mt-4" href="/login">
            Back to sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
