import { Link } from "@tanstack/react-router";
import { useLang, type Lang } from "@/lib/i18n";
import { useState, useEffect, useRef } from "react";

export function NavBar() {
  const { lang, setLang, t } = useLang();

  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

          <Link
            to="/home"
            className="hidden sm:inline-flex px-3 py-2 text-sm hover:text-primary transition"
          >
            {t("navBook")}
          </Link>

          <Link
            to="/menu"
            className="hidden sm:inline-flex px-3 py-2 text-sm hover:text-primary transition"
          >
            {t("navMenu")}
          </Link>

          <Link
            to="/admin"
            className="hidden sm:inline-flex px-3 py-2 text-sm hover:text-primary transition"
          >
            {t("navAdmin")}
          </Link>

          <LangSwitcher
            lang={lang}
            setLang={setLang}
          />

          {/* Profile */}

          <div className="relative" ref={menuRef}>

            <button
              onClick={() => setOpen(!open)}
              className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm"
            > 
               บัญชีของฉัน ▼
            </button>

            {open && (
              <div className="absolute right-0 mt-2 w-48 rounded-xl border border-gray-100 bg-white p-2 shadow-xl ring-1 ring-black/5 backdrop-blur-md">

                <button
                  className="flex w-full items-center px-4 py-2.5 text-sm text-gray-700 rounded-lg hover:bg-amber-50 hover:text-amber-700 transition-colors"
                >
                   โปรไฟล์
                  <span className="text-xs">▼</span>
                </button>

                <Link
                  to="/history"
                  className="block px-5 py-3 hover:bg-gray-100 transition"
                  onClick={() => setOpen(false)}
                >
                   ประวัติการจอง
                </Link>

                <hr />

                <Link
                  to="/login"
                  className="block px-5 py-3 text-red-500 hover:bg-red-50 transition"
                  onClick={() => setOpen(false)}
                >
                   ออกจากระบบ
                </Link>

              </div>
            )}

          </div>

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
