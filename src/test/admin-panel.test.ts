import { describe, expect, it } from "vitest";
import { filterAdminSections, isAdminSection, normalizeHash } from "@/lib/admin-sections";
import { parseMaxDiscount } from "@/components/admin/sections/SettingsSection";
import { Route as PeopleRoute } from "@/routes/_authenticated/pessoas";
import { Route as OrdersRoute } from "@/routes/_authenticated/admin-pedidos";
import { Route as HubRoute } from "@/routes/_authenticated/admin-gestao";
import { Route as RegistrationsRoute } from "@/routes/cadastros-pendentes";

type BeforeLoad = (args: { location: { hash: string } }) => unknown;
function redirectOf(route: { options: unknown }, hash = "") {
  const beforeLoad = (route.options as { beforeLoad: BeforeLoad }).beforeLoad;
  try {
    beforeLoad({ location: { hash } });
  } catch (thrown) {
    return (thrown as { options: Record<string, unknown> }).options;
  }
  throw new Error("expected a redirect");
}

describe("painel administrativo único", () => {
  it("aceita somente seções conhecidas no endereço", () => {
    expect(isAdminSection("pessoas")).toBe(true);
    expect(isAdminSection("configuracoes")).toBe(true);
    expect(isAdminSection("produtos")).toBe(false);
    expect(isAdminSection(undefined)).toBe(false);
  });

  it("encontra a seção pela busca sem acentos", () => {
    expect(filterAdminSections("comissao").map((s) => s.id)).toContain("pessoas");
    expect(filterAdminSections("whatsapp").map((s) => s.id)).toContain("comunicacao");
    expect(filterAdminSections("xyz-inexistente")).toEqual([]);
  });

  it("normaliza âncoras com ou sem #", () => {
    expect(normalizeHash("#person:1")).toBe("person:1");
    expect(normalizeHash("person:1")).toBe("person:1");
    expect(normalizeHash(undefined)).toBe("");
  });

  it("leva a rota antiga de Pessoas para a seção, preservando a ficha aberta", () => {
    const id = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    expect(redirectOf(PeopleRoute, `person:${id}`)).toMatchObject({
      to: "/admin",
      search: { secao: "pessoas" },
      hash: `person:${id}`,
    });
  });

  it("leva as demais rotas antigas para suas seções", () => {
    expect(redirectOf(OrdersRoute)).toMatchObject({ to: "/admin", search: { secao: "pedidos" } });
    expect(redirectOf(RegistrationsRoute)).toMatchObject({
      to: "/admin",
      search: { secao: "cadastros" },
    });
    expect(redirectOf(HubRoute, "representantes")).toMatchObject({
      search: { secao: "pessoas" },
      hash: "representantes",
    });
    expect(redirectOf(HubRoute)).toMatchObject({ search: { secao: "visao-geral" } });
  });

  it("valida o desconto máximo entre 0% e 100%", () => {
    expect(parseMaxDiscount("5")).toBe(5);
    expect(parseMaxDiscount("7,5")).toBe(7.5);
    expect(parseMaxDiscount("0")).toBe(0);
    expect(parseMaxDiscount("100")).toBe(100);
    expect(parseMaxDiscount("100,01")).toBeNull();
    expect(parseMaxDiscount("-1")).toBeNull();
    expect(parseMaxDiscount("")).toBeNull();
    expect(parseMaxDiscount("abc")).toBeNull();
  });
});
