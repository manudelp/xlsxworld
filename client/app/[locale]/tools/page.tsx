import { setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import TaskTools from "@/components/tools/TaskTools";
import { buildAlternates } from "@/lib/seo";

export const metadata: Metadata = {
  title: "All Tools",
  description:
    "Browse all Excel tools — convert, merge, split, clean, inspect, analyze, format, and more. Find the right tool for your task.",
  alternates: buildAlternates("/tools"),
};

export default async function ToolsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <TaskTools />;
}
