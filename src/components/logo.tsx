"use client";

import Image from "next/image";
import { useTheme } from "@/components/theme-provider";

export function Logo({
  width = 112,
  height = 28,
  className = "block h-7 w-auto",
}: {
  width?: number;
  height?: number;
  className?: string;
}) {
  const { theme } = useTheme();
  return (
    <Image
      src={theme === "light" ? "/logo-light.svg" : "/logo-dark.svg"}
      alt="CYPHR"
      width={width}
      height={height}
      priority
      className={className}
    />
  );
}
