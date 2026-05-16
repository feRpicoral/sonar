import { SettingsNav } from "@/components/app-shell/settings-nav";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-8 py-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        </header>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[180px_1fr]">
          <SettingsNav />
          <div className="min-w-0">{children}</div>
        </div>
      </div>
    </div>
  );
}
