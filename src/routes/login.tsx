import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Phone, UtensilsCrossed, CheckCircle2, ArrowRight, UserPlus, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import heroImg from "@/assets/hero-riverside.jpg";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Login — Riverside Kitchen" },
      { name: "description", content: "Sign in to Riverside Kitchen to manage reservations and unlock member benefits." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 9) {
      toast.error("Please enter a valid phone number / กรุณากรอกเบอร์โทรให้ถูกต้อง");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success("Welcome back! / ยินดีต้อนรับกลับ");
      navigate({ to: "/" });
    }, 600);
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center scale-105"
        style={{ backgroundImage: `url(${heroImg})`, filter: "blur(6px)" }}
        aria-hidden
      />
      <div className="absolute inset-0 bg-gradient-to-b from-primary/70 via-primary/60 to-primary/85" aria-hidden />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_oklch(0.74_0.13_80_/_0.25),transparent_60%)]" aria-hidden />

      {/* Top brand bar */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5 md:px-10">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-gold shadow-gold">
            <UtensilsCrossed className="h-5 w-5 text-primary" />
          </div>
          <div className="leading-tight">
            <div className="font-display text-lg text-white tracking-wide">Riverside Kitchen</div>
            <div className="text-[11px] text-gold/90 tracking-[0.18em] uppercase">ครัวริมบึง</div>
          </div>
        </Link>
        <Link
          to="/"
          className="hidden md:inline-flex items-center gap-1.5 text-sm text-white/85 hover:text-gold transition-colors"
        >
          ← Back to home
        </Link>
      </header>

      {/* Main */}
      <main className="relative z-10 flex flex-col items-center justify-center px-4 pb-16 pt-4 md:pt-10">
        <p className="mb-6 max-w-xl text-center font-display italic text-gold/90 text-sm md:text-base tracking-wide animate-fade-in">
          “Experience authentic Thai cuisine by the lakeside.”
        </p>

        <div className="w-full max-w-md animate-fade-up">
          <div className="glass rounded-2xl bg-white/95 p-7 md:p-9 shadow-elegant border border-white/60">
            {/* Header */}
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-gold shadow-gold">
                <UtensilsCrossed className="h-7 w-7 text-primary" />
              </div>
              <h1 className="font-display text-3xl md:text-4xl text-primary">Welcome Back</h1>
              <p className="mt-1 font-thai text-lg text-primary/80">ยินดีต้อนรับกลับ</p>
              <div className="mx-auto my-4 h-px w-20 gold-divider" />
              <p className="text-sm text-muted-foreground leading-relaxed">
                Sign in to manage your reservations and enjoy member benefits.
              </p>
              <p className="mt-1 font-thai text-sm text-muted-foreground leading-relaxed">
                เข้าสู่ระบบเพื่อจัดการการจองและรับสิทธิพิเศษสำหรับสมาชิก
              </p>
            </div>

            {/* Form */}
            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="phone" className="block text-xs font-semibold uppercase tracking-wider text-primary/70 mb-2">
                  Phone Number · เบอร์โทรศัพท์
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gold" />
                  <Input
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="Enter your phone number / กรอกเบอร์โทรศัพท์"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-12 pl-10 rounded-xl border-2 border-input bg-white text-base tabular-nums focus-visible:ring-gold focus-visible:border-gold transition-colors"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl bg-gradient-luxury text-white font-semibold tracking-wide shadow-elegant hover:shadow-gold hover:-translate-y-0.5 transition-all"
              >
                {loading ? "Signing in..." : "Login · เข้าสู่ระบบ"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>

            {/* Divider */}
            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs font-semibold tracking-[0.2em] text-muted-foreground">OR</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {/* Register */}
            <div className="rounded-xl bg-secondary/60 p-4 border border-gold/20">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-primary">Don't have an account?</p>
                  <p className="font-thai text-sm text-primary/80">ยังไม่มีสมาชิก?</p>
                </div>
                <Button
                  asChild
                  size="sm"
                  className="shrink-0 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Link to="/register">
                    <UserPlus className="h-4 w-4" />
                    Register
                  </Link>
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                Register once to save your reservation history and receive exclusive promotions.
              </p>
              <p className="font-thai text-xs text-muted-foreground leading-relaxed">
                สมัครสมาชิกเพียงครั้งเดียว เพื่อบันทึกประวัติการจองและรับสิทธิพิเศษจากร้าน
              </p>
            </div>

            {/* Guest */}
            <div className="mt-4">
              <Button
                asChild
                variant="outline"
                className="w-full h-12 rounded-xl bg-white text-primary border-2 border-gold hover:bg-gold hover:text-primary hover:shadow-gold transition-all"
              >
                <Link to="/reservation">
                  <User className="h-4 w-4" />
                  Continue as Guest · ดำเนินการต่อโดยไม่สมัครสมาชิก
                </Link>
              </Button>
              <p className="mt-2 text-xs text-center text-muted-foreground leading-relaxed">
                You can reserve a table without creating an account, but reservation history will not be saved.
              </p>
              <p className="font-thai text-xs text-center text-muted-foreground leading-relaxed">
                สามารถจองโต๊ะได้โดยไม่ต้องสมัครสมาชิก แต่ระบบจะไม่บันทึกประวัติการจอง
              </p>
            </div>
          </div>

          {/* Feature badges */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {[
              { en: "Easy Reservation", th: "จองง่าย" },
              { en: "Reservation History", th: "ประวัติการจอง" },
              { en: "Exclusive Member Benefits", th: "สิทธิพิเศษสมาชิก" },
            ].map((f) => (
              <div
                key={f.en}
                className="glass-dark inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-white/95"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-gold" />
                <span className="font-medium">{f.en}</span>
                <span className="font-thai text-white/70">· {f.th}</span>
              </div>
            ))}
          </div>

          <p className="mt-6 text-center text-xs text-white/70">
            © {new Date().getFullYear()} Riverside Kitchen · ครัวริมบึง
          </p>
        </div>
      </main>
    </div>
  );
}
