import { brand } from "@/config/brand";

/** Brand mark + wordmark. Configure in src/config/brand.ts. */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      {brand.logoSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={brand.logoSrc} alt="" width={28} height={28} className="h-7 w-7" />
      ) : (
        <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true" className="shrink-0">
          <rect x="3" y="2" width="24" height="28" rx="4" fill="#fffdf9" stroke="#2b6a64" strokeWidth="2" />
          <path d="M8 10h14M8 15h14M8 20h9" stroke="#c9bfae" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M20.5 25.5l7-7 2 2-7 7-2.8.8z" fill="#b0472f" />
        </svg>
      )}
      <span className="font-serif text-xl font-semibold tracking-tight text-ink">{brand.name}</span>
    </span>
  );
}
