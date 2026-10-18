import type { ReactNode } from "react";
import { BrandHeader } from "@/components/BrandHeader";
import { BrandFooter } from "@/components/BrandFooter";

export function BrandPageLayout({ children }: { children: ReactNode }) {
  return (
    <div className="brand-page-layout">
      <BrandHeader />
      <div className="brand-page-content">{children}</div>
      <BrandFooter />
    </div>
  );
}
