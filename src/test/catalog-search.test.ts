import { describe, it, expect } from "vitest";
import { productMatches, type Product } from "@/lib/queries";
describe("catalog search", () => {
  const product = {
    code: "K6246.HD",
    manufacturer: "HD",
    application: "Mercedes-Benz 608 acionamento hidráulico",
    refs: "Referência 123",
    search_text: null,
    categories: { name: "Kit de embreagem" },
  } as Product;
  it("finds HD codes and applications even before search_text is indexed", () => {
    expect(productMatches(product, "hd 608 hidraulico")).toBe(true);
    expect(productMatches(product, "K6246.HD")).toBe(true);
    expect(productMatches(product, "volvo")).toBe(false);
  });
});
