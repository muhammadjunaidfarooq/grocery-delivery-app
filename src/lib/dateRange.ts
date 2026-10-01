// Date ranges for the admin dashboard, calculated in Pakistan time.
// Pakistan has no daylight saving time, so the offset is always +05:00.

export type DashboardRange = "all" | "today" | "month" | "year";

export const DASHBOARD_TIMEZONE = "Asia/Karachi";
const OFFSET = "+05:00";
const OFFSET_MS = 5 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function parseRange(value: string | null): DashboardRange | null {
  if (value === null) return "all";
  return ["all", "today", "month", "year"].includes(value)
    ? (value as DashboardRange)
    : null;
}

const pad = (n: number) => String(n).padStart(2, "0");

// Shift a date by +5 hours so the UTC getters return Pakistan wall-clock time
const pkt = (date: Date) => new Date(date.getTime() + OFFSET_MS);

/** First moment of the range in Pakistan time, or null for "all". */
export function getRangeStart(
  range: DashboardRange,
  now: Date = new Date(),
): Date | null {
  if (range === "all") return null;
  const p = pkt(now);
  const y = p.getUTCFullYear();
  const m = pad(p.getUTCMonth() + 1);
  const d = pad(p.getUTCDate());
  if (range === "today") return new Date(`${y}-${m}-${d}T00:00:00${OFFSET}`);
  if (range === "month") return new Date(`${y}-${m}-01T00:00:00${OFFSET}`);
  return new Date(`${y}-01-01T00:00:00${OFFSET}`);
}

export type BucketUnit = "hour" | "day" | "month";

/** How the revenue chart is grouped for each range. */
export function getBucketUnit(range: DashboardRange): BucketUnit {
  if (range === "today") return "hour";
  if (range === "month") return "day";
  return "month";
}

/** MongoDB $dateToString format that produces the same keys as buildBuckets. */
export function getBucketFormat(unit: BucketUnit): string {
  if (unit === "hour") return "%Y-%m-%d %H";
  if (unit === "day") return "%Y-%m-%d";
  return "%Y-%m";
}

export interface Bucket {
  key: string;
  label: string;
}

/** Every bucket from start to now (so days with no orders show as zero). */
export function buildBuckets(
  unit: BucketUnit,
  start: Date,
  now: Date = new Date(),
): Bucket[] {
  const buckets: Bucket[] = [];

  if (unit === "month") {
    const s = pkt(start);
    const e = pkt(now);
    let y = s.getUTCFullYear();
    let m = s.getUTCMonth();
    const endY = e.getUTCFullYear();
    const endM = e.getUTCMonth();
    while (y < endY || (y === endY && m <= endM)) {
      buckets.push({
        key: `${y}-${pad(m + 1)}`,
        label: `${MONTHS[m]} ${String(y).slice(2)}`,
      });
      m++;
      if (m > 11) {
        m = 0;
        y++;
      }
    }
    return buckets;
  }

  const step = unit === "hour" ? HOUR_MS : DAY_MS;
  for (let t = start.getTime(); t <= now.getTime(); t += step) {
    const p = pkt(new Date(t));
    const date = `${p.getUTCFullYear()}-${pad(p.getUTCMonth() + 1)}-${pad(p.getUTCDate())}`;
    if (unit === "hour") {
      buckets.push({
        key: `${date} ${pad(p.getUTCHours())}`,
        label: `${pad(p.getUTCHours())}:00`,
      });
    } else {
      buckets.push({
        key: date,
        label: `${p.getUTCDate()} ${MONTHS[p.getUTCMonth()]}`,
      });
    }
  }
  return buckets;
}
