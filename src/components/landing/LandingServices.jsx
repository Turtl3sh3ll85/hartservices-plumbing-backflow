import { Droplets, ShieldCheck, Waves, Flame, GlassWater, Gauge, Wind, Cylinder, Radar } from "lucide-react";

const SERVICES = [
  { icon: ShieldCheck, title: "Smart Leak Protection", desc: "Flo by Moen monitors your water 24/7 and shuts off automatically during leaks." },
  { icon: Droplets, title: "Backflow Testing", desc: "Annual testing and certification for irrigation and domestic lines to keep you compliant." },
  { icon: Waves, title: "Water Softeners", desc: "Combat San Antonio's hard water and protect your appliances with professional softener installation." },
  { icon: Flame, title: "Tankless Water Heaters", desc: "Endless hot water and energy efficiency. See if a tankless system is right for your home." },
  { icon: GlassWater, title: "Reverse Osmosis", desc: "Pure, bottled-quality drinking water straight from your kitchen tap with RO filtration." },
  { icon: Gauge, title: "Pressure Reducing Valves", desc: "Protect pipes and appliances from destructive high city water pressure and thermal expansion." },
  { icon: Wind, title: "Hydrojetting & Drain Clearing", desc: "High-pressure hydrojetting clears severe clogs when augers aren't enough." },
  { icon: Cylinder, title: "Bladder Tanks & Arrestors", desc: "Expansion tanks, well pressure tanks, and water hammer arrestors to manage pressure safely." },
  { icon: Radar, title: "Tracer Gas Leak Detection", desc: "Hydrogen tracer gas pinpoints hidden slab leaks without the guesswork. (Coming soon)" },
];

export default function LandingServices() {
  return (
    <section id="services" className="mx-auto max-w-6xl px-4 py-14">
      <div className="mb-8 text-center">
        <h2 className="font-heading text-2xl font-bold text-foreground sm:text-3xl">Our Services</h2>
        <p className="mt-2 text-muted-foreground">Full-service residential plumbing backed by honest pricing and clean work.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SERVICES.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <h3 className="mb-1 font-semibold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}