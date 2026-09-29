import { Star, Quote } from "lucide-react";

const REVIEWS = [
  {
    name: "Rocky Wanek",
    when: "2 months ago",
    text: "It's evident that plumbing is Jon's passion. We've used him for years. He is trustworthy, prompt, and above all, his work is clean and looks great! He came in and saved our house when another contractor had messed it up so badly. I cannot recommend him enough.",
  },
  {
    name: "Priscilla Flores",
    when: "4 months ago",
    text: "One of the most informative plumbers, always ready to make your life easier with upfront costs and detailed plans — you can't go wrong.",
  },
  {
    name: "Fidel Gil",
    when: "5 months ago",
    text: "Jon showed up on time, explained everything clearly, and the price was exactly what he quoted. Honest plumber who actually cares about the work.",
  },
];

export default function LandingReviews() {
  return (
    <section id="reviews" className="bg-muted/30 py-14">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-8 text-center">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Star className="h-3.5 w-3.5 fill-primary" /> 5.0 · 31 Google Reviews
          </div>
          <h2 className="font-heading text-2xl font-bold text-foreground sm:text-3xl">What Our Customers Say</h2>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {REVIEWS.map((r) => (
            <div key={r.name} className="flex flex-col rounded-xl border bg-card p-5 shadow-sm">
              <Quote className="mb-3 h-6 w-6 text-primary/30" />
              <p className="flex-1 text-sm text-muted-foreground">{r.text}</p>
              <div className="mt-4 flex items-center gap-3 border-t pt-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {r.name.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">{r.name}</div>
                  <div className="text-xs text-muted-foreground">{r.when}</div>
                </div>
                <div className="ml-auto flex">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}