export type PlayedRange = [number, number];
export function playedDelta(
  previousPosition: number,
  currentPosition: number,
  wallMs: number,
  playing: boolean,
) {
  if (!playing || wallMs <= 0 || wallMs > 5000) return 0;
  const positionDelta = currentPosition - previousPosition;
  if (positionDelta < 0 || positionDelta > wallMs + 700) return 0;
  return Math.max(0, Math.min(positionDelta, wallMs) / 1000);
}
export function addPlayedRange(
  ranges: PlayedRange[],
  startMs: number,
  endMs: number,
): PlayedRange[] {
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return ranges;
  const sorted = [...ranges, [Math.max(0, startMs), Math.max(0, endMs)] as PlayedRange].sort(
    (a, b) => a[0] - b[0],
  );
  const merged: PlayedRange[] = [];
  for (const range of sorted) {
    const last = merged[merged.length - 1];
    if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1]);
    else merged.push([...range]);
  }
  return merged;
}
export function coveredSeconds(ranges: PlayedRange[]) {
  return ranges.reduce((sum, [start, end]) => sum + Math.max(0, end - start) / 1000, 0);
}
