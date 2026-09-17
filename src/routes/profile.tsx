import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { NavBar } from "@/components/NavBar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "โปรไฟล์ · My Profile — Riverside Kitchen" },
      { name: "description", content: "Manage your Riverside Kitchen member profile: name, phone and email." },
      { property: "og:title", content: "My Profile — Riverside Kitchen" },
      { property: "og:description", content: "Manage your member profile details." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { lang } = useLang();
  const { user, profile, loading, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
    setPhone(profile?.phone ?? "");
  }, [profile]);

  const save = async () => {
    if (!user) return;
    if (fullName.trim().length < 2) {
      toast.error(lang === "th" ? "กรุณากรอกชื่อ-นามสกุล" : "Please enter your full name");
      return;
    }
    if (phone.replace(/\D/g, "").length < 9) {
      toast.error(lang === "th" ? "เบอร์โทรไม่ถูกต้อง" : "Invalid phone number");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        full_name: fullName.trim(),
        phone: phone.trim(),
        email: user.email ?? null,
      })
      .select()
      .single();
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    await refreshProfile();
    toast.success(lang === "th" ? "บันทึกข้อมูลแล้ว" : "Profile saved");
  };

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <main className="mx-auto max-w-2xl px-4 sm:px-6 py-12 sm:py-16">
        <h1 className="font-display text-4xl text-foreground">
          {lang === "th" ? "โปรไฟล์สมาชิก" : "Member Profile"}
        </h1>
        <div className="mt-3 h-px w-24 gold-divider" />

        {loading ? (
          <Card className="mt-8 p-8">
            <div className="space-y-4">
              <div className="h-5 w-1/3 animate-pulse rounded bg-muted" />
              <div className="h-11 animate-pulse rounded bg-muted" />
              <div className="h-11 animate-pulse rounded bg-muted" />
            </div>
          </Card>
        ) : !user ? (
          <Card className="mt-8 p-10 text-center space-y-4">
            <p className="text-muted-foreground">
              {lang === "th"
                ? "กรุณาเข้าสู่ระบบเพื่อดูและแก้ไขโปรไฟล์ของคุณ"
                : "Please sign in to view and edit your profile."}
            </p>
            <Button asChild className="bg-gradient-gold text-primary border-0 shadow-gold">
              <Link to="/login">{lang === "th" ? "เข้าสู่ระบบ" : "Sign in"}</Link>
            </Button>
          </Card>
        ) : (
          <Card className="mt-8 p-6 sm:p-8 space-y-5 shadow-elegant">
            <div className="space-y-1.5">
              <Label htmlFor="fullName">{lang === "th" ? "ชื่อ - นามสกุล" : "Full name"}</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={80} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">{lang === "th" ? "เบอร์โทรศัพท์" : "Phone"}</Label>
              <Input id="phone" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">{lang === "th" ? "อีเมล" : "Email"}</Label>
              <Input id="email" value={profile?.email ?? user.email ?? ""} readOnly disabled />
              <p className="text-xs text-muted-foreground">
                {lang === "th" ? "อีเมลใช้สำหรับเข้าสู่ระบบ จึงแก้ไขไม่ได้" : "Email is your sign-in ID and cannot be changed."}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <Button onClick={save} disabled={busy} className="bg-gradient-gold text-primary border-0 shadow-gold">
                {busy ? "..." : lang === "th" ? "บันทึกข้อมูล" : "Save changes"}
              </Button>
              <Button asChild variant="outline">
                <Link to="/history">{lang === "th" ? "ประวัติการจอง" : "Booking history"}</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link to="/home">{lang === "th" ? "← กลับหน้าหลัก" : "← Back home"}</Link>
              </Button>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
