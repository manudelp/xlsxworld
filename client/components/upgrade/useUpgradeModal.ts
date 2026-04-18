"use client";

import { useEffect, useState } from "react";

export type UpgradeReason =
  | "ANON_DAILY_QUOTA"
  | "ANON_FILE_TOO_LARGE";

const EVENT_NAME = "xlsxworld:upgrade-requested";

export interface UpgradeRequestDetail {
  reason: UpgradeReason;
  message?: string;
}

export function dispatchUpgradeRequest(detail: UpgradeRequestDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<UpgradeRequestDetail>(EVENT_NAME, { detail }));
}

export function useUpgradeModal() {
  const [request, setRequest] = useState<UpgradeRequestDetail | null>(null);

  useEffect(() => {
    function onRequest(event: Event) {
      const detail = (event as CustomEvent<UpgradeRequestDetail>).detail;
      if (detail && detail.reason) {
        setRequest(detail);
      }
    }
    window.addEventListener(EVENT_NAME, onRequest);
    return () => window.removeEventListener(EVENT_NAME, onRequest);
  }, []);

  return {
    request,
    close: () => setRequest(null),
  };
}

export const UPGRADE_REQUEST_EVENT = EVENT_NAME;
