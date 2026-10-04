"use client";

import Link from "next/link";
import { ArrowLeft, X } from "lucide-react";
import { useMobileNav } from "../layout/MobileNavProvider";
import { MobileDrawer } from "../layout/MobileDrawer";
import { SidebarNavLink as NavLink } from "../layout/SidebarNavLink";

/**
 * Sub-navigation for /admin/* (ROADMAP 7.3), built the same way
 * SettingsSidebar is: a typed `active` union whose literals double as the
 * visible labels, passed down from each page rather than derived from
 * usePathname(). There is deliberately no app/admin/layout.tsx — a layout
 * cannot supply that literal, and /account/* sets the same precedent.
 */
export function AdminSidebar({
  active,
}: {
  active: "Branding" | "Announcements" | "Email" | "Feedback" | "Reference data";
}) {
  const { open, setOpen } = useMobileNav();
  const close = () => setOpen(false);

  return (
    <MobileDrawer open={open} onClose={close} widthClassName="w-[255px]">
      <div className="flex h-full w-full flex-col">
        <div className="flex h-12 items-center justify-between border-b border-border px-6">
          <Link
            href="/dashboard"
            onClick={close}
            className="flex items-center gap-2 text-[13px] font-medium text-foreground-muted hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to dashboard
          </Link>
          <button onClick={close} aria-label="Close navigation" className="flex size-7 items-center justify-center rounded-md hover:bg-hover lg:hidden">
            <X className="size-4 text-foreground-muted" />
          </button>
        </div>
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex flex-col py-4">
            <div className="flex flex-col px-3">
              <p className="px-3 font-mono text-[13px] uppercase text-foreground-muted">
                Site Settings
              </p>
              <div className="flex flex-col gap-px pt-2">
                <NavLink label="Branding" href="/admin/branding" active={active === "Branding"} onNavigate={close} />
                <NavLink label="Announcements" href="/admin/announcements" active={active === "Announcements"} onNavigate={close} />
                <NavLink label="ข้อมูลสถานศึกษา สอศ." href="/admin/reference-data" active={active === "Reference data"} onNavigate={close} />
                <NavLink label="Email" href="/admin/email" active={active === "Email"} onNavigate={close} />
              </div>
            </div>
            <div className="mt-4 h-px w-full bg-hover" />
            <div className="flex flex-col px-3 pt-4">
              <p className="px-3 font-mono text-[13px] uppercase text-foreground-muted">
                Submissions
              </p>
              <div className="flex flex-col gap-px pt-2">
                <NavLink label="Feedback" href="/admin/feedback" active={active === "Feedback"} onNavigate={close} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </MobileDrawer>
  );
}
