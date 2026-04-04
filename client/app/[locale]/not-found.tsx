import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("notFound");

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <h1 className="text-6xl font-bold mb-4">{t("title")}</h1>
      <p className="text-xl mb-6">{t("description")}</p>
      <Link
        href="/"
        className="px-6 py-3 bg-[#292931] text-white rounded-lg hover:opacity-90 transition"
      >
        {t("goHome")}
      </Link>
    </div>
  );
}
