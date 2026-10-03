import { useSyncExternalStore } from "react";
import type { PaymentTerm } from "./brand";

/** Rascunho do pedido em andamento, salvo automaticamente no aparelho. */
export interface DraftItem {
  productId: string;
  code: string;
  category: string;
  application: string;
  prices: Record<PaymentTerm, number | null>;
  quantity: number;
  discount: number;
}
export interface Draft {
  customerId: string | null;
  customerName: string | null;
  paymentTerm: PaymentTerm;
  kind: "pedido" | "orcamento";
  delivery: string;
  carrier: string;
  buyer: string;
  notes: string;
  items: DraftItem[];
}

const KEY = "netinho-draft-v1";
const empty: Draft = {
  customerId: null, customerName: null, paymentTerm: "cash", kind: "pedido",
  delivery: "", carrier: "", buyer: "", notes: "", items: [],
};

let state: Draft = empty;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = { ...empty, ...(JSON.parse(raw) as Partial<Draft>) };
  } catch { /* rascunho corrompido: ignora */ }
}

function set(next: Draft) {
  state = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* sem espaço */ }
  listeners.forEach((l) => l());
}

export const draftActions = {
  get: () => { load(); return state; },
  update: (patch: Partial<Draft>) => set({ ...draftActions.get(), ...patch }),
  addItem: (item: Omit<DraftItem, "discount">) => {
    const s = draftActions.get();
    const existing = s.items.find((i) => i.productId === item.productId);
    const items = existing
      ? s.items.map((i) => i.productId === item.productId ? { ...i, quantity: i.quantity + item.quantity } : i)
      : [...s.items, { ...item, discount: 0 }];
    set({ ...s, items });
  },
  updateItem: (productId: string, patch: Partial<DraftItem>) => {
    const s = draftActions.get();
    set({ ...s, items: s.items.map((i) => (i.productId === productId ? { ...i, ...patch } : i)) });
  },
  removeItem: (productId: string) => {
    const s = draftActions.get();
    set({ ...s, items: s.items.filter((i) => i.productId !== productId) });
  },
  clear: () => set(empty),
};

export function useDraft(): Draft {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => draftActions.get(),
    () => empty,
  );
}

export function lineNet(i: DraftItem, term: PaymentTerm) {
  const p = i.prices[term] ?? 0;
  return Math.round(p * (1 - i.discount / 100) * 100) / 100;
}
export function draftTotals(d: Draft) {
  let gross = 0, net = 0, units = 0;
  for (const i of d.items) {
    gross += (i.prices[d.paymentTerm] ?? 0) * i.quantity;
    net += lineNet(i, d.paymentTerm) * i.quantity;
    units += i.quantity;
  }
  return { gross, net, discount: gross - net, units };
}
