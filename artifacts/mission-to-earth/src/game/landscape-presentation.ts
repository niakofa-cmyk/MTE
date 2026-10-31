export function shouldRecommendLandscape(
  coarsePointer: boolean,
  width: number,
  height: number,
): boolean {
  return (
    coarsePointer &&
    Number.isFinite(width) &&
    Number.isFinite(height) &&
    width > 0 &&
    height > width
  );
}
