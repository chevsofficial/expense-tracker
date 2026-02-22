const items = [
  ["Is Spendary free?", "Yes. Spendary offers a free plan for personal expense tracking."],
  ["Can I customize categories?", "Yes, you can create and organize categories to match your routine."],
  ["Does budgeting restrict transactions?", "No. Budgeting in Spendary is informative, helping you plan without blocking spending."],
  ["Do you support multiple currencies?", "Yes. Spendary is designed for multi-currency tracking."],
] as const;

export function FAQ() {
  return (
    <section id="faq" className="mx-auto max-w-6xl px-4 py-16 md:py-24">
      <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">Frequently asked questions</h2>
      <div className="mt-8 space-y-3">
        {items.map(([question, answer]) => (
          <div key={question} className="collapse-arrow collapse border border-base-300 bg-base-200">
            <input type="checkbox" />
            <div className="collapse-title text-lg font-medium">{question}</div>
            <div className="collapse-content text-[var(--color-muted)]">{answer}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
