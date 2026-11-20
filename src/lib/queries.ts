import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Product = Database["public"]["Tables"]["products"]["Row"] & {
  categories: { name: string } | null;
  manufacturer?: "FCO" | "HD";
  image_url?: string | null;
  catalog_page?: number | null;
  ipi_percent?: number | null;
};
export type Customer = Database["public"]["Tables"]["customers"]["Row"];
export type Order = Database["public"]["Tables"]["orders"]["Row"];
export type OrderItem = Database["public"]["Tables"]["order_items"]["Row"];

export const categoriesQuery = queryOptions({
  queryKey: ["categories"],
  staleTime: 5 * 60_000,
  gcTime: 30 * 60_000,
  refetchOnWindowFocus: false,
  queryFn: async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("active", true)
      .order("sort_order");
    if (error) throw error;
    return data;
  },
});

export const productsQuery = queryOptions({
  queryKey: ["products"],
  staleTime: 5 * 60_000,
  gcTime: 30 * 60_000,
  refetchOnWindowFocus: false,
  queryFn: async () => {
    const { data, error } = await supabase.rpc("catalog_products");
    if (!error) return (data ?? []) as unknown as Product[];

    // Recuperação segura caso a função RPC falhe: consultar somente peças
    // ativas já permitidas pelas políticas de leitura do Supabase.
    console.warn("catalog_products indisponível; tentando leitura alternativa", error.message);
    const allProducts: Product[] = [];
    for (let offset = 0; ; offset += 1000) {
      const { data: fallback, error: fallbackError } = await supabase
        .from("products")
        .select("*, categories(name)")
        .eq("active", true)
        .order("code")
        .range(offset, offset + 999);
      if (fallbackError) {
        console.error("Falha também na leitura alternativa do catálogo", fallbackError);
        throw error;
      }
      allProducts.push(...((fallback ?? []) as unknown as Product[]));
      if ((fallback ?? []).length < 1000) break;
    }
    return allProducts;
  },
});

export const customersQuery = queryOptions({
  queryKey: ["customers"],
  staleTime: 2 * 60_000,
  gcTime: 10 * 60_000,
  refetchOnWindowFocus: false,
  queryFn: async () => {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .is("deleted_at", null)
      .order("favorite", { ascending: false })
      .order("last_order_at", { ascending: false, nullsFirst: false })
      .order("company_name");
    if (error) throw error;
    return data;
  },
});

export const ordersQuery = queryOptions({
  queryKey: ["orders"],
  staleTime: 60_000,
  gcTime: 10 * 60_000,
  refetchOnWindowFocus: false,
  queryFn: async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return data;
  },
});

export const orderQuery = (id: string) =>
  queryOptions({
    queryKey: ["order", id],
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const [o, i] = await Promise.all([
        supabase.from("orders").select("*").eq("id", id).single(),
        supabase.from("order_items").select("*").eq("order_id", id).order("created_at"),
      ]);
      if (o.error) throw o.error;
      if (i.error) throw i.error;
      const { data: seller } = await supabase
        .from("profiles")
        .select("full_name,email")
        .eq("id", o.data.seller_id)
        .maybeSingle();
      return {
        order: o.data,
        items: i.data,
        sellerName: seller?.full_name || seller?.email || "Representante comercial",
      };
    },
  });

export const meQuery = queryOptions({
  queryKey: ["me"],
  staleTime: 60_000,
  gcTime: 10 * 60_000,
  refetchOnWindowFocus: false,
  queryFn: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return null;
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name,site_role,access_active")
      .eq("id", u.user.id)
      .maybeSingle();
    if (profileError) throw profileError;
    return {
      id: u.user.id,
      email: u.user.email ?? "",
      name: profile?.full_name || u.user.email || "",
      isAdmin: profile?.site_role === "Administrador" && profile?.access_active === true,
    };
  },
});

// Reaproveita o índice de busca de cada peça enquanto seus dados não mudarem.
// WeakMap não mantém peças removidas do catálogo presas na memória.
const productSearchCache = new WeakMap<Product, { source: string; text: string }>();

function normalizeProductSearch(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function productMatches(p: Product, q: string) {
  if (!q.trim()) return true;
  const terms = normalizeProductSearch(q).split(/\s+/).filter(Boolean);
  const source = [p.code, p.application, p.refs, p.categories?.name, p.manufacturer, p.search_text]
    .filter(Boolean)
    .join(" ");
  let cached = productSearchCache.get(p);
  if (!cached || cached.source !== source) {
    cached = { source, text: normalizeProductSearch(source) };
    productSearchCache.set(p, cached);
  }
  return terms.every((term) => cached!.text.includes(term));
}

/**
 * Representantes comerciais com conta vinculada, usados para atribuir ou
 * transferir a carteira de clientes. Somente o administrador consulta esta
 * lista; o RLS de `customers` só aceita representantes ativos como destino.
 */
export const customerAssignmentRepresentativesQuery = queryOptions({
  queryKey: ["customer-assignment-representatives"],
  staleTime: 60_000,
  queryFn: async () => {
    const { data, error } = await supabase
      .from("commercial_representatives")
      .select("user_id,full_name,email,active")
      .not("user_id", "is", null)
      .order("full_name");
    if (error) throw error;
    return (data ?? []).filter(
      (r): r is typeof r & { user_id: string } => r.user_id !== null,
    );
  },
});
