"use client";
import type { ReactNode } from "react";
import { MotionConfig } from "motion/react";
import { Toaster } from "sonner";
import { CartProvider } from "@/components/features/cart";
import type { Product } from "@/types";
export function Providers({
  children,
  products,
  storeUrl,
}: {
  children: ReactNode;
  products: Product[];
  storeUrl: string;
}) {
  return (
    <MotionConfig reducedMotion="user">
      <CartProvider products={products} storeUrl={storeUrl}>
        {children}
      </CartProvider>
      <Toaster theme="dark" position="bottom-right" richColors closeButton />
    </MotionConfig>
  );
}
