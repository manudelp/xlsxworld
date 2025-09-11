import Link from "next/link";
import Image from "next/image";

export default function Header() {
  return (
    <header className="bg-white w-full h-[60px] z-50 fixed right-0 left-0 top-0 border-b border-[#d6d6df] px-6 flex items-center justify-between">
      <Link href="/" className="flex items-center gap-2">
        <Image
          src="/ilovexlsx.svg"
          alt="Logo"
          width={328}
          height={30}
          className="object-contain w-fit h-[30px]"
        />
      </Link>
      <div className="flex items-center gap-4">
        <a href="#" className="text-sm font-semibold">
          Login
        </a>
        <a
          href="#"
          className="px-3 py-2 bg-lime-600 hover:bg-lime-700 text-white rounded-lg text-sm font-semibold"
        >
          Sign Up
        </a>
      </div>
    </header>
  );
}
