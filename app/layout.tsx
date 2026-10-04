import type { Metadata } from "next";
import { connection } from "next/server";
import { Noto_Sans_Thai, Source_Code_Pro } from "next/font/google";
import { SearchProvider } from "@/components/search/SearchProvider";
import { CommandPalette } from "@/components/search/CommandPalette";
import { MobileNavProvider } from "@/components/layout/MobileNavProvider";
import { ToastProvider } from "@/components/layout/ToastProvider";
import { getAppSettings } from "@/lib/queries/settings";
import "./globals.css";

const THEME_INIT_SCRIPT = `
(function () {
  try {
    var mode = localStorage.getItem("theme") || "system";
    var effective = mode === "system"
      ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : mode;
    document.documentElement.setAttribute("data-theme", effective);
  } catch (e) {}
})();
`;

const thai = Noto_Sans_Thai({
  variable: "--font-noto-sans-thai",
  subsets: ["thai", "latin"],
  display: "swap",
});

const sourceCodePro = Source_Code_Pro({
  variable: "--font-source-code-pro",
  subsets: ["latin"],
});

// A function rather than a static object because the product name is now a
// runtime setting (ROADMAP 7.1) — a `const metadata` would freeze whatever
// name was present when the module was first evaluated.
export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const { appName } = await getAppSettings();
  return {
    title: {
      default: appName,
      template: `%s · ${appName}`,
    },
    description: "ระบบประเมินผลการปฏิบัติงานครู",
  };
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="th"
      className={`${thai.variable} ${sourceCodePro.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <MobileNavProvider>
          <SearchProvider>
            <ToastProvider>
              {children}
              <CommandPalette />
            </ToastProvider>
          </SearchProvider>
        </MobileNavProvider>
      </body>
    </html>
  );
}
