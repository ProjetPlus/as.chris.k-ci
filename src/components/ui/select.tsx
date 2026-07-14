import * as React from "react";
import { cn } from "@/lib/utils";

export const Select = ({ value, onValueChange, children, ...props }: { value?: string; onValueChange?: (v: string) => void; children: React.ReactNode } & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "onChange">) => (
  <select value={value} onChange={(e) => onValueChange?.(e.target.value)} className={cn("flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", props.className)} {...props}>{children}</select>
);
export const SelectItem = ({ value, children }: { value: string; children: React.ReactNode }) => <option value={value}>{children}</option>;
