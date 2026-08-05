import { createFileRoute, Link } from "@tanstack/react-router";
import { BedDouble, CalendarDays, ShieldCheck, Sparkles } from "lucide-react";
import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ten of Cups Camp Manager — Game Farm Accommodation" },
      {
        name: "description",
        content:
          "Secure accommodation management for the Ten of Cups private game farm: camps, rooms, allocations, housekeeping and maintenance.",
      },
      { property: "og:title", content: "Ten of Cups Camp Manager — Game Farm Accommodation" },
      {
        property: "og:description",
        content: "Secure accommodation management for the Ten of Cups private game farm: camps, rooms, allocations, housekeeping and maintenance.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: BedDouble, title: "Camps & Rooms", text: "Camps, buildings, room types and live room status in one register." },
  { icon: CalendarDays, title: "Allocations", text: "Bed-level bookings with automatic double-booking protection." },
  { icon: Sparkles, title: "Housekeeping", text: "Cleaning queues, progress tracking and a full cleaning history." },
  { icon: ShieldCheck, title: "Role-based Access", text: "Administrator, manager, housekeeping and read-only roles." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-6">
        <img src={logo} alt="Ten of Cups Camp Manager" width={48} height={48} className="size-12" />
        <div className="leading-tight">
          <p className="font-display text-xl text-primary">Ten of Cups</p>
          <p className="text-[11px] tracking-[0.2em] uppercase text-muted-foreground">Camp Manager</p>
        </div>
        <div className="ml-auto">
          <Button asChild>
            <Link to="/auth">Sign in</Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-16 text-center">
        <p className="text-xs tracking-[0.3em] uppercase text-accent">Private Game Farm Accommodation</p>
        <h1 className="mx-auto mt-4 max-w-3xl text-5xl leading-tight sm:text-6xl">
          Every camp, bed and cleaning task — accounted for.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-muted-foreground">
          A single secure platform for managing accommodation across the reserve: occupancy at a glance,
          allocations without clashes, and housekeeping and maintenance kept honest.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button asChild size="lg">
            <Link to="/auth">Sign in to continue</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-6 pb-20 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f) => (
          <div key={f.title} className="surface-lodge p-5">
            <f.icon className="size-6 text-accent" />
            <h2 className="mt-3 font-display text-xl">{f.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        Ten of Cups Camp Manager — access is restricted to authorised staff.
      </footer>
    </div>
  );
}
