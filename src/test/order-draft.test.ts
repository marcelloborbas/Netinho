import { describe, it, expect, beforeEach } from "vitest";
import { draftActions, draftTotals } from "@/lib/order-store";
beforeEach(() => {
  localStorage.clear();
  draftActions.switchAccount(null);
});
describe("order drafts", () => {
  it("keeps different representatives' drafts separate and restores each on account switch", () => {
    draftActions.switchAccount("seller-a");
    draftActions.update({ customerName: "Cliente A" });
    draftActions.switchAccount("seller-b");
    expect(draftActions.get().customerName).toBeNull();
    draftActions.update({ customerName: "Cliente B" });
    draftActions.switchAccount("seller-a");
    expect(draftActions.get().customerName).toBe("Cliente A");
    draftActions.switchAccount(null);
    expect(draftActions.get().customerName).toBeNull();
  });
  it("combines FCO and HD items and calculates the selected payment condition", () => {
    draftActions.switchAccount("mixed-order");
    const prices = { cash: 100, "30": 110, "30_45_60": 120, "30_45_60_75": 130 };
    for (const manufacturer of ["FCO", "HD"])
      draftActions.addItem({
        productId: manufacturer,
        code: manufacturer,
        category: manufacturer,
        application: "Aplicação",
        quantity: 2,
        prices,
      });
    draftActions.updateItem("HD", { discount: 10 });
    expect(draftTotals(draftActions.get())).toEqual({
      gross: 400,
      net: 380,
      discount: 20,
      units: 4,
    });
    draftActions.update({ paymentTerm: "30" });
    expect(draftTotals(draftActions.get()).net).toBe(418);
  });
});
