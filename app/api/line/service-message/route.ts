import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const LINE_API = "https://api.line.me";

type VerifyLiffTokenResponse = {
  client_id?: string;
};

type ChannelAccessTokenResponse = {
  access_token?: string;
};

type NotificationTokenResponse = {
  notificationToken?: string;
};

async function verifyLiffAccessToken(liffAccessToken: string) {
  const response = await fetch(
    `${LINE_API}/oauth2/v2.1/verify?access_token=${encodeURIComponent(liffAccessToken)}`,
    {
      method: "GET",
      cache: "no-store",
    },
  );

  const data = (await response.json()) as VerifyLiffTokenResponse & { error_description?: string };

  if (!response.ok || !data.client_id) {
    throw new Error(data.error_description ?? "Unable to verify LIFF access token");
  }

  return data.client_id;
}

async function issueChannelAccessToken(channelId: string, channelSecret: string) {
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: channelId,
    client_secret: channelSecret,
  });

  const response = await fetch(`${LINE_API}/oauth2/v3/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  const data = (await response.json()) as ChannelAccessTokenResponse & {
    error_description?: string;
  };

  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description ?? "Unable to issue LINE channel access token");
  }

  return data.access_token;
}

async function issueServiceNotificationToken(channelAccessToken: string, liffAccessToken: string) {
  const response = await fetch(`${LINE_API}/message/v3/notifier/token`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${channelAccessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ liffAccessToken }),
    cache: "no-store",
  });

  const data = (await response.json()) as NotificationTokenResponse & {
    message?: string;
    details?: unknown;
  };

  if (!response.ok || !data.notificationToken) {
    throw new Error(data.message ?? "Unable to issue service notification token");
  }

  return data.notificationToken;
}

export async function POST(request: NextRequest) {
  const channelId = process.env.LINE_CHANNEL_ID?.trim();
  const channelSecret = process.env.LINE_CHANNEL_SECRET?.trim();

  if (!channelId || !channelSecret) {
    return NextResponse.json(
      { error: "Missing LINE_CHANNEL_ID or LINE_CHANNEL_SECRET" },
      { status: 500 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    liffAccessToken?: string;
    templateName?: string;
    params?: Record<string, string>;
  };

  const liffAccessToken = body.liffAccessToken?.trim();
  const templateName = body.templateName?.trim() || "couponnoti_s_c_th";
  const params = body.params ?? { btn1_url: "https://autotrack-phi.vercel.app/liff" };

  if (!liffAccessToken) {
    return NextResponse.json({ error: "LIFF access token is required" }, { status: 400 });
  }

  try {
    const verifiedChannelId = await verifyLiffAccessToken(liffAccessToken);

    if (verifiedChannelId !== channelId) {
      return NextResponse.json({ error: "Invalid LIFF access token" }, { status: 401 });
    }

    const channelAccessToken = await issueChannelAccessToken(channelId, channelSecret);
    const notificationToken = await issueServiceNotificationToken(
      channelAccessToken,
      liffAccessToken,
    );

    const response = await fetch(`${LINE_API}/message/v3/notifier/send?target=service`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${channelAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        templateName,
        params,
        notificationToken,
      }),
      cache: "no-store",
    });

    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "LINE service message request failed",
          details: data,
        },
        { status: response.status },
      );
    }

    return NextResponse.json({
      ok: true,
      templateName,
      result: data,
    });
  } catch (error) {
    console.error("Failed to send LINE service message", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unexpected service message error",
      },
      { status: 500 },
    );
  }
}
