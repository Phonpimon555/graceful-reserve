import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import {
  Calendar as CalendarIcon, Clock, MapPin, Users, Sparkles, X, Search,
  Phone, Utensils, Crown, Trees, Waves, ChevronDown, Facebook, MessageCircle,
} from "lucide-react";
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

import heroImg from "@/assets/hero-riverside.jpg";
import dishSeabass from "@/assets/dish-seabass.jpg";
import dishTomyum from "@/assets/dish-tomyum.jpg";
import dishPrawn from "@/assets/dish-prawn.jpg";
import dishCrab from "@/assets/dish-crab.jpg";
import dishFriedrice from "@/assets/dish-friedrice.jpg";
import galleryVip from "@/assets/gallery-vip.jpg";
import galleryGarden from "@/assets/gallery-garden.jpg";
import gallerySunset from "@/assets/gallery-sunset.jpg";
import galleryFood from "@/assets/gallery-food.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ครัวริมบึง · Riverside Kitchen — Lakeside Fine Dining" },
      { name: "description", content: "Premium lakeside Thai dining. Live table availability and instant booking at Riverside Kitchen." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <Hero />
      <InfoBar />
      <BookingSection />
      <ZonesSection />
      <SignatureMenu />
      <GallerySection />
      <Footer />
    </div>
  );
}

/* ============================= HERO ============================= */

function Hero() {
  const { t, lang } = useLang();
  return (
    <section className="relative h-[60vh] min-h-[460px] w-full overflow-hidden flex items-center justify-center -mt-16 pt-16">
      {/* Background */}
      <img
        src={heroImg}
        alt="Riverside Kitchen at sunset"
        width={1920}
        height={1080}
        className="absolute inset-0 h-full w-full object-cover animate-fade-in"
        fetchPriority="high"
      />
      {/* Overlays */}
      <div className="absolute inset-0 bg-black/45" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/70" />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 text-center text-white animate-fade-up">
        <div className="inline-flex items-center gap-2 rounded-full glass-dark px-4 py-1.5 text-[10px] sm:text-xs uppercase tracking-[0.25em] mb-4 text-white/90">
          <span className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse-dot" />
          {t("heroEyebrow")}
        </div>

        {/* Logo crest */}
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="h-px w-10 sm:w-16 bg-gradient-to-r from-transparent to-gold/70" />
          <div className="grid h-12 w-12 sm:h-14 sm:w-14 place-items-center rounded-full bg-gradient-gold text-primary font-display text-2xl shadow-gold">
            ค
          </div>
          <div className="h-px w-10 sm:w-16 bg-gradient-to-l from-transparent to-gold/70" />
        </div>

        <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl leading-[1.02] tracking-tight">
          {lang === "th" ? (
            <>
              <span className="block">ครัวริมบึง</span>
              <span className="block text-xl sm:text-2xl lg:text-3xl mt-2 text-gold tracking-[0.3em] font-sans font-light uppercase">Riverside Kitchen</span>
            </>
          ) : (
            <>
              <span className="block">Riverside Kitchen</span>
              <span className="block text-xl sm:text-2xl lg:text-3xl mt-2 text-gold tracking-[0.3em] font-thai font-light">ครัวริมบึง</span>
            </>
          )}
        </h1>

        <p className="mt-4 text-sm sm:text-lg text-white/85 max-w-2xl mx-auto font-light leading-relaxed">
          {t("heroSubtitle")}
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button
            size="lg"
            className="rounded-full px-7 h-11 text-sm bg-gradient-gold text-primary hover:opacity-95 hover:scale-[1.03] shadow-gold border-0 transition-all"
            onClick={() => document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" })}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {t("ctaReserve")}
          </Button>
          <Button asChild size="lg" variant="outline" className="rounded-full px-7 h-11 text-sm glass-dark text-white border-white/30 hover:bg-white/10 hover:text-white">
            <a href="/menu">{t("ctaMenu")}</a>
          </Button>
        </div>
      </div>
    </section>
  );
}

/* ============================= INFO BAR ============================= */

function InfoBar() {
  const { t } = useLang();
  const items = [
    { icon: Clock, label: t("infoHours"), value: t("infoHoursValue") },
    { icon: Phone, label: t("infoPhone"), value: t("infoPhoneValue") },
    { icon: Utensils, label: t("infoTables"), value: t("infoTablesValue") },
    { icon: Users, label: t("infoSeating"), value: t("infoSeatingValue") },
  ];
  return (
    <section id="info" className="mx-auto max-w-6xl px-4 sm:px-6 pt-10 sm:pt-14">
      <div className="bg-card rounded-2xl shadow-elegant border border-border/60 grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-border/50 overflow-hidden">
        {items.map(({ icon: Icon, label, value }) => (
          <div key={label} className="p-4 sm:p-5 flex items-center gap-3 hover:bg-muted/40 transition-colors">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-gold text-primary shadow-soft">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-medium">{label}</div>
              <div className="font-display text-base sm:text-lg text-foreground truncate">{value}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ============================= BOOKING (logic preserved) ============================= */

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
    const total = tables.length || 50;
    const reserved = reservedTableIds.size;
    return {
      total,
      reserved,
      available: total - reserved,
      bookingsToday: reservations.length,
      occupancy: total ? Math.round((reserved / total) * 100) : 0,
    };
  }, [tables, reservedTableIds, reservations]);

  return (
    <section id="booking" className="mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-20 space-y-8">
      <SectionHeader
        eyebrow={t("live") + " · Real-time"}
        title={t("ctaReserve")}
        subtitle={lang === "th" ? "ตรวจสอบโต๊ะว่างและจองทันทีในไม่กี่คลิก" : "Live availability — book your table in just a few clicks."}
      />

      {/* Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        <Stat icon={<Sparkles className="h-4 w-4" />} label={t("dashAvailable")} value={`${totals.available}`} suffix={`/${totals.total}`} tone="gold" />
        <Stat icon={<Users className="h-4 w-4" />} label={t("dashReserved")} value={`${totals.reserved}`} suffix={`/${totals.total}`} tone="primary" />
        <Stat icon={<CalendarIcon className="h-4 w-4" />} label={t("dashToday")} value={`${totals.bookingsToday}`} tone="muted" />
        <Stat icon={<Waves className="h-4 w-4" />} label={t("dashOccupancy")} value={`${totals.occupancy}%`} tone="primary" pulse />
      </div>

      <div className="flex items-center justify-end">
        <Button variant="outline" size="sm" onClick={() => setCancelOpen(true)} className="rounded-full hover:border-primary">
          <X className="mr-1.5 h-3.5 w-3.5" /> {t("navCancel")}
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Step 1 - Date */}
        <Card className="p-6 shadow-soft border-border/60 hover:shadow-elegant transition-shadow">
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
        <Card className="p-6 shadow-soft border-border/60 lg:col-span-2 hover:shadow-elegant transition-shadow">
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
                      : "bg-card hover:border-gold hover:shadow-soft hover:-translate-y-0.5",
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
      <Card className="p-6 sm:p-8 shadow-soft border-border/60">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
          <StepHeader n={3} title={t("step3")} icon={<MapPin className="h-3.5 w-3.5" />} />
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <Legend color="bg-success/15 border-success/40 text-success" label={t("available")} />
            <Legend color="bg-destructive/10 border-destructive/40 text-destructive" label={t("reserved")} />
            <Legend color="bg-gold/30 border-gold text-gold-foreground" label={t("selected")} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
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
                    "group relative rounded-xl border-2 p-3 text-left transition-all duration-300",
                    "disabled:cursor-not-allowed",
                    selected
                      ? "bg-gold/25 border-gold shadow-gold scale-[1.06]"
                      : reserved
                      ? "bg-destructive/10 border-destructive/30 opacity-70"
                      : "bg-success/8 border-success/30 hover:border-gold hover:bg-gold/10 hover:-translate-y-1 hover:shadow-gold",
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-display text-lg leading-none">{tbl.id}</span>
                    <span className={cn(
                      "h-2 w-2 rounded-full transition-transform group-hover:scale-150",
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

/* ============================= ZONES ============================= */

function ZonesSection() {
  const { t } = useLang();
  const zones = [
    { icon: Waves, name: t("zoneRiverside"), desc: t("zRiversideDesc"), img: gallerySunset, emoji: "🌊" },
    { icon: Trees, name: t("zoneAir"), desc: t("zGardenDesc"), img: galleryGarden, emoji: "🏡" },
    { icon: Crown, name: t("zoneVip"), desc: t("zVipDesc"), img: galleryVip, emoji: "👑" },
  ];
  return (
    <section className="bg-gradient-warm py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeader eyebrow="3 Zones" title={t("zonesTitle")} subtitle={t("zonesSubtitle")} />
        <div className="grid md:grid-cols-3 gap-6 mt-10">
          {zones.map((z) => (
            <div key={z.name} className="group relative overflow-hidden rounded-3xl shadow-soft hover:shadow-elegant transition-all duration-500 hover:-translate-y-1.5">
              <div className="aspect-[4/5] overflow-hidden">
                <img
                  src={z.img}
                  alt={z.name}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-7 text-white">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">{z.emoji}</span>
                  <z.icon className="h-5 w-5 text-gold" />
                </div>
                <h3 className="font-display text-3xl mb-2">{z.name}</h3>
                <p className="text-sm text-white/85">{z.desc}</p>
                <div className="mt-4 h-px w-12 bg-gold transition-all duration-500 group-hover:w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================= SIGNATURE MENU ============================= */

function SignatureMenu() {
  const { t, lang } = useLang();
  const dishes = [
    { img: dishSeabass, name_en: "Crispy Sea Bass with Fish Sauce", name_th: "ปลากะพงทอดน้ำปลา", price: 420 },
    { img: dishTomyum, name_en: "Tom Yum River Prawn", name_th: "ต้มยำกุ้งแม่น้ำ", price: 350 },
    { img: dishPrawn, name_en: "Grilled River Prawn", name_th: "กุ้งเผา", price: 580 },
    { img: dishCrab, name_en: "Crab in Yellow Curry Powder", name_th: "ปูผัดผงกะหรี่", price: 650 },
    { img: dishFriedrice, name_en: "Crab Fried Rice", name_th: "ข้าวผัดปู", price: 180 },
  ];

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-20">
      <SectionHeader eyebrow="Chef's Selection" title={t("signatureTitle")} subtitle={t("signatureSubtitle")} />

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
        {dishes.map((d) => (
          <Card
            key={d.name_en}
            className="group flex flex-col overflow-hidden border-border/60 shadow-soft hover:shadow-elegant transition-all duration-500 hover:-translate-y-1 bg-card"
          >
            <div className="relative overflow-hidden aspect-[4/3]">
              <img
                src={d.img}
                alt={lang === "th" ? d.name_th : d.name_en}
                loading="lazy"
                width={1024}
                height={768}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-gradient-gold text-primary font-display text-sm shadow-soft">
                ฿{d.price}
              </div>
            </div>
            <div className="p-5 flex flex-col flex-1">
              <h3 className="font-display text-xl sm:text-2xl leading-tight">
                {lang === "th" ? d.name_th : d.name_en}
              </h3>
              <p className="text-xs text-muted-foreground mt-1 font-thai">
                {lang === "th" ? d.name_en : d.name_th}
              </p>
              <div className="mt-auto pt-4 flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Signature</span>
                <button
                  onClick={() => document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" })}
                  className="text-xs font-medium text-primary hover:text-gold transition-colors inline-flex items-center gap-1 group/btn"
                >
                  {t("viewDetails")}
                  <span className="transition-transform group-hover/btn:translate-x-1">→</span>
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

/* ============================= GALLERY ============================= */

function GallerySection() {
  const { t } = useLang();
  const images = [
    { src: gallerySunset, alt: "Sunset over the river", h: "row-span-2" },
    { src: galleryGarden, alt: "Garden seating", h: "" },
    { src: galleryFood, alt: "Thai dishes", h: "" },
    { src: galleryVip, alt: "VIP private dining", h: "row-span-2" },
    { src: heroImg, alt: "Riverside terrace", h: "" },
  ];
  return (
    <section className="bg-gradient-warm py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeader eyebrow="Gallery" title={t("galleryTitle")} subtitle={t("gallerySubtitle")} />
        <div className="mt-10 grid grid-cols-2 md:grid-cols-4 grid-rows-2 gap-3 sm:gap-4 auto-rows-[180px] sm:auto-rows-[220px]">
          {images.map((img, i) => (
            <div
              key={i}
              className={cn(
                "group relative overflow-hidden rounded-2xl shadow-soft hover:shadow-elegant transition-all duration-500",
                img.h,
                i === 0 && "col-span-2",
                i === 3 && "md:col-span-1",
              )}
            >
              <img
                src={img.src}
                alt={img.alt}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute bottom-4 left-4 text-white text-sm font-display opacity-0 group-hover:opacity-100 transition-opacity">
                {img.alt}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================= FOOTER ============================= */

function Footer() {
  const { t, lang } = useLang();
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16">
        <div className="grid md:grid-cols-3 gap-10">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-gradient-gold text-primary font-display text-xl shadow-gold">
                ค
              </div>
              <div>
                <div className="font-display text-2xl">{t("brand")}</div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-primary-foreground/60">{t("tagline")}</div>
              </div>
            </div>
            <p className="text-sm text-primary-foreground/70 leading-relaxed max-w-xs">
              {lang === "th"
                ? "ร้านอาหารไทยริมบึง บรรยากาศโรแมนติก พร้อมเสิร์ฟอาหารรสเลิศจากวัตถุดิบสดใหม่"
                : "Lakeside Thai dining with a romantic ambience and exquisite dishes from the freshest ingredients."}
            </p>
          </div>

          <div>
            <h4 className="font-display text-lg mb-4 text-gold">{t("footerVisit")}</h4>
            <ul className="space-y-2.5 text-sm text-primary-foreground/80">
              <li className="flex items-start gap-2">
                <Clock className="h-4 w-4 mt-0.5 text-gold shrink-0" />
                <span>{t("infoHoursValue")}</span>
              </li>
              <li className="flex items-start gap-2">
                <Phone className="h-4 w-4 mt-0.5 text-gold shrink-0" />
                <span>{t("infoPhoneValue")}</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 text-gold shrink-0" />
                <span>{lang === "th" ? "ริมบึงพระราม 9 กรุงเทพฯ" : "Rama 9 Lakeside, Bangkok"}</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-display text-lg mb-4 text-gold">{t("footerConnect")}</h4>
            <div className="flex flex-wrap gap-3">
              <a href="#" className="inline-flex items-center gap-2 rounded-full glass-dark px-4 py-2 text-sm hover:bg-gold hover:text-primary transition-colors border-white/10">
                <Facebook className="h-4 w-4" /> Facebook
              </a>
              <a href="#" className="inline-flex items-center gap-2 rounded-full glass-dark px-4 py-2 text-sm hover:bg-gold hover:text-primary transition-colors border-white/10">
                <MessageCircle className="h-4 w-4" /> LINE OA
              </a>
            </div>
            <Button
              onClick={() => document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" })}
              className="mt-6 rounded-full bg-gradient-gold text-primary hover:opacity-90 hover:scale-[1.02] border-0 shadow-gold transition-all"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {t("bookNow")}
            </Button>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs text-primary-foreground/60">
          <div>© {new Date().getFullYear()} {t("brand")} · {t("footerRights")}</div>
          <div>Crafted with care · Bangkok</div>
        </div>
      </div>
    </footer>
  );
}

/* ============================= SHARED ============================= */

function SectionHeader({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return (
    <div className="text-center max-w-2xl mx-auto">
      <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-gold mb-4 font-medium">
        <span className="h-px w-8 bg-gold" />
        {eyebrow}
        <span className="h-px w-8 bg-gold" />
      </div>
      <h2 className="font-display text-4xl sm:text-5xl text-foreground leading-tight">{title}</h2>
      <p className="mt-3 text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function StepHeader({ n, title, icon }: { n: number; title: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-gold text-primary text-xs font-semibold shadow-soft">{n}</span>
      <h3 className="font-display text-xl flex items-center gap-1.5">
        {title}
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </h3>
    </div>
  );
}

function Stat({
  label, value, suffix, tone, pulse, icon,
}: {
  label: string; value: string; suffix?: string;
  tone: "gold" | "primary" | "muted"; pulse?: boolean; icon?: React.ReactNode;
}) {
  const ring = {
    gold: "bg-gradient-gold text-primary",
    primary: "bg-primary text-primary-foreground",
    muted: "bg-muted text-foreground",
  }[tone];
  return (
    <Card className="relative overflow-hidden p-5 border-border/60 shadow-soft bg-card hover:shadow-elegant hover:-translate-y-0.5 transition-all duration-300">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className={cn("grid h-9 w-9 place-items-center rounded-xl shadow-soft", ring)}>
          {icon}
        </div>
        {pulse && <span className="h-2 w-2 rounded-full bg-success animate-pulse-dot" />}
      </div>
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-medium">{label}</div>
      <div className="mt-1 font-display text-3xl sm:text-4xl text-foreground animate-count">
        {value}
        {suffix && <span className="text-base text-muted-foreground font-sans ml-1">{suffix}</span>}
      </div>
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
        "rounded-full border px-4 py-1.5 text-xs font-medium transition-all",
        active ? "bg-primary text-primary-foreground border-primary shadow-soft" : "bg-card hover:border-gold hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/30 py-14 text-center text-sm text-muted-foreground">
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
          <Button onClick={submit} disabled={busy} className="bg-gradient-gold text-primary hover:opacity-90 border-0 shadow-gold">
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
