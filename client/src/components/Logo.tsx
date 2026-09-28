import React from "react";

interface LogoProps {
  size?: number | string;
  showText?: boolean;
  showTagline?: boolean;
  className?: string;
  textClassName?: string;
}

/**
 * LearnFlow AI Official Brand Logo Icon
 * Uses the high-resolution brand asset (/logo-icon.png) to guarantee
 * crisp rendering across all screen sizes (mobile, tablet, desktop)
 * without SVG gradient ID collision or display:none inheritance bugs.
 */
export const LogoIcon: React.FC<{ size?: number | string; className?: string }> = ({
  size = 32,
  className = "",
}) => {
  const dimension = typeof size === "number" ? `${size}px` : size;
  return (
    <img
      src="/logo-icon.png"
      alt="LearnFlow AI"
      width={typeof size === "number" ? size : undefined}
      height={typeof size === "number" ? size : undefined}
      className={`shrink-0 select-none object-contain ${className}`}
      style={{
        width: dimension,
        height: dimension,
      }}
      draggable={false}
    />
  );
};

export default function Logo({
  size = 32,
  showText = true,
  showTagline = false,
  className = "",
  textClassName = "",
}: LogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <LogoIcon size={size} />
      {showText && (
        <div className="flex flex-col justify-center leading-none">
          <div className={`flex items-center text-white tracking-tight ${textClassName}`}>
            <span className="font-bold text-base md:text-lg text-white">LearnFlow</span>
            <span className="font-bold text-base md:text-lg ml-1 text-[#8B5CF6]">AI</span>
          </div>
          {showTagline && (
            <span className="text-[11px] text-[#8E8E93] font-normal tracking-normal mt-0.5">
              Your personal AI study partner
            </span>
          )}
        </div>
      )}
    </div>
  );
}
