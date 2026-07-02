import { SettingsNav } from "@/components/app-shell/settings-nav";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="bg-background sticky top-0 z-10 flex h-14 items-center border-b px-6">
        <h1 className="text-[15px] font-semibold">Settings</h1>
      </header>
      <SettingsNav />
      <div className="mx-auto w-full max-w-4xl px-6 py-7">{children}</div>
    </div>
  );
}
