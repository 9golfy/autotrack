import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

import { getSupabaseAdminClient } from "@/services/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DOCUMENT_BUCKET = "member-documents";

type ApiError = { message: string };
type MembersMutationQuery = {
  eq: (column: string, value: string) => Promise<{ error: ApiError | null }>;
};
type MembersTable = {
  update: (payload: Record<string, unknown>) => MembersMutationQuery;
  delete: () => MembersMutationQuery;
};

function getMembersTable() {
  return getSupabaseAdminClient().from("members") as unknown as MembersTable;
}

function nullableString(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function nullableNumber(value: FormDataEntryValue | null) {
  const rawValue = nullableString(value);

  if (!rawValue) {
    return null;
  }

  const numericValue = Number(rawValue);
  return Number.isFinite(numericValue) ? numericValue : null;
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

export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;
    const formData = await request.formData();
    const [profileImageUrl, contractUrl, consentUrl] = await Promise.all([
      uploadFile(formData.get("profileImageFile") as File | null, "profiles", "image"),
      uploadFile(formData.get("contractFile") as File | null, "contracts", "application/pdf"),
      uploadFile(formData.get("consentFile") as File | null, "consents", "application/pdf"),
    ]);

    const payload: Record<string, unknown> = {
      first_name: nullableString(formData.get("firstName")),
      last_name: nullableString(formData.get("lastName")),
      date_of_birth: nullableString(formData.get("dateOfBirth")),
      gender: nullableString(formData.get("gender")),
      care_level: nullableString(formData.get("careLevel")),
      contact_phone: nullableString(formData.get("contactPhone")),
      contact_email: nullableString(formData.get("contactEmail")),
      bp_sys: nullableNumber(formData.get("bloodPressureSys")),
      bp_dia: nullableNumber(formData.get("bloodPressureDia")),
      heart_rate: nullableNumber(formData.get("heartRate")),
      temperature: nullableNumber(formData.get("temperature")),
      weight: nullableNumber(formData.get("weight")),
      note: nullableString(formData.get("note")),
      consent_version: nullableString(formData.get("consentVersion")),
      line_status: nullableString(formData.get("lineStatus")),
      line_group_id: nullableString(formData.get("lineGroupId")),
      caregiver_line_id: nullableString(formData.get("caregiverLineId")),
      family_line_id: nullableString(formData.get("familyLineId")),
      updated_at: new Date().toISOString(),
    };

    if (profileImageUrl) payload.profile_image_url = profileImageUrl;
    if (contractUrl) payload.contract_url = contractUrl;
    if (consentUrl) payload.consent_url = consentUrl;

    const { error } = await getMembersTable().update(payload).eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update member" },
      { status: 400 },
    );
  }
}

export async function DELETE(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const { error } = await getMembersTable().delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
