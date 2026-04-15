export function isNightTime(): boolean {
  const hour = new Date().getHours();
  return hour >= 22 || hour < 8;
}

export function isWeekend(): boolean {
  const day = new Date().getDay();
  return day === 0 || day === 6; // 0 = dimanche, 6 = samedi
}

export function hasSurcharge(): boolean {
  return isNightTime() || isWeekend();
}

export function getSurchargeLabel(): "night" | "weekend" | null {
  if (isNightTime()) return "night";
  if (isWeekend()) return "weekend";
  return null;
}

export function applySurcharge(price: number): number {
  return hasSurcharge() ? Math.round(price * 1.3) : price;
}

export const SURCHARGE_PERCENT = 30;
