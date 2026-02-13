"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await signIn("email", { email, callbackUrl: "/app" });
    setLoading(false);
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-base-100 text-base-content">
      <div className="card bg-base-100 shadow-xl w-full max-w-md">
        <div className="card-body">
          <h1 className="page-title text-2xl">Sign in</h1>
          <p className="opacity-70">We’ll email you a magic link.</p>

          <form className="mt-4 space-y-3" onSubmit={onSubmit}>
            <input
              className="input input-bordered w-full"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <button className="btn btn-primary w-full" disabled={loading}>
              {loading ? "Sending..." : "Send magic link"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
