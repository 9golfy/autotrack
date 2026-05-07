import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

import { getSupabaseAdminClient } from "@/services/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DOCUMENT_BUCKET = "member-documents";

type MemberRow = {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string | null;
  care_level: string;
  contact_phone: string | null;
  contact_email: string | null;
  bp_sys: number | null;
  bp_dia: number | null;
  heart_rate: number | null;
  temperature: number | null;
  weight: number | null;
  note: string | null;
  profile_image_url: string | null;
  contract_url: string | null;
  consent_url: string | null;
  consent_version: string | null;
  line_status: string;
  line_group_id: string | null;
  caregiver_line_id: string | null;
  family_line_id: string | null;
  created_at: string;
  updated_at: string | null;
};

type ApiError = { message: string };
type MembersSelectQuery = {
  order: (column: string, options: { ascending: boolean }) => Promise<{ data: MemberRow[] | null; error: ApiError | null }>;
};
type MembersInsertQuery = {
  select: (columns: string) => { single: () => Promise<{ data: MemberRow | null; error: ApiError | null }> };
};
type MembersTable = {
  select: (columns: string) => MembersSelectQuery;
  insert: (payload: Record<string, unknown>) => MembersInsertQuery;
};

function getMembersTable() {
  return getSupabaseAdminClient().from("members") as unknown as MembersTable;
}

function nullableString(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function requiredString(formData: FormData, key: string) {
  const value = nullableString(formData.get(key));

  if (!value) {
    throw new Error(`${key} is required`);
  }

  return value;
}

function nullableNumber(value: FormDataEntryValue | null) {
  const rawValue = nullableString(value);

  if (!rawValue) {
    return null;
  }

  const numericValue = Number(rawValue);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function toMember(row: MemberRow) {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    dateOfBirth: row.date_of_birth,
    gender: row.gender ?? "",
    careLevel: row.care_level,
    contactPhone: row.contact_phone ?? "",
    contactEmail: row.contact_email ?? "",
    bloodPressureSys: row.bp_sys?.toString() ?? "",
    bloodPressureDia: row.bp_dia?.toString() ?? "",
    heartRate: row.heart_rate?.toString() ?? "",
    temperature: row.temperature?.toString() ?? "",
    weight: row.weight?.toString() ?? "",
    note: row.note ?? "",
    profileImageUrl: row.profile_image_url ?? "",
    contractUrl: row.contract_url ?? "",
    consentUrl: row.consent_url ?? "",
    consentVersion: row.consent_version ?? "",
    lineStatus: row.line_status,
    lineGroupId: row.line_group_id ?? "",
    caregiverLineId: row.caregiver_line_id ?? "",
    familyLineId: row.family_line_id ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

async function uploadFile(file: File | null, prefix: string, allowedType: "application/pdf" | "image") {
  if (!file || file.size === 0) {
    return null;
  }

  if (allowedType === "application/pdf" && file.type !== "application/pdf") {
    throw new Error(`${prefix} must be a PDF file`);
  }

  if (allowedType === "image" && !file.type.startsWith("image/")) {
    throw new Error(`${prefix} must be an image file`);
  }

  const supabase = getSupabaseAdminClient();
  const path = `${prefix}/${randomUUID()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
  const { error } = await supabase.storage.from(DOCUMENT_BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from(DOCUMENT_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function GET() {
  const { data, error } = await getMembersTable().select("*").order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ members: (data ?? []).map(toMember) });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const consentVersion = nullableString(formData.get("consentVersion")) ?? new Date().toISOString();
    const [profileImageUrl, contractUrl, consentUrl] = await Promise.all([
      uploadFile(formData.get("profileImageFile") as File | null, "profiles", "image"),
      uploadFile(formData.get("contractFile") as File | null, "contracts", "application/pdf"),
      uploadFile(formData.get("consentFile") as File | null, "consents", "application/pdf"),
    ]);

    const payload = {
      first_name: requiredString(formData, "firstName"),
      last_name: requiredString(formData, "lastName"),
      date_of_birth: requiredString(formData, "dateOfBirth"),
      gender: nullableString(formData.get("gender")),
      care_level: requiredString(formData, "careLevel"),
      contact_phone: nullableString(formData.get("contactPhone")),
      contact_email: nullableString(formData.get("contactEmail")),
      bp_sys: nullableNumber(formData.get("bloodPressureSys")),
      bp_dia: nullableNumber(formData.get("bloodPressureDia")),
      heart_rate: nullableNumber(formData.get("heartRate")),
      temperature: nullableNumber(formData.get("temperature")),
      weight: nullableNumber(formData.get("weight")),
      note: nullableString(formData.get("note")),
      profile_image_url: profileImageUrl,
      contract_url: contractUrl,
      consent_url: consentUrl,
      consent_version: consentVersion,
      line_status: nullableString(formData.get("lineStatus")) ?? "NOT_CONNECTED",
      line_group_id: nullableString(formData.get("lineGroupId")),
      caregiver_line_id: nullableString(formData.get("caregiverLineId")),
      family_line_id: nullableString(formData.get("familyLineId")),
    };

    const { data, error } = await getMembersTable().insert(payload).select("*").single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Unable to create member" }, { status: 500 });
    }

    return NextResponse.json({ member: toMember(data) }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create member" },
      { status: 400 },
    );
  }
}
