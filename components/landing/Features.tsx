import { Reveal, stagger } from "./motion";
const features = [
  ["🏷️", "Smart Categories", "Organize spending with flexible categories that match your life."],
  ["📅", "Monthly Budgets", "Set monthly targets and track progress in real-time."],
  ["🔁", "Recurring Expenses", "Keep subscriptions and repeated bills visible automatically."],
  ["📊", "Insights", "Understand where your money goes with clear breakdowns."],
  ["🌍", "Multi-currency", "Track accounts and transactions across different currencies."],
  ["📄", "CSV Import", "Bring historical transactions in quickly when getting started."],
] as const;

export function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-4 py-16 md:py-24">
      <Reveal><h2 className="text-3xl font-semibold tracking-tight md:text-5xl">Everything you need to track spending clearly</h2></Reveal>
      <Reveal delay={stagger.fast}><p className="mt-4 max-w-3xl text-lg text-base-content/70">From quick entries to monthly planning, Spendary keeps your finances easy to read and easy to maintain.</p></Reveal>
      <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {features.map(([icon, title, description], index) => (
          <Reveal key={title} delay={index * stagger.fast}><article className="rounded-2xl border border-base-300 bg-base-100 p-5 transition duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg">
            <p className="text-2xl" aria-hidden>{icon}</p>
            <h3 className="mt-3 text-xl font-semibold">{title}</h3>
            <p className="mt-2 text-base-content/70">{description}</p>
          </article></Reveal>
        ))}
      </div>
    </section>
  );
}
