import { createFileRoute, Link } from "@tanstack/react-router";
import { UtensilsCrossed, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Register — Riverside Kitchen" },
      { name: "description", content: "Create a Riverside Kitchen account to save reservation history and unlock member benefits." },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center bg-white/90 glass rounded-2xl p-10 shadow-elegant border border-gold/20 animate-fade-up">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-gold shadow-gold">
          <UtensilsCrossed className="h-7 w-7 text-primary" />
        </div>
        <h1 className="font-display text-3xl text-primary">Register</h1>
        <p className="font-thai text-lg text-primary/80 mt-1">สมัครสมาชิก</p>
        <div className="mx-auto my-4 h-px w-20 gold-divider" />
        <p className="text-sm text-muted-foreground">
          Member registration is coming soon. For now, please continue as a guest to reserve your table.
        </p>
        <p className="font-thai text-sm text-muted-foreground mt-1">
          ระบบสมัครสมาชิกจะเปิดให้บริการเร็ว ๆ นี้ ขณะนี้สามารถจองโต๊ะในฐานะผู้ใช้ทั่วไปได้
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Button asChild className="h-11 rounded-xl bg-gradient-luxury text-white">
            <Link to="/">Continue as Guest · จองโต๊ะ</Link>
          </Button>
          <Button asChild variant="ghost" className="h-10 rounded-xl">
            <Link to="/login"><ArrowLeft className="h-4 w-4" /> Back to login</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
