import { AppLogo } from "@/components/dashboard/AppLogo";
import { institutionName } from "@/lib/app-config";
import { getAppSettings } from "@/lib/queries/settings";

export default async function AuthLayout({ children }: LayoutProps<"/">) {
  const { logoUrl, appName } = await getAppSettings();

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background px-4 py-12">
      <div className="flex w-full max-w-[440px] flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <AppLogo className="size-10" src={logoUrl} />
          <p className="text-lg font-semibold text-brand">{institutionName}</p>
          <span className="h-0.5 w-12 bg-accent" aria-hidden="true" />
          <p className="text-sm font-medium text-foreground-secondary">{appName}</p>
        </div>
        {children}
      </div>
    </div>
  );
}
