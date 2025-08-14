import React from "react";

export function Badge({ className = "", children, ...props }) {
  const base = "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium";
  return (
    <span className={`${base} ${className}`} {...props}>
      {children}
    </span>
  );
}


