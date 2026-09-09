"use client";

import { createContext, useContext, useMemo } from "react";
import { DEFAULT_PRICING, type PricingValues } from "@/lib/money";

const PricingContext = createContext<PricingValues>(DEFAULT_PRICING);

export function PricingProvider({ values, children }: { values: PricingValues; children: React.ReactNode }) {
  const value = useMemo(() => values, [values]);
  return <PricingContext value={value}>{children}</PricingContext>;
}

export function usePricing(): PricingValues {
  return useContext(PricingContext);
}