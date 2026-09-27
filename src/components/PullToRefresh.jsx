import { useRef, useState } from "react";
import { Loader2 } from "lucide-react";

export default function PullToRefresh({ onRefresh, children }) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);
  const threshold = 70;

  const onTouchStart = (e) => {
    if (window.scrollY <= 0) startY.current = e.touches[0].clientY;
  };
  const onTouchMove = (e) => {
    if (startY.current == null) return;
    const diff = e.touches[0].clientY - startY.current;
    if (diff > 0 && window.scrollY <= 0) setPull(Math.min(diff / 2, 80));
  };
  const onTouchEnd = async () => {
    if (pull > threshold && !refreshing) {
      setRefreshing(true);
      setPull(0);
      try { await onRefresh?.(); } catch (e) {}
      setRefreshing(false);
    } else {
      setPull(0);
    }
    startY.current = null;
  };

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{ transform: pull ? `translateY(${pull}px)` : undefined, transition: pull ? "none" : "transform 0.2s ease", overscrollBehavior: "contain" }}
    >
      {(pull > 10 || refreshing) && (
        <div className="flex items-center justify-center" style={{ height: refreshing ? 40 : pull }}>
          <Loader2 className={`w-5 h-5 text-primary ${refreshing ? "animate-spin" : ""}`} />
        </div>
      )}
      {children}
    </div>
  );
}