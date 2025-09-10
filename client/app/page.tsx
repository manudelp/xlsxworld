import Tools from "@/components/utility/Tools";

export default function Home() {
  return (
    <main className="text-[#47474f]">
      <div className="relative p-[30px_45px] text-center">
        <h1 className="font-semibold text-[42px] leading-[52px] text-[#33333b] text-center mx-auto mb-[4px] max-w-[1200px]">
          Every tool you need to work with XLSX files in one place
        </h1>
        <p className="leading-[32px] text-[22px] font-normal text-[#47474f] max-w-[980px] mx-auto">
          Every tool you need to use XLSX files, at your fingertips. All are
          100% FREE and easy to use! Merge, split, compress, convert, rotate,
          unlock and watermark XLSX files with just a few clicks.
        </p>
      </div>
      <Tools />
    </main>
  );
}
