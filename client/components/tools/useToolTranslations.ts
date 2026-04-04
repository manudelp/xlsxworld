"use client";

import { useTranslations } from "next-intl";

export function useToolTranslations() {
  return useTranslations("common");
}
