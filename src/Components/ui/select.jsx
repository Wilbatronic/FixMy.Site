import React, { createContext, useContext, useEffect, useId, useRef, useState } from "react";

const SelectContext = createContext(null);

export function Select({ value, onValueChange, open, onOpenChange, children }) {
  const [internalValue, setInternalValue] = useState(value ?? "");
  const [internalOpen, setInternalOpen] = useState(false);
  const currentValue = value !== undefined ? value : internalValue;
  const isOpen = open !== undefined ? open : internalOpen;
  const setValue = (v) => {
    if (onValueChange) onValueChange(v);
    if (value === undefined) setInternalValue(v);
    // Close on select
    if (onOpenChange) onOpenChange(false);
    if (open === undefined) setInternalOpen(false);
  };
  const setOpen = (next) => {
    if (onOpenChange) onOpenChange(next);
    if (open === undefined) setInternalOpen(next);
  };
  return (
    <SelectContext.Provider value={{ value: currentValue, setValue, open: isOpen, setOpen }}>
      <div className="relative">{children}</div>
    </SelectContext.Provider>
  );
}

export function SelectTrigger({ className = "", children, ...props }) {
  const id = useId();
  const { open, setOpen } = useContext(SelectContext);
  return (
    <button
      type="button"
      aria-haspopup="listbox"
      aria-expanded={open}
      id={id}
      onClick={() => setOpen(!open)}
      className={`flex w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function SelectValue({ placeholder, display }) {
  const { value } = useContext(SelectContext);
  const text = value ? (display ? display(value) : value) : (placeholder || "");
  return <span className="text-gray-700">{text}</span>;
}

export function SelectContent({ className = "", children, ...props }) {
  const { open, setOpen } = useContext(SelectContext);
  const ref = useRef(null);
  useEffect(() => {
    function onDocClick(e) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open, setOpen]);
  if (!open) return null;
  return (
    <div
      ref={ref}
      role="listbox"
      className={`absolute z-50 left-0 right-0 top-full mt-1 rounded-md border border-gray-200 bg-white p-1 shadow-lg animate-dropdown ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function SelectItem({ value, className = "", children, ...props }) {
  const { setValue } = useContext(SelectContext);
  return (
    <div
      role="option"
      tabIndex={0}
      onClick={() => setValue(value)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setValue(value); }}
      className={`cursor-pointer rounded px-2 py-1 text-sm text-gray-700 hover:bg-gray-100 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}


