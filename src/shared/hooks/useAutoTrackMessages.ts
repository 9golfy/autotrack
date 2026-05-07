"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { formatDateTime } from "@/shared/utils/date-format";
import type { MessageRecord } from "@/shared/types/messages";

type AutoTrackMessagesOptions = {
  groupId?: string | null;
  limit?: number;
  from?: number | null;
  to?: number | null;
};

type MessagesResponse = {
  messages: MessageRecord[];
  configured?: boolean;
  setupMessage?: string;
};

const MESSAGE_CACHE_STALE_MS = 5 * 60 * 1000;
const messageResponseCache = new Map<string, { fetchedAt: number; data: MessagesResponse }>();

export function useAutoTrackMessages(options: AutoTrackMessagesOptions = {}) {
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [status, setStatus] = useState("กำลังรอข้อมูลจากกลุ่ม LINE");
  const [error, setError] = useState<string | null>(null);
  const [setupMessage, setSetupMessage] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const isBustRef = useRef(false);

  const refresh = useCallback(() => {
    isBustRef.current = true;
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const params = new URLSearchParams();

    if (options.groupId) {
      params.set("groupId", options.groupId);
    }

    if (options.limit) {
      params.set("limit", String(options.limit));
    }

    if (typeof options.from === "number" && Number.isFinite(options.from)) {
      params.set("from", String(options.from));
    }

    if (typeof options.to === "number" && Number.isFinite(options.to)) {
      params.set("to", String(options.to));
    }

    const messagesUrl = params.size > 0 ? `/api/messages?${params.toString()}` : "/api/messages";

    function applyMessagesData(data: MessagesResponse) {
      setMessages(data.messages);
      setHasLoaded(true);
      setError(null);
      setSetupMessage(data.configured === false ? data.setupMessage ?? null : null);
      setStatus(
        data.messages.length > 0
          ? `ซิงก์ล่าสุด ${formatDateTime(Number(data.messages[0].timestamp))}`
          : data.configured === false
            ? "ยังไม่ได้ตั้งค่าฐานข้อมูล"
            : "ยังไม่มีข้อมูลจากกลุ่ม",
      );
    }

    async function loadMessages(bust = false) {
      try {
        const cachedResponse = messageResponseCache.get(messagesUrl);
        const cacheAge = cachedResponse ? Date.now() - cachedResponse.fetchedAt : Number.POSITIVE_INFINITY;

        if (cachedResponse && !bust) {
          applyMessagesData(cachedResponse.data);
        }

        // bust cache หรือ cache หมดอายุ → fetch ใหม่เสมอ
        const shouldSkipFetch = !bust && cachedResponse && cacheAge < MESSAGE_CACHE_STALE_MS;
        if (shouldSkipFetch) return;

        const response = await fetch(messagesUrl, { cache: "no-store" });

        if (!response.ok) {
          throw new Error("Unable to load messages");
        }

        const data = (await response.json()) as MessagesResponse;

        if (!isMounted) {
          return;
        }

        messageResponseCache.set(messagesUrl, { fetchedAt: Date.now(), data });
        applyMessagesData(data);
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        console.warn("Unable to refresh LINE messages", loadError);
        setHasLoaded(true);
        setError((currentError) => currentError ?? "ไม่สามารถโหลดข้อมูลกลุ่ม LINE ได้ในขณะนี้");
      }
    }

    const bust = isBustRef.current;
    if (bust) isBustRef.current = false;

    void loadMessages(bust);
    const interval = window.setInterval(() => void loadMessages(false), 60000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [options.groupId, options.limit, options.from, options.to, refreshKey]);

  return { messages, status, error, setupMessage, hasLoaded, refresh };
}
