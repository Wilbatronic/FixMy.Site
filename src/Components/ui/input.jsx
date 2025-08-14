import React, { forwardRef } from "react";

export const Input = forwardRef(function Input(
  { className = "", type = "text", ...props },
  ref
) {
  const base =
    "flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
  return <input ref={ref} type={type} className={`${base} ${className}`} {...props} />;
});


