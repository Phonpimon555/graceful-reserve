import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Loader2, ShieldAlert } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/** Client-side gate. Real protection is RLS: only admins can write. */
export function AdminGuard({ children }: { children: ReactNode }) {
  const { loading, user, isAdmin } = useAuth();
  const { lang } = useLang();

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4">
        <Card className="max-w-md w-full p-8 text-center border-border/60 shadow-soft">
          <ShieldAlert className="mx-auto h-8 w-8 text-destructive" />
          <h2 className="mt-4 font-display text-2xl text-primary">
            {lang === "th" ? "ไม่มีสิทธิ์เข้าถึง" : "Access denied"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {lang === "th"
              ? "หน้านี้สำหรับผู้ดูแลระบบเท่านั้น กรุณาเข้าสู่ระบบด้วยบัญชีผู้ดูแล"
              : "This area is for administrators only. Please sign in with an admin account."}
          </p>
          <Button asChild className="mt-6 rounded-full">
            <Link to="/admin/login">
              {lang === "th" ? "เข้าสู่ระบบผู้ดูแล" : "Admin sign in"}
            </Link>
          </Button>
        </Card>
      </div>
    );
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
