import React from "react";

export function FrigidgeIcon({ className = "" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <line x1="4" y1="10" x2="20" y2="10" />
      <line x1="10" y1="2" x2="10" y2="10" />
      <line x1="10" y1="14" x2="10" y2="16" />
    </svg>
  );
}

export function WasherIcon({ className = "" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="2" />
      <line x1="3" y1="7" x2="21" y2="7" />
      <circle cx="7" cy="5" r="1" />
      <circle cx="17" cy="5" r="1" />
    </svg>
  );
}

export function AirConditionerIcon({ className = "" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2" y="3" width="20" height="9" rx="2" />
      <path d="M7 16h.01" />
      <path d="M12 16h.01" />
      <path d="M17 16h.01" />
      <path d="M7 12h10" />
      <path d="M7 8h10" />
      <path d="M17 17c0 1-1 2-3 2s-2-1-4-1-3 1-3 2" />
    </svg>
  );
}

export function StoveIcon({ className = "" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <circle cx="8" cy="8" r="2" />
      <circle cx="16" cy="8" r="2" />
      <circle cx="8" cy="16" r="2" />
      <circle cx="16" cy="16" r="2" />
      <path d="M2 12h20" />
    </svg>
  );
}