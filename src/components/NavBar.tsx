import { Link, useNavigate } from "@tanstack/react-router";
import { useLang, type Lang } from "@/lib/i18n";
import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export function NavBar() {
  const { lang, setLang, t } = useLang();
  const { user, profile, isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    setOpen(false);
    await qc.cancelQueries();
    qc.clear();
    await signOut();
    navigate({ to: "/login", replace: true });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 glass">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">

        {/* Logo */}
        <Link to="/home" className="flex items-center gap-2 min-w-0">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground font-display text-lg">
            R
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-display text-base sm:text-lg leading-tight truncate">
              {t("brand")}
            </span>
            <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground truncate">
              {t("tagline")}
            </span>
          </div>
        </Link>

        {/* Menu */}
        <nav className="flex items-center gap-3">
          <Link to="/home" className="hidden sm:inline-flex px-3 py-2 text-sm hover:text-primary transition">
            {t("navBook")}
          </Link>

          <Link to="/menu" className="hidden sm:inline-flex px-3 py-2 text-sm hover:text-primary transition">
            {t("navMenu")}
          </Link>

          {isAdmin && (
            <Link to="/admin" className="hidden sm:inline-flex px-3 py-2 text-sm hover:text-primary transition">
              {t("navAdmin")}
            </Link>
          )}

          <LangSwitcher lang={lang} setLang={setLang} />

          {/* Account */}
          {loading ? (
            <div className="h-9 w-24 animate-pulse rounded-full bg-muted" />
          ) : !user ? (
            <Button asChild size="sm" className="rounded-full bg-gradient-gold text-primary border-0 shadow-gold">
              <Link to="/login">{lang === "th" ? "เข้าสู่ระบบ" : "Sign in"}</Link>
            </Button>
          ) : (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setOpen(!open)}
                className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm hover:border-gold transition"
              >
                <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                  {(profile?.full_name ?? profile?.email ?? "?").trim().charAt(0).toUpperCase()}
                </span>
                <span className="max-w-[9rem] truncate">
                  {lang === "th" ? "บัญชีของฉัน" : "My Account"}
                </span>
              </button>

              {open && (
                <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-card p-1.5 shadow-elegant">
                  <div className="px-3 py-2">
                    <div className="truncate text-sm font-medium">
                      {profile?.full_name ?? (lang === "th" ? "สมาชิก" : "Member")}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">{profile?.email ?? user.email}</div>
                  </div>

                  <hr className="my-1 border-border" />

                  <Link
                    to="/profile"
                    className="block rounded-lg px-3 py-2 text-sm hover:bg-muted transition"
                    onClick={() => setOpen(false)}
                  >
                    {lang === "th" ? "โปรไฟล์" : "Profile"}
                  </Link>

                  <Link
                    to="/history"
                    className="block rounded-lg px-3 py-2 text-sm hover:bg-muted transition"
                    onClick={() => setOpen(false)}
                  >
                    {lang === "th" ? "ประวัติการจอง" : "Booking history"}
                  </Link>

                  {isAdmin && (
                    <Link
                      to="/admin"
                      className="block rounded-lg px-3 py-2 text-sm hover:bg-muted transition sm:hidden"
                      onClick={() => setOpen(false)}
                    >
                      {t("navAdmin")}
                    </Link>
                  )}

                  <hr className="my-1 border-border" />

                  <button
                    onClick={handleSignOut}
                    className="block w-full rounded-lg px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10 transition"
                  >
                    {lang === "th" ? "ออกจากระบบ" : "Sign out"}
                  </button>
                </div>
              )}
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}

function LangSwitcher({
  lang,
  setLang,
}: {
  lang: Lang;
  setLang: (l: Lang) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-full border border-border bg-card p-0.5 shadow-soft">
      <button
        onClick={() => setLang("th")}
        className={`px-3 py-1 text-xs font-semibold rounded-full transition ${
          lang === "th"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        TH
      </button>

      <button
        onClick={() => setLang("en")}
        className={`px-3 py-1 text-xs font-semibold rounded-full transition ${
          lang === "en"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        EN
      </button>
    </div>
  );
}
