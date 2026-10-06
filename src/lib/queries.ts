import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { FOCO_CATALOG } from "@/lib/foco-catalog";

export type Product = Database["public"]["Tables"]["products"]["Row"] & { categories: { name: string } | null };
export type Customer = Database["public"]["Tables"]["customers"]["Row"];
export type Order = Database["public"]["Tables"]["orders"]["Row"];
export type OrderItem = Database["public"]["Tables"]["order_items"]["Row"];

export const categoriesQuery = queryOptions({
  queryKey: ["categories"],
  staleTime: 5 * 60_000,
  queryFn: async () => {
    const { data, error } = await supabase.from("categories").select("*").eq("active", true).order("sort_order");
    if (error) throw error;

    const focoCategories = [
      { id: "foco-bicos", name: "Bicos de Injeção", sort_order: 8, active: true, created_at: "", updated_at: "" },
      { id: "foco-atuadores", name: "Atuador Eletropneumático", sort_order: 9, active: true, created_at: "", updated_at: "" },
    ];
    const names = new Set(data.map((c) => c.name));
    return [...data, ...focoCategories.filter((c) => !names.has(c.name))];
  },
});

export const productsQuery = queryOptions({
  queryKey: ["products"],
  staleTime: 5 * 60_000,
  queryFn: async () => {
    const { data, error } = await supabase.from("products").select("*, categories(name)").eq("active", true).order("code");
    if (error) throw error;

    const existingCodes = new Set(data.map((p) => p.code));
    const focoProducts = FOCO_CATALOG
      .filter((p) => !existingCodes.has(p.code))
      .map((p) => ({
        id: p.id,
        category_id: p.category === "Bicos de Injeção" ? "foco-bicos" : "foco-atuadores",
        code: p.code,
        refs: p.refs,
        application: p.application,
        brand: "FOCO",
        stock: 0,
        price_cash: null,
        price_30: null,
        price_30_45_60: null,
        price_30_45_60_75: null,
        price_note: "Preço sob consulta",
        active: true,
        search_text: (p.code + " " + p.refs + " " + p.application).toLowerCase(),
        created_at: "",
        updated_at: "",
        categories: { name: p.category },
      }));

    return [...(data as Product[]), ...focoProducts] as Product[];
  },
});

export const customersQuery = queryOptions({
  queryKey: ["customers"],
  queryFn: async () => {
    const { data, error } = await supabase.from("customers").select("*").is("deleted_at", null)
      .order("favorite", { ascending: false }).order("last_order_at", { ascending: false, nullsFirst: false }).order("company_name");
    if (error) throw error;
    return data;
  },
});

export const ordersQuery = queryOptions({
  queryKey: ["orders"],
  queryFn: async () => {
    const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(200);
    if (error) throw error;
    return data;
  },
});

export const orderQuery = (id: string) => queryOptions({
  queryKey: ["order", id],
  queryFn: async () => {
    const [o, i] = await Promise.all([
      supabase.from("orders").select("*").eq("id", id).single(),
      supabase.from("order_items").select("*").eq("order_id", id).order("created_at"),
    ]);
    if (o.error) throw o.error;
    if (i.error) throw i.error;
    return { order: o.data, items: i.data };
  },
});

export const meQuery = queryOptions({
  queryKey: ["me"],
  queryFn: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return null;
    const [p, r] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", u.user.id),
    ]);
    return {
      id: u.user.id,
      email: u.user.email ?? "",
      name: p.data?.full_name || u.user.email || "",
      isAdmin: (r.data ?? []).some((x) => x.role === "admin"),
    };
  },
});

export function productMatches(p: Product, q: string) {
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  return terms.every((t) => p.search_text?.includes(t));
}
