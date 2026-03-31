import Link from "next/link";
import Image from "next/image";

export default function Header() {
  return (
    <header
      className="w-full h-[60px] z-50 fixed right-0 left-0 top-0 px-2 sm:px-6 flex items-center justify-center"
      style={{
        backgroundColor: "var(--background)",
        color: "var(--foreground)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <Link
        href="/"
        className="flex items-center gap-2 h-[30px]"
      >
        <h2 className="text-xl font-semibold flex items-center gap-1">
          XLSX
          <Image
            src="/icon.svg"
            alt="World Icon"
            width={32}
            height={32}
            style={{ display: "inline", verticalAlign: "middle" }}
          />
          World
        </h2>
      </Link>
    </header>
  );
}
