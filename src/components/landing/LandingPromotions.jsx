import { Image } from "@/components/ui/image";
import { Tag } from "lucide-react";

const PROMOS = [
  {
    title: "Flo by Moen",
    tagline: "Every Drop Counts. We Count Every Drop.",
    desc: "Audit your smart meter, shut off water remotely, and get complete access to water usage logs.",
    price: "Starts at $750",
    img: "https://files.elfsightcdn.com/eafe4a4d-3436-495d-b748-5bdce62d911d/6f009123-766c-4dc8-a3f4-af1992c911f5/2026-02-02_21-17-46.png",
  },
  {
    title: "South Texas Winterization",
    tagline: "No More Frozen Backflows",
    desc: "A Freeze Miser keeps water moving through your backflow assembly on frosty nights.",
    price: "Starts at $350",
    img: "https://files.elfsightcdn.com/eafe4a4d-3436-495d-b748-5bdce62d911d/f1a7f863-2d0e-4c3e-b096-4a34d89bc6d1/Untitled-1.png",
  },
  {
    title: "Water Softeners",
    tagline: "Hard Water? Easy Fix.",
    desc: "The only way to truly remove dissolved solids. Pre-plumbed installations available. Add a carbon filter for city water.",
    price: "Starts at $2,500",
    img: "https://files.elfsightcdn.com/eafe4a4d-3436-495d-b748-5bdce62d911d/2f7a6776-2122-4b9a-bd1c-6f7e91234233/Water-Softener-Parts-Diagram-1100px-1-.jpg",
  },
];

export default function LandingPromotions() {
  return (
    <section id="promotions" className="bg-muted/30 py-14">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-8 flex items-center justify-center gap-2 text-center">
          <Tag className="h-5 w-5 text-primary" />
          <h2 className="font-heading text-2xl font-bold text-foreground sm:text-3xl">Current Promotions</h2>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {PROMOS.map((p) => (
            <div key={p.title} className="overflow-hidden rounded-xl border bg-card shadow-sm">
              <div className="aspect-video w-full overflow-hidden bg-muted">
                <Image src={p.img} alt={p.title} className="h-full w-full object-contain" fittingType="fit" />
              </div>
              <div className="p-5">
                <h3 className="font-semibold text-foreground">{p.title}</h3>
                <p className="text-sm font-medium text-primary">{p.tagline}</p>
                <p className="mt-2 text-sm text-muted-foreground">{p.desc}</p>
                <p className="mt-3 text-base font-bold text-foreground">{p.price}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}