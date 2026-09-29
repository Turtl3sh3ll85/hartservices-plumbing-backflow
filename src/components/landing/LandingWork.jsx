import { Image } from "@/components/ui/image";
import { Wrench } from "lucide-react";

const WORK = [
  { img: "https://images.unsplash.com/photo-1556909114-44e3e70034f2?w=600&q=80", title: "Leak Repair", desc: "Under-sink leak diagnosis and repair." },
  { img: "https://images.unsplash.com/photo-1607472586893-edb46e1cf0db?w=600&q=80", title: "Fixture Install", desc: "Toilet and lavatory installation." },
  { img: "https://images.unsplash.com/photo-1581244277913-efb3f5e1c4db?w=600&q=80", title: "Backflow Testing", desc: "Annual backflow prevention assembly testing." },
  { img: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80", title: "Bathroom Rough-In", desc: "New construction bathroom plumbing." },
];

export default function LandingWork() {
  return (
    <section id="work" className="mx-auto max-w-6xl px-4 py-14">
      <div className="mb-8 flex items-center justify-center gap-2 text-center">
        <Wrench className="h-5 w-5 text-primary" />
        <h2 className="font-heading text-2xl font-bold text-foreground sm:text-3xl">Our Work</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {WORK.map((w) => (
          <div key={w.title} className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <div className="aspect-square w-full overflow-hidden bg-muted">
              <Image src={w.img} alt={w.title} className="h-full w-full object-cover" fittingType="fill" />
            </div>
            <div className="p-3">
              <h3 className="text-sm font-semibold text-foreground">{w.title}</h3>
              <p className="text-xs text-muted-foreground">{w.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}