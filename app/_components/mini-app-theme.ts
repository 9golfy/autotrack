export const FATHER_PROFILE_GROUP_ID = "Cc7dba355a1ec758b48ed0acd10bae9c5";

export const miniAppTheme = {
  layout: {
    page: "min-h-screen overflow-x-hidden bg-[#F7FAFF] font-sans text-[#0D47A1]",
    shell: "mx-auto min-h-screen max-w-[390px] overflow-x-hidden bg-[#F7FAFF]",
    header:
      "sticky top-0 z-40 border-b border-[#E3EDF8] bg-white/95 shadow-[0_6px_18px_rgba(13,71,161,0.04)] backdrop-blur",
    headerInner: "mx-auto flex h-[78px] max-w-[390px] items-center justify-center px-4",
    content: "px-4 pb-[calc(104px+env(safe-area-inset-bottom))] pt-3",
    contentWide: "px-4 pb-[calc(104px+env(safe-area-inset-bottom))] pt-3",
    maxWidth: "max-w-[390px]",
  },
  colors: {
    ink: "#0D47A1",
    title: "#082B5F",
    muted: "#5F718C",
    softMuted: "#7A8AA5",
    line: "#E3EDF8",
    page: "#F7FAFF",
    card: "#FFFFFF",
    primary: "#1976D2",
    primaryDark: "#0D47A1",
    primarySoft: "#EAF4FF",
    warning: "#FFB300",
    warningSoft: "#FEF3C7",
    danger: "#E53935",
    success: "#00C853",
    risk: "#FB8C00",
    violet: "#7C4DFF",
  },
  typography: {
    brandTitle: "mini-font-brand",
    title: "mini-font-title",
    sectionTitle: "mini-font-section",
    cardTitle: "mini-font-card-title",
    body: "mini-font-body",
    caption: "mini-font-caption",
    metricNumber: "mini-font-metric",
    nav: "mini-font-nav",
    badge: "mini-font-badge",
  },
  spacing: {
    pageX: "px-3",
    pageXWide: "px-4",
    card: "p-4",
    compactCard: "p-3",
    stack: "space-y-3",
  },
  radius: {
    navItem: "rounded-[14px]",
    input: "rounded-[14px]",
    card: "rounded-[20px]",
    largeCard: "rounded-[22px]",
    pill: "rounded-full",
  },
  icon: {
    brand: "h-[21px] w-[21px]",
    nav: "h-[21px] w-[21px]",
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-8 w-8",
  },
  image: {
    avatar: "h-[72px] w-[72px]",
    avatarSmall: "h-10 w-10",
    media: "max-h-[260px] w-full rounded-[16px] object-cover",
  },
  card: {
    base: "rounded-[20px] border border-[#E3EDF8] bg-white shadow-[0_8px_24px_rgba(13,71,161,0.05)]",
    elevated: "rounded-[20px] border border-[#E3EDF8] bg-white shadow-[0_12px_30px_rgba(13,71,161,0.08)]",
    soft: "rounded-[20px] border border-[#E3EDF8] bg-white shadow-[0_10px_26px_rgba(13,71,161,0.06)]",
    inset: "rounded-[16px] bg-[#F7FAFF]",
  },
  button: {
    primary:
      "rounded-[16px] bg-gradient-to-r from-[#1976D2] to-[#0D47A1] text-white shadow-[0_14px_28px_rgba(25,118,210,0.24)] transition active:scale-[0.98]",
    ghost:
      "rounded-[14px] border border-[#E3EDF8] bg-white text-[#0D47A1] shadow-[0_8px_18px_rgba(13,71,161,0.06)] transition active:scale-[0.98]",
  },
  healthStatus: {
    normal: { label: "ปกติ", bg: "#E8F5E9", text: "#008A39", dot: "#00C853" },
    watch: { label: "เฝ้าระวัง", bg: "#FFF8E1", text: "#B87900", dot: "#FFB300" },
    high: { label: "สูง", bg: "#FFF3E0", text: "#C25E00", dot: "#FB8C00" },
    consult: { label: "ควรปรึกษาแพทย์", bg: "#FFEBEE", text: "#C62828", dot: "#E53935" },
  },
  bottomNav: {
    shell:
      "fixed bottom-0 left-1/2 z-50 w-full max-w-[390px] -translate-x-1/2 rounded-t-[20px] border-t border-[#E3EDF8] bg-white/95 px-3 pb-[calc(10px+env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_24px_rgba(13,71,161,0.08)] backdrop-blur",
    item: "mini-font-nav flex flex-col items-center gap-1 rounded-[14px] px-2 py-2 transition active:scale-[0.98]",
    active: "bg-[#EAF4FF] text-[#1976D2]",
    inactive: "text-[#5F718C]",
  },
} as const;

export const thaiDateTimeFormatter = new Intl.DateTimeFormat("th-TH-u-nu-latn", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function formatMiniAppDateTime(timestamp: number | string | null | undefined) {
  const numericTimestamp = Number(timestamp);
  const date = Number.isFinite(numericTimestamp) ? new Date(numericTimestamp) : null;

  if (!date || Number.isNaN(date.getTime())) {
    return "ไม่ระบุเวลา";
  }

  return thaiDateTimeFormatter.format(date);
}
