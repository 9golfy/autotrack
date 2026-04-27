export type HealthSeverity = "normal" | "watch" | "danger" | "unknown";

export type HealthStatusLabel =
  | "เหมาะสม"
  | "ปกติ"
  | "สูงกว่าปกติ"
  | "เฝ้าระวัง"
  | "อันตราย"
  | "ไม่มีข้อมูล";

export type HealthThresholdResult = {
  label: HealthStatusLabel;
  severity: HealthSeverity;
  explanation: string;
};

export const HEALTH_THRESHOLD_CONFIG_TEXT = `
ระดับความดัน

1. ระดับเหมาะสม ค่าความดันโลหิต ระหว่างน้อยกว่า 120 / น้อยกว่า 80 มม.ปรอท
2. ระดับปกติ ค่าความดันโลหิต ระหว่าง 120-129 / 80-84 มม.ปรอท
3. ระดับสูงกว่าปกติ ค่าความดันโลหิต ระหว่าง 130-139 / 85-89 มม.ปรอท

ระดับความรุนแรงของกลุ่มโรคความดันโลหิตสูง

ระดับที่ 1 ความดันโลหิตสูงระยะเริ่มแรก ค่าความดันโลหิต ระหว่าง 140-159 / 90-99 มม.ปรอท
ระดับที่ 2 ความดันโลหิตสูงระยะปานกลาง ค่าความดันโลหิต ระหว่าง 160-179 / 100-109 มม.ปรอท
ระดับที่ 3 ความดันโลหิตสูงระยะรุนแรง ค่าความดันโลหิต มากกว่า 180 / 110 มม.ปรอท

ชีพจร (Heart Rate - bpm)
- ช่วงปกติ: 60-100 bpm
- ควรระวัง: ต่ำกว่า 60 หรือ สูงกว่า 100 ขณะพัก

อุณหภูมิร่างกาย (Temperature - °C)
- ช่วงปกติ: 36.5-37.4 °C
- เริ่มมีไข้ต่ำ: 37.5-38.4 °C
- มีไข้สูง: 38.5 °C ขึ้นไป

ออกซิเจนในเลือด (SpO2 - %)
- ปกติ: 96-100%
- เฝ้าระวัง: 93-95%
- ผิดปกติ (อันตราย): ต่ำกว่า 92%
`.trim();

export const HEALTH_THRESHOLDS = {
  bloodPressure: {
    optimal: { systolicMaxExclusive: 120, diastolicMaxExclusive: 80 },
    normal: { systolicMin: 120, systolicMax: 129, diastolicMin: 80, diastolicMax: 84 },
    highNormal: { systolicMin: 130, systolicMax: 139, diastolicMin: 85, diastolicMax: 89 },
    hypertensionStage1: {
      systolicMin: 140,
      systolicMax: 159,
      diastolicMin: 90,
      diastolicMax: 99,
    },
    hypertensionStage2: {
      systolicMin: 160,
      systolicMax: 179,
      diastolicMin: 100,
      diastolicMax: 109,
    },
    hypertensionStage3: { systolicMin: 180, diastolicMin: 110 },
  },
  heartRate: {
    normalMin: 60,
    normalMax: 100,
  },
  respiratoryRate: {
    normalMin: 12,
    normalMax: 24,
  },
  temperature: {
    normalMin: 36.5,
    normalMax: 37.4,
    lowFeverMin: 37.5,
    lowFeverMax: 38.4,
    highFeverMin: 38.5,
  },
  spo2: {
    normalMin: 96,
    watchMin: 93,
    watchMax: 95,
    dangerBelow: 92,
  },
} as const;

function isMissing(...values: Array<number | null | undefined>) {
  return values.some((value) => value === null || value === undefined || !Number.isFinite(value));
}

export function evaluateBloodPressure(
  systolic: number | null | undefined,
  diastolic: number | null | undefined,
): HealthThresholdResult {
  if (isMissing(systolic, diastolic)) {
    return { label: "ไม่มีข้อมูล", severity: "unknown", explanation: "ไม่มีข้อมูลความดันครบถ้วน" };
  }

  const sbp = systolic as number;
  const dbp = diastolic as number;

  if (
    sbp >= HEALTH_THRESHOLDS.bloodPressure.hypertensionStage3.systolicMin ||
    dbp >= HEALTH_THRESHOLDS.bloodPressure.hypertensionStage3.diastolicMin
  ) {
    return {
      label: "อันตราย",
      severity: "danger",
      explanation: "ความดันโลหิตสูงระดับที่ 3",
    };
  }

  if (
    (sbp >= HEALTH_THRESHOLDS.bloodPressure.hypertensionStage2.systolicMin &&
      sbp <= HEALTH_THRESHOLDS.bloodPressure.hypertensionStage2.systolicMax) ||
    (dbp >= HEALTH_THRESHOLDS.bloodPressure.hypertensionStage2.diastolicMin &&
      dbp <= HEALTH_THRESHOLDS.bloodPressure.hypertensionStage2.diastolicMax)
  ) {
    return {
      label: "เฝ้าระวัง",
      severity: "watch",
      explanation: "ความดันโลหิตสูงระดับที่ 2",
    };
  }

  if (
    (sbp >= HEALTH_THRESHOLDS.bloodPressure.highNormal.systolicMin &&
      sbp <= HEALTH_THRESHOLDS.bloodPressure.hypertensionStage1.systolicMax) ||
    (dbp >= HEALTH_THRESHOLDS.bloodPressure.highNormal.diastolicMin &&
      dbp <= HEALTH_THRESHOLDS.bloodPressure.hypertensionStage1.diastolicMax)
  ) {
    return {
      label: "สูงกว่าปกติ",
      severity: "watch",
      explanation: sbp >= 140 || dbp >= 90 ? "ความดันโลหิตสูงระดับที่ 1" : "ความดันโลหิตระดับสูงกว่าปกติ",
    };
  }

  if (
    sbp < HEALTH_THRESHOLDS.bloodPressure.optimal.systolicMaxExclusive &&
    dbp < HEALTH_THRESHOLDS.bloodPressure.optimal.diastolicMaxExclusive
  ) {
    return { label: "เหมาะสม", severity: "normal", explanation: "ความดันโลหิตระดับเหมาะสม" };
  }

  return { label: "ปกติ", severity: "normal", explanation: "ความดันโลหิตระดับปกติ" };
}

export function evaluateHeartRate(value: number | null | undefined): HealthThresholdResult {
  if (isMissing(value)) {
    return { label: "ไม่มีข้อมูล", severity: "unknown", explanation: "ไม่มีข้อมูลชีพจร" };
  }

  const heartRate = value as number;
  if (heartRate < HEALTH_THRESHOLDS.heartRate.normalMin || heartRate > HEALTH_THRESHOLDS.heartRate.normalMax) {
    return { label: "เฝ้าระวัง", severity: "watch", explanation: "ชีพจรอยู่นอกช่วงปกติขณะพัก" };
  }

  return { label: "ปกติ", severity: "normal", explanation: "ชีพจรอยู่ในช่วงปกติ" };
}

export function evaluateRespiratoryRate(value: number | null | undefined): HealthThresholdResult {
  if (isMissing(value)) {
    return { label: "ไม่มีข้อมูล", severity: "unknown", explanation: "ไม่มีข้อมูลอัตราการหายใจ" };
  }

  const respiratoryRate = value as number;
  if (
    respiratoryRate < HEALTH_THRESHOLDS.respiratoryRate.normalMin ||
    respiratoryRate > HEALTH_THRESHOLDS.respiratoryRate.normalMax
  ) {
    return { label: "เฝ้าระวัง", severity: "watch", explanation: "อัตราการหายใจอยู่นอกช่วงติดตาม" };
  }

  return { label: "ปกติ", severity: "normal", explanation: "อัตราการหายใจอยู่ในช่วงติดตามปกติ" };
}

export function evaluateTemperature(value: number | null | undefined): HealthThresholdResult {
  if (isMissing(value)) {
    return { label: "ไม่มีข้อมูล", severity: "unknown", explanation: "ไม่มีข้อมูลอุณหภูมิ" };
  }

  const temperature = value as number;
  if (temperature >= HEALTH_THRESHOLDS.temperature.highFeverMin) {
    return { label: "อันตราย", severity: "danger", explanation: "มีไข้สูง" };
  }

  if (temperature < HEALTH_THRESHOLDS.temperature.normalMin || temperature >= HEALTH_THRESHOLDS.temperature.lowFeverMin) {
    return { label: "เฝ้าระวัง", severity: "watch", explanation: "อุณหภูมิอยู่นอกช่วงปกติ" };
  }

  return { label: "ปกติ", severity: "normal", explanation: "อุณหภูมิอยู่ในช่วงปกติ" };
}

export function evaluateSpo2(value: number | null | undefined): HealthThresholdResult {
  if (isMissing(value)) {
    return { label: "ไม่มีข้อมูล", severity: "unknown", explanation: "ไม่มีข้อมูลออกซิเจนในเลือด" };
  }

  const spo2 = value as number;
  if (spo2 < HEALTH_THRESHOLDS.spo2.dangerBelow) {
    return { label: "อันตราย", severity: "danger", explanation: "ออกซิเจนในเลือดต่ำกว่าเกณฑ์อันตราย" };
  }

  if (spo2 >= HEALTH_THRESHOLDS.spo2.watchMin && spo2 <= HEALTH_THRESHOLDS.spo2.watchMax) {
    return { label: "เฝ้าระวัง", severity: "watch", explanation: "ออกซิเจนในเลือดเริ่มต่ำกว่ามาตรฐาน" };
  }

  return { label: "ปกติ", severity: "normal", explanation: "ออกซิเจนในเลือดอยู่ในช่วงปกติ" };
}

export function getOverallHealthSeverity(results: HealthThresholdResult[]): HealthSeverity {
  if (results.some((result) => result.severity === "danger")) {
    return "danger";
  }

  if (results.some((result) => result.severity === "watch")) {
    return "watch";
  }

  return "normal";
}

export function healthSeverityToStatusLabel(severity: HealthSeverity): "ปกติ" | "เฝ้าระวัง" | "อันตราย" {
  if (severity === "danger") {
    return "อันตราย";
  }

  if (severity === "watch") {
    return "เฝ้าระวัง";
  }

  return "ปกติ";
}

export function healthSeverityToTone(severity: HealthSeverity): "green" | "orange" | "red" {
  if (severity === "danger") {
    return "red";
  }

  if (severity === "watch") {
    return "orange";
  }

  return "green";
}
