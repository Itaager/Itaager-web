/** Animated coffee cup with rising steam (decorative). */
export function CoffeeCup({ className = "size-28" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden fill="none">
      {/* steam */}
      {[42, 58, 74].map((x, i) => (
        <path
          key={x}
          d={`M${x} 40c-5-6 5-10 0-16s5-10 0-16`}
          stroke="var(--brand)"
          strokeOpacity="0.55"
          strokeWidth="3.5"
          strokeLinecap="round"
          className="animate-steam"
          style={{ animationDelay: `${i * 0.6}s` }}
        />
      ))}
      {/* saucer */}
      <ellipse cx="58" cy="104" rx="42" ry="7" fill="var(--brand-soft)" />
      {/* cup */}
      <path d="M26 50h64v26c0 16-14 26-32 26S26 92 26 76V50Z" fill="var(--surface)" stroke="var(--ink)" strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M90 58h6a10 10 0 0 1 0 20h-7" stroke="var(--ink)" strokeWidth="3.5" strokeLinecap="round" />
      {/* coffee surface */}
      <path d="M30 54h56" stroke="var(--brand)" strokeWidth="5" strokeLinecap="round" />
      {/* heart latte art */}
      <path d="M58 82s-9-5.5-9-11a4.8 4.8 0 0 1 9-2.4 4.8 4.8 0 0 1 9 2.4c0 5.5-9 11-9 11Z" fill="var(--brand)" />
    </svg>
  );
}
