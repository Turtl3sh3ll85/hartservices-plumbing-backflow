import { useState, useEffect, useCallback } from "react";
import { Star, Quote } from "lucide-react";
import { base44 } from "@/api/base44Client";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";

const FALLBACK_REVIEWS = [
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

const PREVIEW_LIMIT = 360;

export default function LandingReviews() {
  const [api, setApi] = useState(null);
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);
  const [reviews, setReviews] = useState(FALLBACK_REVIEWS);
  const [rating, setRating] = useState(5);
  const [reviewCount, setReviewCount] = useState(31);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    let cancelled = false;
    base44.functions
      .invoke("getGoogleReviews", {})
      .then((res) => {
        if (cancelled) return;
        if (res?.reviews?.length) {
          setReviews(res.reviews);
          if (typeof res.rating === "number") setRating(res.rating);
          if (typeof res.user_ratings_total === "number") setReviewCount(res.user_ratings_total);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!api) return;
    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  const autoplay = useCallback(() => {
    if (!api) return;
    if (api.canScrollNext()) api.scrollNext();
    else api.scrollTo(0);
  }, [api]);

  useEffect(() => {
    if (!api) return;
    const id = setInterval(autoplay, 10000);
    return () => clearInterval(id);
  }, [api, autoplay]);

  return (
    <section id="reviews" className="bg-muted/30 py-14">
      <div className="mx-auto max-w-3xl px-4">
        <div className="mb-8 text-center">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Star className="h-3.5 w-3.5 fill-primary" /> {rating.toFixed(1)} · {reviewCount} Google Reviews
          </div>
          <h2 className="font-heading text-2xl font-bold text-foreground sm:text-3xl">What Our Customers Say</h2>
        </div>

        <Carousel opts={{ loop: true }} setApi={setApi} className="px-10">
          <CarouselContent>
            {reviews.map((r, idx) => {
              const isLong = (r.text || "").length > PREVIEW_LIMIT;
              const isOpen = !!expanded[idx];
              const display = isLong && !isOpen
                ? `${r.text.slice(0, PREVIEW_LIMIT).trim()}…`
                : r.text;
              return (
                <CarouselItem key={idx}>
                  <div className="flex h-full flex-col rounded-xl border bg-card p-6 shadow-sm">
                    <Quote className="mb-3 h-6 w-6 text-primary/30" />
                    <p className="flex-1 text-sm leading-relaxed text-muted-foreground">{display}</p>
                    {isLong && (
                      <button
                        type="button"
                        onClick={() => setExpanded((p) => ({ ...p, [idx]: !p[idx] }))}
                        className="mt-1 self-start text-xs font-medium text-primary hover:underline"
                      >
                        {isOpen ? "Read less" : "Read more"}
                      </button>
                    )}
                    <div className="mt-4 flex items-center gap-3 border-t pt-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                        {r.name?.charAt(0) || "H"}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-foreground">{r.name || "Verified Customer"}</div>
                        <div className="text-xs text-muted-foreground">{r.when}</div>
                      </div>
                      <div className="ml-auto flex">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                    </div>
                  </div>
                </CarouselItem>
              );
            })}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>

        {count > 0 && (
          <div className="mt-5 flex justify-center gap-1.5">
            {Array.from({ length: count }).map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to review ${i + 1}`}
                onClick={() => api?.scrollTo(i)}
                className={`h-2 rounded-full transition-all ${
                  i === current ? "w-5 bg-primary" : "w-2 bg-border"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}