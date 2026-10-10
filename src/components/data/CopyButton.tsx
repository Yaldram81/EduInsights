"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** CopyButton — copies text; shows a check for 2 s. */
export function CopyButton({
  text,
  label = "Copy",
  className,
  size = "sm",
}: {
  text: string;
  label?: string;
  className?: string;
  size?: "default" | "sm";
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — fail silently */
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      onClick={onCopy}
      className={cn("border-hairline-strong", className)}
    >
      {copied ? (
        <Check className="size-3.5 text-emerald" aria-hidden />
      ) : (
        <Copy className="size-3.5" aria-hidden />
      )}
      {copied ? "Copied" : label}
    </Button>
  );
}
