import { SettingsSideNav } from "@/components/settings/SettingsSideNav";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-6">
      <aside className="w-64 shrink-0">
        <div className="sticky top-4">
          <div className="card bg-base-200 border border-base-300">
            <div className="card-body p-3">
              <h2 className="font-semibold px-2 py-1">Settings</h2>
              <SettingsSideNav />
            </div>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
