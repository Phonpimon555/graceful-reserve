import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import heroImg from "@/assets/hero-riverside.jpg";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "เข้าสู่ระบบ · Sign in — Riverside Kitchen" },
      { name: "description", content: "Sign in to Riverside Kitchen to book a table and view your reservation history." },
      { property: "og:title", content: "Sign in — Riverside Kitchen" },
      { property: "og:description", content: "Sign in to book a table and view your reservation history." },
    ],
  }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) { toast.error("กรุณากรอกอีเมลให้ถูกต้อง"); return; }
    if (password.length < 6) { toast.error("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"); return; }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) {
      toast.error(
        error.message.toLowerCase().includes("invalid")
          ? "อีเมลหรือรหัสผ่านไม่ถูกต้อง"
          : error.message,
      );
      return;
    }
    toast.success("เข้าสู่ระบบสำเร็จ");
    navigate({ to: "/home" });
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <img src={heroImg} alt="Riverside Kitchen" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div className="relative flex items-center justify-center min-h-screen px-5 py-10">
        <form
          onSubmit={submit}
          className="w-full max-w-md rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl p-8 animate-fade-up"
        >
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center mx-auto text-4xl shadow-lg">
              🍽️
            </div>
            <h1 className="mt-5 font-display text-4xl font-bold text-white">ครัวริมบึง</h1>
            <p className="text-yellow-300 tracking-[4px] uppercase text-sm">Riverside Kitchen</p>
            <p className="text-gray-300 mt-4 text-sm">
              เข้าสู่ระบบเพื่อจองโต๊ะและดูประวัติการจอง
              <br />
              <span className="text-gray-400">Sign in to book a table and view your history</span>
            </p>
          </div>

          <label className="block text-sm text-white/80 mb-1.5">อีเมล · Email</label>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-xl bg-white/20 border border-white/30 text-white placeholder:text-gray-300 px-4 py-3.5 outline-none focus:border-yellow-400 mb-4"
          />

          <label className="block text-sm text-white/80 mb-1.5">รหัสผ่าน · Password</label>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-xl bg-white/20 border border-white/30 text-white placeholder:text-gray-300 px-4 py-3.5 outline-none focus:border-yellow-400 mb-5"
          />

          <button
            type="submit"
            disabled={busy}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold transition hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ · Sign in"}
          </button>

          <div className="flex items-center my-6">
            <div className="flex-1 h-px bg-white/20" />
            <span className="px-4 text-gray-300 text-sm">หรือ · or</span>
            <div className="flex-1 h-px bg-white/20" />
          </div>

          <Link
            to="/register"
            className="block text-center w-full py-4 rounded-xl border border-yellow-400 text-yellow-300 font-semibold hover:bg-yellow-500 hover:text-black transition mb-3"
          >
            สมัครสมาชิก · Create account
          </Link>

          <Link
            to="/home"
            className="block text-center w-full py-3 text-sm text-gray-300 hover:text-white transition"
          >
            จองในฐานะผู้ใช้ทั่วไป · Continue as guest
          </Link>
        </form>
      </div>
    </div>
  );
}
