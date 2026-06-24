"use client";

export default function Toast({
  children,
  variant = "info",
  action,
}: {
  children: React.ReactNode;
  variant?: "info" | "warning";
  action?: React.ReactNode;
}) {
  return (
    <div
      className={`glass-panel animate-fade-up absolute left-1/2 top-6 z-30 flex -translate-x-1/2 items-center gap-3 rounded-2xl px-5 py-3 text-sm shadow-xl ${
        variant === "warning" ? "text-amber-100" : "text-zinc-100"
      }`}
    >
      {children}
      {action}
    </div>
  );
}
