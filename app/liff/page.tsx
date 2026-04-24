/* eslint-disable @next/next/no-img-element */
"use client";

import liff from "@line/liff";
import { useEffect, useMemo, useState } from "react";

type LiffProfile = {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
};

type DecodedIdToken = {
  email?: string;
  sub?: string;
  name?: string;
};

type EnvironmentInfo = {
  os: string;
  language: string;
  sdkVersion: string;
  lineVersion: string;
  isInClient: string;
  isLoggedIn: string;
};

function truncate(value: string | null | undefined, head = 24, tail = 12) {
  if (!value) {
    return "Unavailable";
  }

  if (value.length <= head + tail + 3) {
    return value;
  }

  return `${value.slice(0, head)}...${value.slice(-tail)}`;
}

function getSdkVersion() {
  try {
    const versionSource = liff as unknown as { _sdkVersion?: string; version?: string };
    return versionSource._sdkVersion ?? versionSource.version ?? "Detected at runtime";
  } catch {
    return "Detected at runtime";
  }
}

async function logEvent(payload: {
  event: string;
  userId?: string;
  displayName?: string;
  email?: string;
  statusMessage?: string;
  pictureUrl?: string;
  text?: string;
  rawPayload?: unknown;
}) {
  await fetch("/api/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...payload,
      source: "liff",
    }),
  });
}

export default function LiffPage() {
  const [profile, setProfile] = useState<LiffProfile | null>(null);
  const [idToken, setIdToken] = useState<DecodedIdToken | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [environment, setEnvironment] = useState<EnvironmentInfo>({
    os: "Loading",
    language: "Loading",
    sdkVersion: "Loading",
    lineVersion: "Loading",
    isInClient: "Loading",
    isLoggedIn: "Loading",
  });
  const [isReady, setIsReady] = useState(false);
  const [feedback, setFeedback] = useState("Initializing LIFF...");
  const [actionState, setActionState] = useState<string | null>(null);

  const liffId = process.env.NEXT_PUBLIC_LIFF_ID;

  useEffect(() => {
    let isMounted = true;

    async function initLiff() {
      if (!liffId) {
        if (isMounted) {
          setFeedback("Add NEXT_PUBLIC_LIFF_ID to start the LIFF app.");
          setEnvironment((current) => ({
            ...current,
            sdkVersion: "Missing LIFF ID",
            isLoggedIn: "No",
          }));
        }
        return;
      }

      try {
        await liff.init({ liffId });

        if (!liff.isLoggedIn()) {
          liff.login({ redirectUri: window.location.href });
          return;
        }

        const [resolvedProfile, resolvedIdToken] = await Promise.all([
          liff.getProfile(),
          Promise.resolve(liff.getDecodedIDToken() as DecodedIdToken | null),
        ]);

        const resolvedAccessToken = liff.getAccessToken();

        if (!isMounted) {
          return;
        }

        setProfile(resolvedProfile);
        setIdToken(resolvedIdToken);
        setAccessToken(resolvedAccessToken);
        setEnvironment({
          os: liff.getOS() ?? "Unavailable",
          language: liff.getLanguage() ?? "Unavailable",
          sdkVersion: getSdkVersion(),
          lineVersion: liff.getLineVersion() || "Unavailable",
          isInClient: liff.isInClient() ? "Yes" : "No",
          isLoggedIn: liff.isLoggedIn() ? "Yes" : "No",
        });
        setIsReady(true);
        setFeedback("LIFF is ready inside LINE.");

        void logEvent({
          event: "liff-profile",
          userId: resolvedProfile.userId,
          displayName: resolvedProfile.displayName,
          email: resolvedIdToken?.email,
          statusMessage: resolvedProfile.statusMessage,
          pictureUrl: resolvedProfile.pictureUrl,
          rawPayload: {
            profile: resolvedProfile,
            idToken: resolvedIdToken
              ? {
                  email: resolvedIdToken.email,
                  sub: resolvedIdToken.sub,
                  name: resolvedIdToken.name,
                }
              : null,
          },
        }).catch((error) => {
          console.error("Failed to sync LIFF profile", error);
        });
      } catch (error) {
        console.error(error);

        if (isMounted) {
          setFeedback("LIFF initialization failed. Open this page inside LINE and verify the LIFF ID.");
          setEnvironment((current) => ({
            ...current,
            sdkVersion: "Initialization failed",
            isLoggedIn: "Unknown",
          }));
        }
      }
    }

    void initLiff();

    return () => {
      isMounted = false;
    };
  }, [liffId]);

  const profileEmail = idToken?.email ?? "Email scope not available";
  const profileUserId = profile?.userId ?? idToken?.sub ?? "Unavailable";

  const sections = useMemo(
    () => [
      { label: "OS", value: environment.os },
      { label: "App language", value: environment.language },
      { label: "SDK version", value: environment.sdkVersion },
      { label: "LINE version", value: environment.lineVersion },
      { label: "Is in client", value: environment.isInClient },
      { label: "Is logged in", value: environment.isLoggedIn },
    ],
    [environment],
  );

  async function handleSendMessages() {
    try {
      await liff.sendMessages([
        {
          type: "text",
          text: "Hello from AutoTrack LIFF",
        },
      ]);

      void logEvent({
        event: "liff-message",
        userId: profile?.userId,
        displayName: profile?.displayName,
        email: idToken?.email,
        statusMessage: profile?.statusMessage,
        pictureUrl: profile?.pictureUrl,
        text: "Hello from AutoTrack LIFF",
        rawPayload: {
          action: "sendMessages",
        },
      }).catch((error) => {
        console.error("Failed to log LIFF message", error);
      });

      setActionState("Message sent from LIFF.");
    } catch (error) {
      console.error(error);
      setActionState("Unable to send LIFF message.");
    }
  }

  async function handleShareTargetPicker() {
    try {
      await liff.shareTargetPicker([
        {
          type: "text",
          text: "Share from AutoTrack",
        },
      ]);

      void logEvent({
        event: "liff-share",
        userId: profile?.userId,
        displayName: profile?.displayName,
        email: idToken?.email,
        rawPayload: {
          action: "shareTargetPicker",
        },
      }).catch((error) => {
        console.error("Failed to log LIFF share event", error);
      });

      setActionState("Share Target Picker opened.");
    } catch (error) {
      console.error(error);
      setActionState("Share Target Picker is unavailable in this context.");
    }
  }

  async function handleScanQrCode() {
    try {
      const result = await liff.scanCodeV2();

      void logEvent({
        event: "liff-qr-scan",
        userId: profile?.userId,
        displayName: profile?.displayName,
        email: idToken?.email,
        text: result.value ?? "QR scan completed",
        rawPayload: result,
      }).catch((error) => {
        console.error("Failed to log LIFF QR event", error);
      });

      setActionState(result.value ? `QR code: ${result.value}` : "QR scan completed.");
    } catch (error) {
      console.error(error);
      setActionState("QR scan is unavailable on this device.");
    }
  }

  async function handleAddShortcut() {
    try {
      await liff.createShortcutOnHomeScreen({
        url: window.location.href,
      });
      setActionState("Shortcut flow opened.");
    } catch (error) {
      console.error(error);
      setActionState("Shortcut is unavailable on this device.");
    }
  }

  function handleOpenWindow() {
    liff.openWindow({
      url: `${window.location.origin}/`,
      external: false,
    });
  }

  function handleCloseWindow() {
    if (liff.isInClient()) {
      liff.closeWindow();
      return;
    }

    setActionState("Close Window works only inside the LINE client.");
  }

  return (
    <main className="min-h-screen bg-[#f6f7fb] px-4 py-5 text-slate-900">
      <div className="mx-auto max-w-6xl space-y-4">
        <section className="rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <h1 className="text-4xl font-semibold tracking-tight text-slate-950">AutoTrack</h1>
              <p className="max-w-xl text-sm leading-6 text-slate-500">
                After login, fetch data from the LINE API and mirror key activity back into the
                main dashboard.
              </p>
            </div>

            <div className="flex items-start gap-3 rounded-3xl bg-slate-50 p-3 sm:min-w-[280px]">
              <div className="relative h-14 w-14 overflow-hidden rounded-full bg-slate-200">
                {profile?.pictureUrl ? (
                  <img
                    src={profile.pictureUrl}
                    alt={profile.displayName}
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>
              <div className="min-w-0 space-y-1 text-sm">
                <p className="truncate font-semibold text-slate-900">
                  {profile?.displayName ?? "[Display name]"}
                </p>
                <p className="truncate text-slate-500">{profileEmail}</p>
                <p className="truncate text-slate-500">{profileUserId}</p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
          <div className="space-y-4">
            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-950">Environment</h2>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                  LIFF
                </span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {sections.map((item) => (
                  <div key={item.label} className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                      {item.label}
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-900">{item.value}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">Profile</h2>
              <div className="mt-4 flex items-start gap-4">
                <div className="relative h-20 w-20 overflow-hidden rounded-full bg-slate-200">
                  {profile?.pictureUrl ? (
                    <img
                      src={profile.pictureUrl}
                      alt={profile.displayName}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                      Display name
                    </p>
                    <p className="mt-1 truncate text-sm font-medium text-slate-900">
                      {profile?.displayName ?? "Unavailable"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">User ID</p>
                    <p className="mt-1 truncate text-sm font-medium text-slate-900">
                      {profileUserId}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                      Status message
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-900">
                      {profile?.statusMessage ?? "No status message"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Email</p>
                    <p className="mt-1 truncate text-sm font-medium text-slate-900">
                      {profileEmail}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">Authentication</h2>
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                    Access Token
                  </p>
                  <p className="mt-2 break-all text-sm text-slate-900">
                    {truncate(accessToken, 32, 18)}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">ID Token</p>
                  <p className="mt-2 break-all text-sm text-slate-900">
                    {truncate(JSON.stringify(idToken), 48, 18)}
                  </p>
                </div>
              </div>
            </section>
          </div>

          <div className="space-y-4">
            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">Message</h2>
              <div className="mt-4 grid gap-3">
                <button
                  type="button"
                  onClick={() => void handleSendMessages()}
                  disabled={!isReady}
                  className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  Send Messages
                </button>
                <button
                  type="button"
                  onClick={() => void handleShareTargetPicker()}
                  disabled={!isReady}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
                >
                  Share Target Picker
                </button>
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">Camera</h2>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => void handleScanQrCode()}
                  disabled={!isReady}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
                >
                  Scan QR Code
                </button>
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">Window</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handleOpenWindow}
                  disabled={!isReady}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
                >
                  Open Window
                </button>
                <button
                  type="button"
                  onClick={handleCloseWindow}
                  disabled={!isReady}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
                >
                  Close Window
                </button>
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">Shortcut</h2>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => void handleAddShortcut()}
                  disabled={!isReady}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
                >
                  Add Shortcut
                </button>
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">Status</h2>
              <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <p>{actionState ?? feedback}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-400">
                  Dashboard URL: / | LIFF URL: /liff
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
