import React, { useEffect, useRef, useState } from 'react';

type MetricCard = {
  title: string;
  value: string | number;
  sublabel?: string;
  trend?: { direction: 'up' | 'down'; pct: number };
  icon?: React.ReactNode;
};

interface MobileMetricCarouselProps {
  cards: MetricCard[];
}

const MobileMetricCarousel: React.FC<MobileMetricCarouselProps> = ({ cards }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleScroll = () => {
      const width = el.clientWidth;
      if (width === 0) return;
      const idx = Math.round(el.scrollLeft / width);
      if (idx !== currentIndex) setCurrentIndex(Math.max(0, Math.min(cards.length - 1, idx)));
    };
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [cards.length, currentIndex]);

  return (
    <div className="md:hidden -mx-4 px-4">
      <div
        ref={containerRef}
        className="flex overflow-x-auto snap-x snap-mandatory pb-2 no-scrollbar"
      >
        {cards.map((card, idx) => (
          <div
            key={idx}
            className="w-full flex-none snap-start"
          >
            <div className="bg-white text-gray-900 rounded-xl p-4 shadow-md border border-gray-100">
              <div className="flex items-center justify-between">
                <p className="small-label text-gray-600">{card.title}</p>
                {card.icon}
              </div>
              <div className="mt-2 heading-2 text-gray-900">{card.value}</div>
              <div className="mt-1 text-xs text-gray-500">{card.sublabel}</div>
              {card.trend && (
                <div className="mt-2 text-xs font-medium flex items-center">
                  <span className={card.trend.direction === 'up' ? 'text-gain' : 'text-loss'}>
                    {card.trend.direction === 'up' ? '↑' : '↓'} {card.trend.pct}%
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      {/* Single icon indicator for current card */}
      <div className="flex justify-center mt-2">
        <div className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-white border border-gray-200 shadow-sm">
          {cards[currentIndex]?.icon ?? (
            <span className="h-2 w-2 rounded-full bg-galaxy inline-block" />
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileMetricCarousel;


