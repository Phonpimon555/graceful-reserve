import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Clock, MapPin, Users, Sparkles, X, Search } from "lucide-react";
import { toast } from "sonner";

import { NavBar } from "@/components/NavBar";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

import { TIME_SLOTS, useLang, zoneLabel, ZONES, type Zone } from "@/lib/i18n";
import {
  fetchTables, fetchReservationsForDate, createReservation,
  cancelReservation, findReservationsByPhone,
  type TableRow, type Reservation,
} from "@/lib/reservations";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Riverside Kitchen — Reserve Your Perfect Table" },
      { name: "description", content: "Live table availability and instant booking at Riverside Kitchen." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <Hero />
      <BookingSection />
      <FooterStrip />
    </div>
  );
}

function Hero() {
  const { t } = useLang();
  return (
    <section className="relative overflow-hidden bg-gradient-hero">
      <div className="absolute inset-0 opacity-[0.04]" style={{
        backgroundImage: "radial-gradient(circle at 1px 1px, var(--foreground) 1px, transparent 0)",
        backgroundSize: "32px 32px",
      }} />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 pt-16 pb-12 sm:pt-24 sm:pb-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-muted-foreground mb-8 shadow-soft">
          <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-dot" />
          <span>{t("live")} · Real-time availability</span>
        </div>
        <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl text-foreground leading-[1.05] max-w-4xl mx-auto">
          {t("heroTitle")}
        </h1>
        <p className="mt-6 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto">
          {t("heroSubtitle")}
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Button size="lg" className="rounded-full px-7 h-12 text-sm shadow-elegant" onClick={() => document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" })}>
            <Sparkles className="mr-2 h-4 w-4" />
            {t("ctaReserve")}
          </Button>
          <Button asChild size="lg" variant="outline" className="rounded-full px-7 h-12 text-sm bg-card">
            <a href="/menu">{t("ctaMenu")}</a>
          </Button>
        </div>
      </div>
    </section>
  );
}

function BookingSection() {
  const { t, lang } = useLang();
  const qc = useQueryClient();
  const today = useMemo(() => new Date(), []);
  const [date, setDate] = useState<Date | undefined>(today);
  const [slot, setSlot] = useState<string | null>(null);
  const [zoneFilter, setZoneFilter] = useState<Zone | "all">("all");
  const [selectedTable, setSelectedTable] = useState<TableRow | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);

  const dateKey = date ? format(date, "yyyy-MM-dd") : "";

  const tablesQ = useQuery({ queryKey: ["tables"], queryFn: fetchTables });
  const resQ = useQuery({
    queryKey: ["reservations", dateKey],
    queryFn: () => fetchReservationsForDate(dateKey),
    enabled: !!dateKey,
  });

  // Realtime sync
  useEffect(() => {
    if (!dateKey) return;
    const channel = supabase
      .channel(`res-${dateKey}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "reservations" }, () => {
        qc.invalidateQueries({ queryKey: ["reservations", dateKey] });
        qc.invalidateQueries({ queryKey: ["allReservations"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [dateKey, qc]);

  const tables = tablesQ.data ?? [];
  const reservations = resQ.data ?? [];

  const slotCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of reservations) map[r.time_slot] = (map[r.time_slot] ?? 0) + 1;
    return map;
  }, [reservations]);

  const reservedTableIds = useMemo(() => {
    if (!slot) return new Set<string>();
    return new Set(reservations.filter((r) => r.time_slot === slot).map((r) => r.table_id));
  }, [reservations, slot]);

  const filteredTables = useMemo(
    () => zoneFilter === "all" ? tables : tables.filter((t) => t.zone === zoneFilter),
    [tables, zoneFilter],
  );

  const totals = useMemo(() => {
    const total = tables.length;
    const reserved = reservedTableIds.size;
    return {
      total,
      reserved,
      available: total - reserved,
      occupancy: total ? Math.round((reserved / total) * 100) : 0,
    };
  }, [tables, reservedTableIds]);

  return (
    <section id="booking" className="mx-auto max-w-7xl px-4 sm:px-6 py-12 sm:py-16 space-y-8">
      {/* Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Stat label={t("dashAvailable")} value={`${totals.available}/${totals.total || 50}`} tone="success" />
        <Stat label={t("dashReserved")} value={`${totals.reserved}/${totals.total || 50}`} tone="warm" />
        <Stat label={t("dashOccupancy")} value={`${totals.occupancy}%`} tone="primary" />
        <Stat label={t("live")} value={dateKey ? format(new Date(dateKey), "MMM d") : "—"} tone="muted" pulse />
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="font-display text-3xl sm:text-4xl">{t("ctaReserve")}</h2>
        <Button variant="outline" size="sm" onClick={() => setCancelOpen(true)} className="rounded-full">
          <X className="mr-1.5 h-3.5 w-3.5" /> {t("navCancel")}
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Step 1 - Date */}
        <Card className="p-5 shadow-soft border-border/60">
          <StepHeader n={1} title={t("step1")} />
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-11 bg-card", !date && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "EEEE, MMMM d, yyyy") : t("pickDate")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => { setDate(d); setSlot(null); setSelectedTable(null); }}
                disabled={(d) => d < new Date(new Date().setHours(0,0,0,0))}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </Card>

        {/* Step 2 - Time */}
        <Card className="p-5 shadow-soft border-border/60 lg:col-span-2">
          <StepHeader n={2} title={t("step2")} icon={<Clock className="h-3.5 w-3.5" />} />
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {TIME_SLOTS.map((s) => {
              const count = slotCounts[s] ?? 0;
              const full = count >= tables.length && tables.length > 0;
              const active = slot === s;
              return (
                <button
                  key={s}
                  disabled={full || !date}
                  onClick={() => { setSlot(s); setSelectedTable(null); }}
                  className={cn(
                    "relative rounded-xl border px-3 py-3 text-sm font-medium transition-all",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    active
                      ? "bg-primary text-primary-foreground border-primary shadow-elegant scale-[1.02]"
                      : full
                      ? "bg-muted text-muted-foreground border-border"
                      : "bg-card hover:border-primary/40 hover:shadow-soft hover:-translate-y-0.5",
                  )}
                >
                  {s}
                  {full && (
                    <span className="absolute -top-1.5 -right-1.5 text-[9px] font-bold uppercase tracking-wider bg-destructive text-destructive-foreground rounded-full px-1.5 py-0.5">
                      {t("full")}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Step 3 - Table map */}
      <Card className="p-5 sm:p-6 shadow-soft border-border/60">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
          <StepHeader n={3} title={t("step3")} icon={<MapPin className="h-3.5 w-3.5" />} />
          <div className="flex items-center gap-3 flex-wrap text-xs">
            <Legend color="bg-success/15 border-success/40 text-success" label={t("available")} />
            <Legend color="bg-destructive/10 border-destructive/40 text-destructive" label={t("reserved")} />
            <Legend color="bg-gold/30 border-gold text-gold-foreground" label={t("selected")} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-5">
          <ZoneChip active={zoneFilter === "all"} onClick={() => setZoneFilter("all")}>
            {lang === "th" ? "ทั้งหมด" : "All"} · {tables.length}
          </ZoneChip>
          {ZONES.map((z) => (
            <ZoneChip key={z} active={zoneFilter === z} onClick={() => setZoneFilter(z)}>
              {zoneLabel(z, lang)} · {tables.filter((t) => t.zone === z).length}
            </ZoneChip>
          ))}
        </div>

        {!slot ? (
          <EmptyHint text={!date ? t("pickDate") : t("pickSlot")} />
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2.5">
            {filteredTables.map((tbl) => {
              const reserved = reservedTableIds.has(tbl.id);
              const selected = selectedTable?.id === tbl.id;
              return (
                <button
                  key={tbl.id}
                  disabled={reserved}
                  onClick={() => setSelectedTable(tbl)}
                  className={cn(
                    "group relative rounded-xl border-2 p-2.5 text-left transition-all",
                    "disabled:cursor-not-allowed",
                    selected
                      ? "bg-gold/25 border-gold shadow-elegant scale-[1.04]"
                      : reserved
                      ? "bg-destructive/8 border-destructive/30 opacity-70"
                      : "bg-success/8 border-success/30 hover:border-success hover:-translate-y-0.5 hover:shadow-soft",
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-display text-lg leading-none">{tbl.id}</span>
                    <span className={cn(
                      "h-2 w-2 rounded-full",
                      selected ? "bg-gold" : reserved ? "bg-destructive" : "bg-success",
                    )} />
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">
                    {zoneLabel(tbl.zone, lang)}
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-[11px] text-foreground/70">
                    <Users className="h-3 w-3" /> {tbl.capacity}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      <BookingDialog
        open={!!selectedTable}
        onClose={() => setSelectedTable(null)}
        table={selectedTable}
        date={dateKey}
        slot={slot}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ["reservations", dateKey] });
          setSelectedTable(null);
        }}
      />

      <CancelDialog open={cancelOpen} onClose={() => setCancelOpen(false)} />
    </section>
  );
}

function StepHeader({ n, title, icon }: { n: number; title: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">{n}</span>
      <h3 className="font-display text-xl flex items-center gap-1.5">
        {title}
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </h3>
    </div>
  );
}

function Stat({ label, value, tone, pulse }: { label: string; value: string; tone: "success" | "warm" | "primary" | "muted"; pulse?: boolean }) {
  const toneCls = {
    success: "from-success/15 to-success/5 text-success",
    warm: "from-destructive/10 to-destructive/0 text-destructive",
    primary: "from-primary/12 to-primary/0 text-primary",
    muted: "from-muted to-muted/30 text-foreground",
  }[tone];
  return (
    <Card className={cn("relative overflow-hidden p-5 border-border/60 shadow-soft bg-gradient-to-br", toneCls)}>
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-medium">{label}</div>
      <div className="mt-1 font-display text-3xl text-foreground">{value}</div>
      {pulse && <span className="absolute top-3 right-3 h-2 w-2 rounded-full bg-success animate-pulse-dot" />}
    </Card>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1", color)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

function ZoneChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-4 py-1.5 text-xs font-medium transition",
        active ? "bg-primary text-primary-foreground border-primary shadow-soft" : "bg-card hover:border-primary/40",
      )}
    >
      {children}
    </button>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/30 py-12 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function BookingDialog({
  open, onClose, table, date, slot, onSuccess,
}: {
  open: boolean; onClose: () => void; table: TableRow | null;
  date: string; slot: string | null; onSuccess: () => void;
}) {
  const { t, lang } = useLang();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!open) { setName(""); setPhone(""); } }, [open]);

  const submit = async () => {
    if (!table || !slot || !date) return;
    if (name.trim().length < 2) { toast.error(lang === "th" ? "กรุณากรอกชื่อ" : "Please enter your name"); return; }
    if (phone.replace(/\D/g, "").length < 9) { toast.error(lang === "th" ? "เบอร์โทรไม่ถูกต้อง" : "Invalid phone number"); return; }
    setBusy(true);
    const res = await createReservation({
      table_id: table.id, customer_name: name.trim(), phone: phone.trim(),
      reservation_date: date, time_slot: slot,
    });
    setBusy(false);
    if (res.ok) { toast.success(t("bookingSuccess")); onSuccess(); }
    else if (res.reason === "taken") toast.error(t("bookingFail"));
    else toast.error(String(res.reason));
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{t("confirm")}</DialogTitle>
          <DialogDescription>
            {lang === "th" ? "กรุณากรอกข้อมูลเพื่อยืนยันการจอง" : "Confirm your reservation details below."}
          </DialogDescription>
        </DialogHeader>

        {table && (
          <div className="rounded-xl border bg-muted/30 p-4 grid grid-cols-3 gap-3 text-center">
            <DetailCell label={t("table")} value={table.id} />
            <DetailCell label={t("step1")} value={date ? format(new Date(date), "MMM d") : "—"} />
            <DetailCell label={t("step2")} value={slot ?? "—"} small />
          </div>
        )}

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="name">{t("customerName")}</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">{t("customerPhone")}</Label>
            <Input id="phone" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} placeholder="081-234-5678" />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>{t("cancel")}</Button>
          <Button onClick={submit} disabled={busy} className="shadow-elegant">
            {busy ? "..." : t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DetailCell({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("font-display", small ? "text-base" : "text-xl")}>{value}</div>
    </div>
  );
}

function CancelDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, lang } = useLang();
  const qc = useQueryClient();
  const [phone, setPhone] = useState("");
  const [results, setResults] = useState<Reservation[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [pendingCancel, setPendingCancel] = useState<Reservation | null>(null);

  useEffect(() => { if (!open) { setPhone(""); setResults(null); setPendingCancel(null); } }, [open]);

  const lookup = async () => {
    if (phone.replace(/\D/g, "").length < 9) { toast.error(lang === "th" ? "เบอร์โทรไม่ถูกต้อง" : "Invalid phone"); return; }
    setBusy(true);
    const data = await findReservationsByPhone(phone);
    setBusy(false);
    setResults(data);
  };

  const doCancel = async () => {
    if (!pendingCancel) return;
    setBusy(true);
    const r = await cancelReservation(pendingCancel.id, phone);
    setBusy(false);
    if (r.ok) {
      toast.success(t("cancelSuccess"));
      setResults((prev) => prev?.filter((x) => x.id !== pendingCancel.id) ?? null);
      qc.invalidateQueries({ queryKey: ["reservations"] });
    } else if (r.reason === "phone_mismatch") toast.error(t("phoneMismatch"));
    else toast.error(String(r.reason));
    setPendingCancel(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{t("navCancel")}</DialogTitle>
            <DialogDescription>{t("cancelByPhone")}</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="081-234-5678" inputMode="tel" />
            <Button onClick={lookup} disabled={busy}><Search className="h-4 w-4 mr-1.5" />{t("findBooking")}</Button>
          </div>

          {results !== null && (
            <div className="space-y-2 max-h-72 overflow-auto">
              {results.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">{t("noBookings")}</p>
              ) : (
                <>
                  <div className="text-xs text-muted-foreground">{t("bookingsFor")} {phone}</div>
                  {results.map((r) => (
                    <div key={r.id} className="flex items-center justify-between gap-3 rounded-lg border p-3 bg-card">
                      <div className="min-w-0">
                        <div className="font-display text-lg">{r.table_id} · {r.time_slot}</div>
                        <div className="text-xs text-muted-foreground">{format(new Date(r.reservation_date), "EEE, MMM d, yyyy")} · {r.customer_name}</div>
                      </div>
                      <Button size="sm" variant="destructive" onClick={() => setPendingCancel(r)}>
                        {t("cancel")}
                      </Button>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingCancel} onOpenChange={(o) => !o && setPendingCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmCancelTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("confirmCancelBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={doCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("yesCancel")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function FooterStrip() {
  const { t, lang } = useLang();
  return (
    <footer className="border-t border-border/60 bg-card/40 mt-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <div>© {new Date().getFullYear()} {t("brand")}</div>
        <div>{lang === "th" ? "เปิดทุกวัน 11:00 - 22:00 · ริมแม่น้ำเจ้าพระยา" : "Open daily 11:00 - 22:00 · By the Chao Phraya River"}</div>
      </div>
    </footer>
  );
}
