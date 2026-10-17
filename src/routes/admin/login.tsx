import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { verifyAdminAccess } from "@/lib/admin-auth";
import { useLang } from "@/lib/i18n";
import { NavBar } from "@/components/NavBar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/login")({
  head: () => ({
    meta: [
      { title: "Admin Sign In · Riverside Kitchen" },
      { name: "description", content: "Administrator sign in for Riverside Kitchen restaurant management." },
      { property: "og:title", content: "Admin Sign In · Riverside Kitchen" },
      { property: "og:description", content: "Administrator sign in for Riverside Kitchen restaurant management." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const { lang } = useLang();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const inFlight = useRef(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setErrorMessage("");
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error || !data.user) {
        setErrorMessage(lang === "th" ? "เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบอีเมลและรหัสผ่าน" : "Sign in failed. Please check your email and password.");
        return;
      }
      if (!(await verifyAdminAccess())) {
        await supabase.auth.signOut();
        setErrorMessage(lang === "th" ? "ไม่สามารถเข้าสู่หน้าผู้ดูแลด้วยบัญชีนี้ได้" : "This account cannot access administrator pages.");
        return;
      }
      setPassword("");
      toast.success(lang === "th" ? "เข้าสู่ระบบผู้ดูแลแล้ว" : "Signed in as admin");
      await navigate({ to: "/admin", replace: true });
    } catch {
      setErrorMessage(lang === "th" ? "ไม่สามารถเชื่อมต่อระบบได้ กรุณาลองใหม่อีกครั้ง" : "Unable to connect. Please try again.");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <section className="mx-auto flex max-w-md flex-col px-4 py-16 sm:py-24">
        <Card className="p-8 border-border/60 shadow-elegant">
          <div className="text-center">
            <ShieldCheck className="mx-auto h-8 w-8 text-gold" />
            <h1 className="mt-3 font-display text-3xl text-primary">
              {lang === "th" ? "เข้าสู่ระบบผู้ดูแล" : "Admin Sign In"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {lang === "th"
                ? "ใช้อีเมลและรหัสผ่านของบัญชีผู้ดูแลระบบ"
                : "Use the email and password of an administrator account."}
            </p>
          </div>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-email">{lang === "th" ? "อีเมล" : "Email"}</Label>
              <Input
                id="admin-email" type="email" required autoComplete="email"
                value={email} onChange={(e) => setEmail(e.target.value)}
                className="font-sans"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password">{lang === "th" ? "รหัสผ่าน" : "Password"}</Label>
              <Input
                id="admin-password" type="password" required autoComplete="current-password"
                value={password} onChange={(e) => setPassword(e.target.value)}
                className="font-sans"
              />
            </div>
            <Button type="submit" disabled={busy} className="w-full rounded-full">
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {lang === "th" ? "เข้าสู่ระบบ" : "Login"}
            </Button>
            {errorMessage && <p role="alert" className="text-sm text-destructive">{errorMessage}</p>}
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <Link to="/login" className="hover:text-primary underline underline-offset-4">
              {lang === "th" ? "เข้าสู่ระบบสำหรับลูกค้า" : "Customer sign in"}
            </Link>
          </div>
        </Card>
      </section>
    </div>
  );
}
