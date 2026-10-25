import { safeExternalUrl } from "./market-context";

export type NewsEvent = {
  title: string;
  currency: string;
  date: string;
  time: string;
  instant: string;
  impact: "High" | "Medium";
  forecast: string;
  previous: string;
  url: string;
};

/** The JSON feed includes an explicit UTC offset; never guess the XML feed's timezone. */
export function parseCalendarEvents(value: unknown): NewsEvent[] {
  if (!Array.isArray(value)) throw new Error("The calendar response is not an event list");
  return value.slice(0, 1500).flatMap((item: unknown) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    if (
      typeof row["title"] !== "string" ||
      !row["title"].trim() ||
      typeof row["date"] !== "string" ||
      !/(Z|[+-]\d{2}:\d{2})$/i.test(row["date"]) ||
      !Number.isFinite(Date.parse(row["date"])) ||
      typeof row["country"] !== "string" ||
      !["EUR", "USD", "GBP", "JPY"].includes(row["country"]) ||
      (row["impact"] !== "High" && row["impact"] !== "Medium")
    )
      return [];
    const at = new Date(row["date"]);
    const field = (key: string) =>
      typeof row[key] === "string" || typeof row[key] === "number"
        ? String(row[key]).slice(0, 160)
        : "";
    const iso = at.toISOString();
    return [
      {
        title: row["title"].slice(0, 300),
        currency: row["country"],
        date: `${iso.slice(5, 7)}-${iso.slice(8, 10)}-${iso.slice(0, 4)}`,
        time: at
          .toLocaleTimeString("en-US", {
            timeZone: "UTC",
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          })
          .replace(" ", "")
          .toLowerCase(),
        instant: iso,
        impact: row["impact"],
        forecast: field("forecast"),
        previous: field("previous"),
        url: safeExternalUrl(row["url"]) ?? "",
      },
    ];
  });
}
