import { useEffect, useState } from "react";
const config = {
    four: {
        title: "FOUR",
        emoji: "🏏",
        gradient: "linear-gradient(110deg, hsl(215 90% 30%) 0%, hsl(215 100% 55%) 35%, hsl(200 100% 70%) 50%, hsl(215 100% 55%) 65%, hsl(215 90% 30%) 100%)",
        ring: "hsl(215 100% 70%)",
        glow: "0 0 40px hsl(215 100% 60% / 0.7), 0 20px 60px -10px hsl(215 100% 40% / 0.6)",
        textShadow: "0 2px 12px hsl(215 100% 25% / 0.9), 0 0 20px hsl(0 0% 100% / 0.5)",
    },
    six: {
        title: "SIX",
        emoji: "💥",
        gradient: "linear-gradient(110deg, hsl(142 80% 25%) 0%, hsl(142 85% 45%) 35%, hsl(120 90% 65%) 50%, hsl(142 85% 45%) 65%, hsl(142 80% 25%) 100%)",
        ring: "hsl(120 90% 70%)",
        glow: "0 0 40px hsl(142 90% 50% / 0.7), 0 20px 60px -10px hsl(142 80% 35% / 0.6)",
        textShadow: "0 2px 12px hsl(142 90% 18% / 0.9), 0 0 20px hsl(0 0% 100% / 0.5)",
    },
    wicket: {
        title: "WICKET",
        emoji: "🎯",
        gradient: "linear-gradient(110deg, hsl(0 80% 30%) 0%, hsl(0 90% 50%) 35%, hsl(15 100% 65%) 50%, hsl(0 90% 50%) 65%, hsl(0 80% 30%) 100%)",
        ring: "hsl(15 100% 70%)",
        glow: "0 0 40px hsl(0 95% 55% / 0.75), 0 20px 60px -10px hsl(0 85% 35% / 0.6)",
        textShadow: "0 2px 12px hsl(0 95% 20% / 0.95), 0 0 20px hsl(0 0% 100% / 0.5)",
    },
};
const EventBanner = ({ kind, subtitle, onDone }) => {
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        if (!kind)
            return;
        setVisible(true);
        const t = setTimeout(() => {
            setVisible(false);
            onDone?.();
        }, 2000);
        return () => clearTimeout(t);
    }, [kind, onDone]);
    if (!kind || !visible)
        return null;
    const c = config[kind];
    // Repeat title 5x for the marquee feel ("SIX SIX SIX SIX SIX")
    const repeats = Array.from({ length: 6 }, (_, i) => i);
    return (
    // Anchored INSIDE the score card area at the top of the scoring page.
    // Uses absolute (not fixed) so it sits exactly over the team-score card.
    <div className="pointer-events-none absolute inset-x-0 top-0 z-40 flex justify-center px-2 pt-2">
      <div className="relative overflow-hidden w-full max-w-3xl rounded-2xl text-white animate-banner-sweep" style={{
            backgroundImage: c.gradient,
            backgroundSize: "300% 100%",
            animation: "banner-sweep 2s cubic-bezier(0.22, 1, 0.36, 1) forwards, banner-shimmer 2s linear infinite",
            boxShadow: c.glow,
            border: `2px solid ${c.ring}`,
        }}>
        {/* Diagonal moving shine */}
        <span className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 animate-banner-shine" style={{ background: "linear-gradient(90deg, transparent, hsl(0 0% 100% / 0.55), transparent)", filter: "blur(6px)" }}/>
        {/* Sparkle dots */}
        <span className="pointer-events-none absolute top-1 left-3 text-xl animate-text-pop">✨</span>
        <span className="pointer-events-none absolute bottom-1 right-3 text-xl animate-text-pop">✨</span>

        <div className="relative flex items-center gap-3 px-3 py-3 sm:px-5 sm:py-4">
          <div className="text-2xl sm:text-4xl animate-text-pop drop-shadow-lg">{c.emoji}</div>
          <div className="flex-1 min-w-0 overflow-hidden">
            {/* Marquee row of repeated titles */}
            <div className="flex items-center gap-3 sm:gap-5 whitespace-nowrap font-black tracking-[0.15em] text-2xl sm:text-4xl leading-none" style={{ textShadow: c.textShadow }}>
              {repeats.map((i) => (<span key={i} className="animate-text-pop" style={{ animationDelay: `${i * 70}ms`, opacity: i === 0 || i === repeats.length - 1 ? 0.55 : 1 }}>
                  {c.title}
                  {i < repeats.length - 1 && <span className="mx-2 opacity-60">•</span>}
                </span>))}
            </div>
            {subtitle && (<div className="text-[10px] sm:text-xs font-bold opacity-95 mt-1 truncate tracking-wider uppercase">
                {subtitle}
              </div>)}
          </div>
          <div className="text-2xl sm:text-4xl animate-text-pop drop-shadow-lg">{c.emoji}</div>
        </div>
      </div>
    </div>);
};
export default EventBanner;
