export type CareLevel = "strong" | "independent" | "close_care" | "bedridden";
export type LineStatus = "CONNECTED" | "NOT_CONNECTED";

export type MemberRecord = {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  careLevel: CareLevel;
  contactPhone: string;
  contactEmail: string;
  bloodPressureSys: string;
  bloodPressureDia: string;
  heartRate: string;
  temperature: string;
  weight: string;
  note: string;
  profileImageUrl: string;
  contractUrl: string;
  consentUrl: string;
  consentVersion: string;
  lineStatus: LineStatus;
  lineGroupId: string;
  caregiverLineId: string;
  familyLineId: string;
  createdAt: string;
  updatedAt: string;
};

export type MemberFormValues = Omit<MemberRecord, "id" | "contractUrl" | "consentUrl" | "createdAt" | "updatedAt">;
