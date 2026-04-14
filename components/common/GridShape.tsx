export default function GridShape() {
  return (
    <>
      <div className="absolute right-0 top-0 z-0 w-full max-w-[250px] xl:max-w-[450px] pointer-events-none">
        <DecorShape width={450} height={450} />
      </div>
      <div className="absolute bottom-0 left-0 z-0 w-full max-w-[250px] rotate-180 xl:max-w-[450px] pointer-events-none">
        <DecorShape width={450} height={450} />
      </div>
    </>
  );
}

function DecorShape({ width, height }: { width: number; height: number }) {
  const cols = 9;
  const rows = 9;
  const gap = 50;
  const dots = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = c * gap + 25;
      const cy = r * gap + 25;
      // fade opacity based on distance from top-right corner
      const dist = Math.sqrt(Math.pow(c - (cols - 1), 2) + Math.pow(r, 2));
      const maxDist = Math.sqrt(Math.pow(cols - 1, 2) + Math.pow(rows - 1, 2));
      const opacity = Math.max(0.05, 0.5 - (dist / maxDist) * 0.45);
      dots.push({ cx, cy, opacity });
    }
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 450 450"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="fadeGrad" cx="100%" cy="0%" r="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
      {dots.map((d, i) => (
        <circle
          key={i}
          cx={d.cx}
          cy={d.cy}
          r={2.5}
          fill="white"
          fillOpacity={d.opacity}
        />
      ))}
    </svg>
  );
}
