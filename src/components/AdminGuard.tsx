import { Link, Navigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { useLang } from "@/lib/i18n";

/** Client-side gate. Real protection is RLS: only admins can write. */
export function AdminGuard({ children }: { children: ReactNode }) {
  const { adminLoading, isAdmin } = useAuth();

  if (adminLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
}

const TABS = [
  { to: "/admin", th: "การจอง", en: "Reservations" },
  { to: "/admin/tables", th: "โต๊ะ", en: "Tables" },
  { to: "/admin/menu", th: "เมนู", en: "Menu" },
  { to: "/admin/restaurant", th: "ข้อมูลร้าน", en: "Restaurant" },
] as const;

export function AdminTabs() {
  const { lang } = useLang();
  return (
    <nav className="flex flex-wrap gap-2">
      {TABS.map((tab) => (
        <Link
          key={tab.to}
          to={tab.to}
          activeOptions={{ exact: tab.to === "/admin" }}
          className="rounded-full border border-border/70 px-4 py-2 text-sm font-sans text-muted-foreground transition hover:text-primary data-[status=active]:border-primary data-[status=active]:bg-primary data-[status=active]:text-primary-foreground"
        >
          {lang === "th" ? tab.th : tab.en}
        </Link>
      ))}
    </nav>
  );
}
