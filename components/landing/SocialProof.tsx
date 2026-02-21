export function SocialProof() {
  return (
    <section className="border-y border-base-300 bg-base-200/50">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-7 text-center md:flex-row md:justify-between md:text-left">
        <p className="font-semibold text-base-content">Built for mindful budgeting</p>
        <ul className="flex flex-wrap items-center justify-center gap-2 text-sm md:justify-end">
          <li className="sp-badge px-3 py-1">Fast entry</li>
          <li className="sp-badge px-3 py-1">Clean categories</li>
          <li className="sp-badge px-3 py-1">Multi-currency ready</li>
        </ul>
      </div>
    </section>
  );
}
