import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function SuggestTool() {
  const t = useTranslations("tools");

  return (
    <div
      className="tool-card h-[166px] sm:h-[174px] rounded-[16px] m-0 relative overflow-hidden z-[1] tool-card-interactive"
      style={{
        backgroundColor: "var(--surface)",
        border: "1px dashed var(--border)",
        color: "var(--foreground)",
      }}
    >
      <Link
        href="/contact"
        title={t("suggestTool")}
        className="tool-card-link block h-full p-4 flex flex-col items-center justify-center text-center"
      >
        <span className="text-4xl mb-2">💡</span>
        <h3 className="text-lg font-semibold mb-1">{t("suggestTool")}</h3>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          {t("suggestToolDescription")}
        </p>
      </Link>
    </div>
  );
}
