"use client";

import liff from "@line/liff";
import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";

import { getFirebaseDb, hasFirebaseConfig } from "@/lib/firebase/client";

type LiffProfile = {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
};

type ServiceMessageResponse = {
  ok?: boolean;
  error?: string;
  details?: unknown;
  result?: unknown;
  templateName?: string;
};

type FirebaseEventRecord = {
  id: string;
  displayName: string | null;
  userId: string | null;
  statusMessage: string | null;
  accessTokenPreview: string | null;
  eventType: string;
  createdAtLabel: string;
};

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string) {
  return Promise.race<T>([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => {
        reject(new Error(message));
      }, timeoutMs);
    }),
  ]);
}

function truncate(value: string | null | undefined, head = 22, tail = 10) {
  if (!value) {
    return "Unavailable";
  }

  if (value.length <= head + tail + 3) {
    return value;
  }

  return `${value.slice(0, head)}...${value.slice(-tail)}`;
}

export default function MiniTestPage() {
  const [profile, setProfile] = useState<LiffProfile | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [status, setStatus] = useState("Initializing LIFF...");
  const [isReady, setIsReady] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSyncingFirebase, setIsSyncingFirebase] = useState(false);
  const [firebaseStatus, setFirebaseStatus] = useState(
    hasFirebaseConfig()
      ? "Firebase is configured. You can sync LIFF session data."
      : "Add NEXT_PUBLIC_FIREBASE_* variables to enable Firestore logging.",
  );
  const [firebaseEvents, setFirebaseEvents] = useState<FirebaseEventRecord[]>([]);
  const [templateName, setTemplateName] = useState("couponnoti_s_c_th");
  const [buttonUrl, setButtonUrl] = useState("https://autotrack-phi.vercel.app/liff");
  const [result, setResult] = useState<string>("");

  const liffId = process.env.NEXT_PUBLIC_LIFF_ID;

  useEffect(() => {
    let active = true;

    async function init() {
      if (!liffId) {
        setStatus("Add NEXT_PUBLIC_LIFF_ID before opening this mini app page.");
        return;
      }

      try {
        await liff.init({ liffId });

        if (!liff.isLoggedIn()) {
          liff.login({ redirectUri: window.location.href });
          return;
        }

        const [resolvedProfile, resolvedAccessToken] = await Promise.all([
          liff.getProfile(),
          Promise.resolve(liff.getAccessToken()),
        ]);

        if (!active) {
          return;
        }

        setProfile(resolvedProfile);
        setAccessToken(resolvedAccessToken);
        setIsReady(true);
        setStatus("LIFF is ready. You can test service message delivery now.");
      } catch (error) {
        console.error(error);
        if (active) {
          setStatus("LIFF initialization failed. Open this page inside LINE and verify the LIFF ID.");
        }
      }
    }

    void init();

    return () => {
      active = false;
    };
  }, [liffId]);

  useEffect(() => {
    void loadFirebaseEvents();
  }, []);

  async function loadFirebaseEvents() {
    if (!hasFirebaseConfig()) {
      return;
    }

    try {
      const db = getFirebaseDb();
      const eventQuery = query(
        collection(db, "mini_app_events"),
        orderBy("createdAt", "desc"),
        limit(8),
      );

      const snapshot = await withTimeout(
        getDocs(eventQuery),
        12000,
        "Firestore read timed out. Check Firestore database, rules, or webview network behavior.",
      );
      const records = snapshot.docs.map((doc) => {
        const data = doc.data() as {
          displayName?: string | null;
          userId?: string | null;
          statusMessage?: string | null;
          accessTokenPreview?: string | null;
          eventType?: string;
          createdAtClient?: string;
        };

        return {
          id: doc.id,
          displayName: data.displayName ?? null,
          userId: data.userId ?? null,
          statusMessage: data.statusMessage ?? null,
          accessTokenPreview: data.accessTokenPreview ?? null,
          eventType: data.eventType ?? "unknown",
          createdAtLabel: data.createdAtClient
            ? new Date(data.createdAtClient).toLocaleString()
            : "Pending timestamp",
        };
      });

      setFirebaseEvents(records);
    } catch (error) {
      console.error(error);
      setFirebaseStatus(
        error instanceof Error
          ? error.message
          : "Unable to read Firestore. Check Firebase env vars and Firestore rules.",
      );
    }
  }

  async function handleSyncFirebase() {
    if (!hasFirebaseConfig()) {
      setFirebaseStatus("Firebase config is missing. Add NEXT_PUBLIC_FIREBASE_* vars first.");
      return;
    }

    if (!profile) {
      setFirebaseStatus("LIFF profile is not ready yet.");
      return;
    }

    setIsSyncingFirebase(true);

    try {
      const db = getFirebaseDb();
      await withTimeout(
        addDoc(collection(db, "mini_app_events"), {
          eventType: "autocheckuser-session",
          displayName: profile.displayName ?? null,
          userId: profile.userId ?? null,
          statusMessage: profile.statusMessage ?? null,
          pictureUrl: profile.pictureUrl ?? null,
          accessTokenPreview: accessToken ? truncate(accessToken, 18, 10) : null,
          source: "autocheckuser",
          createdAt: serverTimestamp(),
          createdAtClient: new Date().toISOString(),
        }),
        12000,
        "Firestore write timed out. Create Firestore Database and relax Rules for testing first.",
      );

      setFirebaseStatus("Saved LIFF session snapshot to Firestore.");
      await loadFirebaseEvents();
    } catch (error) {
      console.error(error);
      setFirebaseStatus(
        error instanceof Error
          ? error.message
          : "Failed to write to Firestore. Review Firebase config and security rules.",
      );
    } finally {
      setIsSyncingFirebase(false);
    }
  }

  async function handleSendServiceMessage() {
    if (!accessToken) {
      setResult("Missing LIFF access token.");
      return;
    }

    setIsSending(true);
    setResult("");

    try {
      const response = await fetch("/api/line/service-message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          liffAccessToken: accessToken,
          templateName,
          params: {
            btn1_url: buttonUrl,
          },
        }),
      });

      const data = (await response.json()) as ServiceMessageResponse;

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to send service message");
      }

      setResult(JSON.stringify(data, null, 2));
      setStatus("Service message request sent successfully.");
    } catch (error) {
      console.error(error);
      setResult(
        JSON.stringify(
          {
            error: error instanceof Error ? error.message : "Unexpected error",
          },
          null,
          2,
        ),
      );
      setStatus("Service message request failed.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#f8fafc,_#eef6ff_45%,_#f6f9f3)] px-4 py-6 text-slate-900">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-[32px] border border-emerald-100 bg-white/95 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">
                AutoCheckUser
              </span>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                  AutoCheckUser
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                  This page uses the LIFF access token from the current mini app session, verifies
                  it on the server, and sends a service message using the same flow as
                  `AutoHealth/functions`.
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:min-w-[280px]">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Current status</p>
              <p className="mt-2 text-sm font-medium text-slate-900">{status}</p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-6">
            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">Session</h2>
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Display name</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {profile?.displayName ?? "Unavailable"}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">User ID</p>
                  <p className="mt-1 break-all text-sm font-medium text-slate-900">
                    {profile?.userId ?? "Unavailable"}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                    LIFF access token
                  </p>
                  <p className="mt-1 break-all text-sm font-medium text-slate-900">
                    {truncate(accessToken, 36, 18)}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">Payload</h2>
              <div className="mt-4 space-y-4">
                <div>
                  <label
                    htmlFor="templateName"
                    className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500"
                  >
                    Template name
                  </label>
                  <input
                    id="templateName"
                    value={templateName}
                    onChange={(event) => setTemplateName(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                  />
                </div>
                <div>
                  <label
                    htmlFor="buttonUrl"
                    className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500"
                  >
                    Button URL param
                  </label>
                  <input
                    id="buttonUrl"
                    value={buttonUrl}
                    onChange={(event) => setButtonUrl(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void handleSendServiceMessage()}
                  disabled={!isReady || isSending}
                  className="inline-flex h-12 w-full items-center justify-center rounded-full bg-slate-950 px-6 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {isSending ? "Sending..." : "Send service message"}
                </button>
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-950">Firebase</h2>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
                  Firestore
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{firebaseStatus}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => void handleSyncFirebase()}
                  disabled={!isReady || isSyncingFirebase}
                  className="inline-flex h-12 items-center justify-center rounded-full bg-emerald-600 px-6 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-200"
                >
                  {isSyncingFirebase ? "Saving..." : "Save session to Firestore"}
                </button>
                <button
                  type="button"
                  onClick={() => void loadFirebaseEvents()}
                  disabled={!hasFirebaseConfig()}
                  className="inline-flex h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
                >
                  Refresh Firestore events
                </button>
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">Response</h2>
              <div className="mt-4 rounded-3xl bg-slate-950 p-4 text-sm text-emerald-100">
                <pre className="overflow-x-auto whitespace-pre-wrap break-words">
                  {result || "Run a test to inspect the LINE API response here."}
                </pre>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-600">
                Open this route inside LINE after setting the LIFF endpoint to
                `https://autotrack-phi.vercel.app/mini-test`. The server route expects
                `LINE_LOGIN_CHANNEL_ID` and `LINE_LOGIN_CHANNEL_SECRET` to be configured in
                Vercel.
              </p>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">Firestore events</h2>
              <div className="mt-4 space-y-3">
                {firebaseEvents.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                    No Firestore records yet. Save a LIFF session snapshot to test the connection.
                  </div>
                ) : (
                  firebaseEvents.map((event) => (
                    <article
                      key={event.id}
                      className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {event.displayName ?? "Unknown user"}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">
                              {event.eventType}
                            </span>
                            <span className="rounded-full bg-white px-2.5 py-1">
                              {event.userId ?? "Unavailable"}
                            </span>
                            <span className="rounded-full bg-white px-2.5 py-1">
                              {event.accessTokenPreview ?? "No token"}
                            </span>
                          </div>
                          <p className="mt-3 text-sm text-slate-600">
                            {event.statusMessage ?? "No status message"}
                          </p>
                        </div>
                        <p className="text-xs text-slate-500">{event.createdAtLabel}</p>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
