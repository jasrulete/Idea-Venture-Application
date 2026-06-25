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
      className={`glass-panel animate-fade-up pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4 sm:top-6`}
    >
      <div
        className={`pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl px-5 py-3 text-sm shadow-xl ${
          variant === "warning" ? "text-amber-100" : "text-zinc-100"
        }`}
      >
        {children}
        {action}
      </div>
    </div>
  );
}
