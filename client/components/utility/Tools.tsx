import ToolsFilter from "./ToolsFilter";
import Tool from "./Tool";

export default function Tools() {
  return (
    <div className="flex flex-col items-center relative px-[48px] pb-[96px] mx-auto flex-wrap min-h-[200px]">
      <ToolsFilter />

      {/* TOOLS */}
      <div className="grid grid-cols-6 xl:grid-cols-5 gap-4 min-h-[200px] w-full relative flex-wrap">
        <Tool
          href="#"
          title="Merge Sheets"
          icon={
            <span role="img" aria-label="merge">
              🔗
            </span>
          }
          heading="Merge Sheets"
          description="Combine multiple sheets into one."
        />
        <Tool
          href="#"
          title="Split Sheet"
          icon={
            <span role="img" aria-label="split">
              ✂️
            </span>
          }
          heading="Split Sheet"
          description="Divide a sheet into several smaller sheets."
        />
        <Tool
          href="#"
          title="Remove Duplicates"
          icon={
            <span role="img" aria-label="remove duplicates">
              🧹
            </span>
          }
          heading="Remove Duplicates"
          description="Clean your data by removing duplicate rows."
        />
        <Tool
          href="#"
          title="Merge Sheets"
          icon={
            <span role="img" aria-label="merge">
              🔗
            </span>
          }
          heading="Merge Sheets"
          description="Combine multiple sheets into one."
        />
        <Tool
          href="#"
          title="Split Sheet"
          icon={
            <span role="img" aria-label="split">
              ✂️
            </span>
          }
          heading="Split Sheet"
          description="Divide a sheet into several smaller sheets."
        />
        <Tool
          href="#"
          title="Split Sheet"
          icon={
            <span role="img" aria-label="split">
              ✂️
            </span>
          }
          heading="Split Sheet"
          description="Divide a sheet into several smaller sheets."
        />
      </div>
    </div>
  );
}
