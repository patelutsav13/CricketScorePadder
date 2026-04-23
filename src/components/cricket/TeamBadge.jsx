import { useMemo } from "react";
/** Deterministic HSL color from team short name — gives every team a stable identity color. */
const colorFor = (key) => {
    let h = 0;
    for (let i = 0; i < key.length; i++)
        h = (h * 31 + key.charCodeAt(i)) % 360;
    return { bg: `hsl(${h} 70% 45%)`, fg: `hsl(${h} 90% 95%)` };
};
export const TeamBadge = ({ shortName, size = "md", className = "" }) => {
    const c = useMemo(() => colorFor(shortName.toUpperCase()), [shortName]);
    const dim = size === "sm" ? "w-7 h-7 text-[10px]" : size === "lg" ? "w-12 h-12 text-sm" : "w-9 h-9 text-xs";
    return (<div className={`shrink-0 rounded-full grid place-items-center font-black tracking-tight border-2 border-white/15 shadow-md ${dim} ${className}`} style={{ background: c.bg, color: c.fg }} aria-label={shortName}>
      {shortName.slice(0, 4).toUpperCase()}
    </div>);
};
export const teamAccent = (key) => {
    let h = 0;
    for (let i = 0; i < key.length; i++)
        h = (h * 31 + key.charCodeAt(i)) % 360;
    return {
        rowBg: `hsl(${h} 70% 38% / 0.55)`,
        rowBgSoft: `hsl(${h} 70% 38% / 0.18)`,
        border: `hsl(${h} 80% 55%)`,
    };
};
