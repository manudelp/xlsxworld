import Tools from "@/components/utility/Tools";

export default function Home() {
  return (
    <main>
      <div className="relative p-[24px_16px] sm:p-[30px_45px] text-center">
        <h1 className="font-semibold text-[28px] leading-[36px] sm:text-[42px] sm:leading-[52px] text-center mx-auto mb-[4px] max-w-[95vw] sm:max-w-[1200px]">
          All your XLSX tools, all in one place
        </h1>
        <p className="text-[16px] sm:text-[22px] max-w-[980px] mx-auto">
          Work with Excel files easily—free, simple, and fast.
        </p>
      </div>
      <Tools />
    </main>
  );
}
