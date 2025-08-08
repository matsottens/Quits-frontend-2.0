import React from 'react';

/**
 * HexScan – animated hexagon outline with a sweeping horizontal line
 * Used on the Scanning page to replace the old linear progress bar.
 */
interface ShapeScanProps {
  size?: number;
  sides?: number; // 6 => hexagon, 8 => octagon etc.
}

const ShapeScan: React.FC<ShapeScanProps> = ({ size = 128, sides = 6 }) => {
  // Generate regular polygon points string
  const radius = 45; // keep within viewBox padding
  const cx = 50;
  const cy = 50;
  const points = Array.from({ length: sides })
    .map((_, i) => {
      const angle = (Math.PI * 2 * i) / sides - Math.PI / 2; // start at top
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div
      className="flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full filter drop-shadow-md text-primary-600"
        aria-hidden="true"
      >
        {/* Gradient definition */}
        <defs>
          <linearGradient id="hexStroke" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.8"></stop>
            <stop offset="100%" stopColor="currentColor"></stop>
          </linearGradient>
        </defs>
        {/* Static border */}
        <polygon
          points={points}
          fill="none"
          stroke="url(#hexStroke)"
          strokeOpacity="0.25"
          strokeWidth="2"
        />

        {/* Lead segment */}
        <polygon
          points={points}
          fill="none"
          stroke="url(#hexStroke)"
          strokeWidth="3"
          strokeLinecap="round"
          className="animate-hex-lead"
        />
        {/* Trail segment */}
        <polygon
          points={points}
          fill="none"
          stroke="url(#hexStroke)"
          strokeWidth="3"
          strokeLinecap="round"
          className="animate-hex-trail"
        />
        {/* Interior tint */}
        <polygon
          points={points}
          fill="currentColor"
          fillOpacity="0.06"
        />
      </svg>
    </div>
  );
};

export default ShapeScan; 