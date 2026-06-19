import { Link } from "@tanstack/react-router";
import { useLang, type Lang } from "@/lib/i18n";

export function NavBar() {
  const { lang, setLang, t } = useLang();
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 glass">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 min-w-0">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground font-display text-lg">
            R
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-display text-base sm:text-lg leading-tight truncate">{t("brand")}</span>
            <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground truncate">{t("tagline")}</span>
          </div>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          <Link to="/" className="hidden sm:inline-flex px-3 py-1.5 text-sm font-medium hover:text-primary transition">
            {t("navBook")}
          </Link>
          <Link to="/menu" className="hidden sm:inline-flex px-3 py-1.5 text-sm font-medium hover:text-primary transition">
            {t("navMenu")}
          </Link>
          <Link to="/admin" className="hidden sm:inline-flex px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-primary transition">
            {t("navAdmin")}
          </Link>
          <LangSwitcher lang={lang} setLang={setLang} />
        </nav>
      </div>
    </header>
  );
}

function LangSwitcher({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <div className="inline-flex items-center rounded-full border border-border bg-card p-0.5 shadow-soft">
      <button
        onClick={() => setLang("th")}
        className={`px-3 py-1 text-xs font-semibold rounded-full transition ${lang === "th" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
        aria-pressed={lang === "th"}
      >TH</button>
      <button
        onClick={() => setLang("en")}
        className={`px-3 py-1 text-xs font-semibold rounded-full transition ${lang === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
        aria-pressed={lang === "en"}
      >EN</button>
    </div>
  );
}
