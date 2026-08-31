interface Props {
  values: number[];
  width?: number;
  height?: number;
  stroke?: string;
  fill?: string;
}

// Lightweight dependency-free SVG sparkline — no charting library needed for
// a small trend line on a device card.
export function Sparkline({ values, width = 120, height = 36, stroke = "#38bdf8", fill = "rgba(56,189,248,0.18)" }: Props) {
  if (values.length < 2) {
    return (
      <div style={{ width, height }} className="flex items-center justify-center text-[10px] text-gray-600">
        No data yet
      </div>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = width / (values.length - 1);

  const points = values.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return [x, y] as const;
  });

  const linePath = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${width},${height} L0,${height} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <path d={areaPath} fill={fill} stroke="none" />
      <path d={linePath} fill="none" stroke={stroke} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
