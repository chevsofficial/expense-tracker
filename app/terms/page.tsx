import { CHIP_CLASS_NO_PADDING } from "@/components/ui/uiClasses";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-base-100 text-base-content">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className={CHIP_CLASS_NO_PADDING}>
          <div className="card-body prose max-w-none">
            <h1 className="page-title">Terms of Use</h1>
            <p>Placeholder terms. Replace with final legal text.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
