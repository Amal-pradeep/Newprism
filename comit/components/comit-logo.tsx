export default function ComitLogo({className = "", animated = false}: {className?: string; animated?: boolean}) {
  return <svg viewBox="0 0 64 64" aria-hidden="true" className={`comit-logo ${animated ? "comit-logo-loading" : ""} ${className}`} fill="none">
    <path d="M32 4 59 55H5L32 4Z" stroke="currentColor" strokeWidth="3" strokeLinejoin="round"/>
    <path d="M32 16 48 47H16L32 16Z" stroke="currentColor" strokeWidth="2" opacity=".45"/>
    <circle cx="32" cy="35" r="7" fill="currentColor" className="comit-logo-core"/>
  </svg>;
}
