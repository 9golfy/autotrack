const thaiDateFormatter = new Intl.DateTimeFormat("th-TH-u-nu-latn", {
  day: "numeric",
  month: "short",
  year: "2-digit",
});

const thaiClockFormatter = new Intl.DateTimeFormat("th-TH-u-nu-latn", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function formatClock(timestamp: number) {
  return thaiClockFormatter.format(timestamp);
}

export function formatDate(timestamp: number) {
  return thaiDateFormatter.format(timestamp);
}

export function formatDateTime(timestamp: number) {
  return `${formatDate(timestamp)} ${formatClock(timestamp)}`;
}
