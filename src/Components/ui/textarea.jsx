import React, { forwardRef } from "react";

export const Textarea = forwardRef(function Textarea(
  { className = "", rows = 4, ...props },
  ref
) {
  const base =
    "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
  return <textarea ref={ref} rows={rows} className={`${base} ${className}`} {...props} />;
});


