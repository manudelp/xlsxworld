import React from "react";

interface ToolProps {
  href: string;
  title: string;
  icon: React.ReactNode;
  heading: string;
  description: string;
  category?: string;
}

export default function Tool({
  href,
  title,
  icon,
  heading,
  description,
  category = "organize",
}: ToolProps) {
  return (
    <div
      className="bg-white border border-[#d6d6df] hover:border-black rounded-[16px] m-0 relative overflow-hidden z-[1] transition duration-500 scale-100"
      data-category={category}
    >
      <a href={href} title={title} className="block p-4">
        <div className="mb-2">{icon}</div>
        <h3 className="text-lg font-semibold mb-1">{heading}</h3>
        <div>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
      </a>
    </div>
  );
}
