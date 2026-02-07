export default function AboutSettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">About</h1>

      <div className="card bg-base-200 border border-base-300">
        <div className="card-body space-y-3">
          <h2 className="font-semibold">Help</h2>
          <a className="btn btn-outline w-fit" href="#" target="_blank" rel="noreferrer">
            Browse Help Articles
          </a>
        </div>
      </div>

      <div className="card bg-base-200 border border-base-300">
        <div className="card-body space-y-3">
          <h2 className="font-semibold">Contact Us</h2>
          <a
            className="btn btn-primary w-fit"
            href="mailto:support@spendary.app?subject=Spendary%20Support"
          >
            Email support@spendary.app
          </a>
        </div>
      </div>

      <div className="card bg-base-200 border border-base-300">
        <div className="card-body space-y-3">
          <h2 className="font-semibold">Legal</h2>
          <div className="flex flex-wrap gap-2">
            <a className="btn btn-outline btn-sm" href="/terms">
              Terms of Use
            </a>
            <a className="btn btn-outline btn-sm" href="/privacy">
              Privacy Policy
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
