import { useEffect, useState } from "react";
import { Image } from "@/components/ui/image";

const SLIDES = [
  "https://media.base44.com/images/public/6ab936d39a6c956d5b685842/bd485c571_20260410_175911.jpg",
  "https://media.base44.com/images/public/6ab936d39a6c956d5b685842/337f810ce_20260423_180102.jpg",
  "https://media.base44.com/images/public/6ab936d39a6c956d5b685842/ab4ef696e_20260424_173224.jpg",
  "https://media.base44.com/images/public/6ab936d39a6c956d5b685842/98f0cedc7_20260530_112535.jpg",
  "https://media.base44.com/images/public/6ab936d39a6c956d5b685842/f393a6978_20260813_162440.jpg",
  "https://media.base44.com/images/public/6ab936d39a6c956d5b685842/7579ef317_20260806_110138.jpg",
  "https://media.base44.com/images/public/6ab936d39a6c956d5b685842/6b70c3c39_Screenshot_20260808_185625_Facebook.jpg",
  "https://media.base44.com/images/public/6ab936d39a6c956d5b685842/958a0e588_20260918_132827.jpg",
];

const INTERVAL = 4000;

export default function HeroCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % SLIDES.length);
    }, INTERVAL);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden">
      {SLIDES.map((src, i) => (
        <div
          key={src}
          className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
          style={{ opacity: i === index ? 1 : 0 }}
        >
          <Image src={src} alt="HartServices plumbing work" className="h-full w-full object-cover" fittingType="fill" />
        </div>
      ))}
      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            aria-label={`Slide ${i + 1}`}
            className={`h-1.5 rounded-full transition-all ${i === index ? "w-5 bg-white" : "w-1.5 bg-white/50"}`}
          />
        ))}
      </div>
    </div>
  );
}