import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

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
    return data;
  },
});

export const productsQuery = queryOptions({
  queryKey: ["products"],
  staleTime: 5 * 60_000,
  queryFn: async () => {
    const { data, error } = await supabase.from("products").select("*, categories(name)").eq("active", true).order("code");
    if (error) throw error;
    return data as Product[];
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
