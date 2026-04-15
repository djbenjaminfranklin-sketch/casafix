export function isNightTime(): boolean {
  const hour = new Date().getHours();
  return hour >= 22 || hour < 8;
}

export function applyNightRate(price: number): number {
  return isNightTime() ? Math.round(price * 1.3) : price;
}

export const NIGHT_RATE_PERCENT = 30;
