import { CatalogDownload } from "@/components/CatalogDownload";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Search, PackageSearch, X, ShoppingCart, MessageCircle, Grid2X2, Disc3, Cog, Zap, Filter, Gauge, CarFront, BatteryCharging, CircleDot, Settings2, Heart, GitCompareArrows, History } from "lucide-react";
import { accessQuery } from "@/lib/access";
import { supabase } from "@/integrations/supabase/client";
import { productsQuery, categoriesQuery, productMatches, type Product } from "@/lib/queries";
import { brl } from "@/lib/brand";
import { draftActions, useDraft } from "@/lib/order-store";
import { toast } from "sonner";
import { partImage } from "@/lib/part-images";
import hdCatalog from "@/data/hd-catalog.json";
import { readOffers } from "@/routes/ofertas";

export const Route = createFileRoute("/_authenticated/catalogo")({
  validateSearch: (search: Record<string, unknown>): { marca?: "FCO" | "HD" | undefined; modo?: "consulta" | "venda" | undefined; q?: string | undefined } => ({
    marca: search["marca"] === "FCO" || search["marca"] === "HD" ? search["marca"] : undefined,
    modo: search["modo"] === "consulta" || search["modo"] === "venda" ? search["modo"] : undefined,
    q: typeof search["q"] === "string" ? search["q"].slice(0, 100) : undefined,
  }),
  head: () => ({ meta: [
    { title: "Catálogo de Peças FCO e HD | Netinho Auto Parts" },
    { name: "description", content: "Catálogo de peças FCO e HD com códigos, aplicações, referências e preços disponíveis." },
  ] }),
  component: Catalog,
});

type CatalogProduct = Product & { localOnly?: boolean };
type VehicleBrand = { name: string; pattern: RegExp; slug: string; color: string };
const vehicleBrands: VehicleBrand[] = [
  { name: "Volkswagen", pattern: /\bvolkswagen\b|\bvw\b|\bgol\b|\bfox\b|\bpolo\b|\bvoyage\b|\bsaveiro\b/i, slug: "volkswagen", color: "001E50" },
  { name: "Fiat", pattern: /\bfiat\b|\bpalio\b|\buno\b|\bstrada\b|\bargo\b|\bmobi\b/i, slug: "fiat", color: "941711" },
  { name: "Chevrolet", pattern: /\bchevrolet\b|\bchevy\b|\b(onix|ônix|corsa|celta|prisma|spin|s10)\b/i, slug: "chevrolet", color: "D1A24A" },
  { name: "Ford", pattern: /\bford\b|\b(ka|fiesta|ecosport|focus|ranger)\b/i, slug: "ford", color: "002E6B" },
  { name: "Renault", pattern: /\brenault\b|\b(sandero|logan|duster|kwid)\b/i, slug: "renault", color: "FFCC33" },
  { name: "Toyota", pattern: /\btoyota\b|\b(corolla|hilux|etios|yaris)\b/i, slug: "toyota", color: "EB0A1E" },
  { name: "Honda", pattern: /\bhonda\b|\b(civic|fit|hr-v|city)\b/i, slug: "honda", color: "CC0000" },
  { name: "Hyundai", pattern: /\bhyundai\b|\b(hb20|creta|tucson)\b/i, slug: "hyundai", color: "002C5F" },
  { name: "Nissan", pattern: /\bnissan\b|\b(kicks|versa|sentra|march)\b/i, slug: "nissan", color: "C3002F" },
  { name: "Peugeot", pattern: /\bpeugeot\b/i, slug: "peugeot", color: "000000" },
  { name: "Citroën", pattern: /\bcitro[eë]n\b/i, slug: "citroen", color: "AC1926" },
  { name: "Jeep", pattern: /\bjeep\b|\b(renegade|compass)\b/i, slug: "jeep", color: "000000" },
];
// Modelos exibidos apenas quando citados explicitamente na aplicação da peça.
const vehicleModels: Record<string, string[]> = {
  Volkswagen: ["Gol", "Voyage", "Polo", "Fox", "Saveiro", "Golf", "Jetta", "Virtus", "T-Cross", "Nivus", "Up"],
  Fiat: ["Uno", "Palio", "Siena", "Strada", "Argo", "Mobi", "Toro", "Cronos", "Punto", "Doblò", "Fiorino"],
  Chevrolet: ["Onix", "Prisma", "Corsa", "Celta", "Classic", "Cruze", "S10", "Spin", "Tracker", "Montana", "Astra"],
  Ford: ["Ka", "Fiesta", "Focus", "EcoSport", "Ranger", "Fusion"],
  Renault: ["Kwid", "Sandero", "Logan", "Duster", "Oroch", "Clio", "Kangoo"],
  Hyundai: ["HB20", "Creta", "Tucson", "i30"],
  Toyota: ["Corolla", "Etios", "Hilux", "Yaris"],
  Honda: ["Civic", "Fit", "City", "HR-V"],
  Nissan: ["Kicks", "Versa", "Sentra", "March", "Frontier"],
  Peugeot: ["206", "207", "208", "307", "308", "2008", "3008"],
  "Citroën": ["C3", "C4", "Aircross", "Berlingo"],
  Jeep: ["Renegade", "Compass", "Commander"],
};
const mentionsModel = (application: string, model: string) =>
  new RegExp(`(^|[^\\p{L}\\p{N}])${model}(?=$|[^\\p{L}\\p{N}])`, "iu").test(application);
/** Fotografias identificadas por modelo, com origem no Wikimedia Commons. */
const vehicleModelPhotos: Record<string, string> = {
  gol: "https://cdn.motor1.com/images/mgl/YAAopq/s1/volkswagen-gol-1.0-2023.jpg",
  saveiro: "https://www.pngmart.com/files/22/Volkswagen-Saveiro-PNG.png",
  voyage: "https://images.tcdn.com.br/img/img_prod/1329068/vidro_parabrisa_volkswagen_gol_g5_g6_g7_voyage_g5_2009_2023_105_8_df1c475c552368dc29ad7234d3547476.png",
  amarok: "https://www.volkswagen.co.nz/app/nz/media/customiser/Amarok/Amarok%20Style%20V6/18%20inch%20Amadora%20Alloys/Frozen%20White/PR%5B3%5D-Amarok%20Style%20Amador_images_56005_AVP2D_A_2_000_AD_1.jpg?bgcolor=fff&height=400&mode=crop&width=700",
  polo: "https://assets.nexuspointapex.co.uk/resize/2048/tenant_d9013b5a-4990-4f3e-beec-4e1fc85990eb/media/9931395/volkswagen-polo-10-tsi-match-euro-6-ss-5dr-8a42cd2f9ce7facd019cec7ec346259c-69b6617b1b0a4.jpg",
};
const volkswagenModelImages: Record<string, string> = {
  gol: "/images/veiculos/volkswagen/gol.webp",
  voyage: "/images/veiculos/volkswagen/voyage.webp",
  polo: "/images/veiculos/volkswagen/polo.webp",
  fox: "/images/veiculos/volkswagen/fox.webp",
  saveiro: "/images/veiculos/volkswagen/saveiro.webp",
  golf: "/images/veiculos/volkswagen/golf.webp",
  jetta: "/images/veiculos/volkswagen/jetta.webp",
  virtus: "/images/veiculos/volkswagen/virtus.webp",
  "t-cross": "/images/veiculos/volkswagen/t-cross.webp",
  nivus: "/images/veiculos/volkswagen/nivus.webp",
  up: "/images/veiculos/volkswagen/up.webp",
};

function VehicleModelPicture({name}:{name:string}) {
  const key=name.trim().toLowerCase();
  const photo=volkswagenModelImages[key] ?? vehicleModelPhotos[key];
  const [failed,setFailed]=useState(false);
  useEffect(()=>setFailed(false),[photo]);
  return photo&&!failed ? <img src={photo} alt={`Foto ilustrativa do modelo ${name}`} loading="lazy" referrerPolicy="no-referrer" onError={()=>setFailed(true)} className="h-full w-full rounded-lg bg-white object-contain" /> : <VehicleModelIllustration name={name}/>;
}

/** Miniaturas vetoriais locais, com silhuetas e cores próprias por modelo. */
function VehicleModelIllustration({ name }: { name: string }) {
  const pickup = /saveiro|strada|montana|oroch|toro|s10|hilux|ranger|amarok|frontier/i.test(name);
  const suv = /tracker|creta|tucson|duster|renegade|compass|commander|ecosport|kicks|hr-v|t-cross|nivus|2008|3008/i.test(name);
  const sedan = /voyage|virtus|prisma|classic|cruze|corolla|civic|city|versa|sentra|logan|siena|cronos|fusion|jetta|astra/i.test(name);
  const compact = /celta|corsa|gol|uno|mobi|kwid|ka|up|fox|palio|polo/i.test(name);
  const palette: Record<string, string> = { Gol:"#c2c7cc", Saveiro:"#e3e6e9", Voyage:"#838e98", Amarok:"#c4cbd1", Polo:"#f0f1f3", Astra:"#9da9b8", Celta:"#e2e7ec", Corsa:"#aebac7", Onix:"#d3d8dd", Uno:"#cfdee8", Palio:"#b9c6cf", Strada:"#d6dce2", Corolla:"#d7dce0", HB20:"#cbd4dc", Fiesta:"#bdc8d3" };
  const paint = palette[name] ?? ["#c4cbd2","#d7dce1","#a8b6c5","#e0e4e8"][Array.from(name).reduce((sum,c)=>sum+c.charCodeAt(0),0)%4];
  const cab = pickup ? "M47 47 L64 26 Q67 23 74 23 L104 23 Q109 24 112 29 L121 47" : suv ? "M35 47 L53 24 Q56 20 64 20 L119 20 Q126 21 133 28 L145 47" : sedan ? "M36 47 L58 29 Q63 25 70 25 L111 25 Q120 25 129 33 L142 47" : "M39 47 L59 26 Q63 22 71 22 L112 22 Q118 23 125 31 L138 47";
  const glazing = pickup ? "M51 44 L67 29 L102 29 L114 44 Z" : suv ? "M44 44 L59 26 L119 26 L135 44 Z" : sedan ? "M46 44 L62 31 L113 31 L132 44 Z" : "M48 44 L64 28 L110 28 L128 44 Z";
  const tail = pickup ? "M121 47 L182 47 L185 64" : suv ? "M145 47 L178 53 L183 64" : sedan ? "M142 47 L178 53 L183 64" : "M138 47 L175 52 L183 64";
  const rearWheel = pickup ? 157 : suv ? 157 : sedan ? 157 : compact ? 151 : 156;
  const uid = name.toLowerCase().replace(/[^a-z0-9]/g,"");
  return <svg viewBox="0 0 210 92" role="img" aria-label={`Miniatura ilustrada de ${name}`} className="h-full w-full transition-transform duration-200 group-hover:scale-105">
    <defs>
      <linearGradient id={`paint-${uid}`} x1="0" y1="0" x2=".3" y2="1"><stop offset="0%" stopColor="#fff"/><stop offset="48%" stopColor={paint}/><stop offset="100%" stopColor="#778492"/></linearGradient>
      <linearGradient id={`glass-${uid}`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#213c56"/><stop offset="100%" stopColor="#9cb3c7"/></linearGradient>
    </defs>
    <ellipse cx="105" cy="77" rx="90" ry="7" fill="#566d85" opacity=".17"/>
    <path d={`M19 64 L27 52 L39 47 ${cab} ${tail} L187 69 L184 74 L23 74 L18 70 Z`} fill={`url(#paint-${uid})`} stroke="#526171" strokeWidth="1.8"/>
    <path d={glazing} fill={`url(#glass-${uid})`} stroke="#617689" strokeWidth="1.3"/>
    <path d={pickup ? "M88 29 L88 44 M119 48 L119 65" : "M88 28 L88 44 M128 48 L128 65"} stroke="#65788b" strokeWidth="1.6"/>
    <path d="M28 59 L41 57" stroke="#fff3c6" strokeWidth="3.5" strokeLinecap="round"/>
    <path d="M174 59 L184 62" stroke="#b94444" strokeWidth="3" strokeLinecap="round"/>
    <path d="M27 68 L182 68" stroke="#8995a3" strokeWidth="1.3"/>
    <path d="M96 52 L112 52 M100 54 L107 54" stroke="#5c6d7e" strokeWidth="1.2" strokeLinecap="round"/>
    <circle cx="58" cy="72" r="13" fill="#202a35" stroke="#536170" strokeWidth="1"/><circle cx="58" cy="72" r="7.5" fill="#e6ebf0" stroke="#8190a0" strokeWidth="2"/><circle cx="58" cy="72" r="2.5" fill="#8e9eaf"/>
    <circle cx={rearWheel} cy="72" r="13" fill="#202a35" stroke="#536170" strokeWidth="1"/><circle cx={rearWheel} cy="72" r="7.5" fill="#e6ebf0" stroke="#8190a0" strokeWidth="2"/><circle cx={rearWheel} cy="72" r="2.5" fill="#8e9eaf"/>
  </svg>;
}

function VehicleBrandIcons({ application }: { application?: string | null }) {
  if (!application) return null;
  const matches = vehicleBrands.filter((brand) => brand.pattern.test(application));
  if (!matches.length) return null;
  return <div className="my-2 flex flex-wrap items-center gap-2" aria-label="Montadoras identificadas nas aplicações">
    {matches.map((brand) => <span key={brand.name} title={brand.name} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-[#102a52]">
      <img src={`https://cdn.simpleicons.org/${brand.slug}/${brand.color}`} alt="" aria-hidden="true" loading="lazy" className="h-6 w-6 object-contain" onError={(event) => { event.currentTarget.style.display = "none"; }} />
      {brand.name}
    </span>)}
  </div>;
}

const localHd = hdCatalog.map((p) => ({
  id: p.id, code: p.code, application: p.application,
  refs: [p.name, p.refs].filter(Boolean).join(" · "),
  categories: { name: `HD · ${p.category}` }, category_id: "hd",
  manufacturer: "HD", image_url: p.image, catalog_page: p.catalogPage,
  price_cash: null, price_30: null, price_30_45_60: null,
  price_30_45_60_75: null, price_note: null, search_text: null,
  stock: 0, active: true, brand: "HD", created_at: "", updated_at: "", localOnly: true,
})) as CatalogProduct[];

const categoryPhotos: Array<[RegExp, string]> = [
  [/atuador\s*(?:de\s*)?(?:embreagem|hidr[aá]ulic)|atuador.*hidr[aá]ulic/i, "Atuador de Embreagem.webp"],
  [/bobina.*igni/i, "Bobina de Ignição.webp"],
  [/bomba.*dire/i, "Bomba de direção.webp"],
  [/caixa.*dire|dire[cç][aã]o/i, "Caixa de Direção.webp"],
  [/coxim.*amortec/i, "Coxim de Amortecedor.webp"],
  [/corrente.*comando/i, "Kit de corrente de comando.webp"],
  [/kit.*embreagem|embreagem.*kit/i, "Kit de embreagem.webp"],
  [/revestimento/i, "Revestimento.webp"],
  [/rolamento.*embreagem/i, "Rolamento de Embreagem.webp"],
  [/rolamento.*roda/i, "Rolamento de Roda.webp"],
  [/\btbi\b|corpo.*borboleta/i, "TBI.webp"],
  [/turbina|turbo/i, "Turbina.webp"],
];
const displayCategoryName = (name: string) => /^atuador hidr[aá]ulico$/i.test(name.trim()) ? "Atuador e Embreagem" : name;
const categoryPhoto = (name: string) => {
  const filename = categoryPhotos.find(([pattern]) => pattern.test(name))?.[1];
  return filename ? `/images/categorias/${encodeURIComponent(filename)}` : null;
};

function Catalog() {
  const search = Route.useSearch();
  const [q, setQ] = useState(search.q ?? "");
  const [searchInput, setSearchInput] = useState(search.q ?? "");
  const [manufacturer, setManufacturer] = useState(search.marca === "HD" ? "all" : (search.marca ?? "all"));
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState("all");
  const [vehicleBrand, setVehicleBrand] = useState("all");
  const [vehicleModel, setVehicleModel] = useState("all");
  const [hasSelectedCategory, setHasSelectedCategory] = useState(false);
  const dq = useDeferredValue(q);
  const [filterOpen, setFilterOpen] = useState(false);
  const [compared, setCompared] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [recentCodes, setRecentCodes] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("netinho-recent-products") || "[]") as string[]; }
    catch { return []; }
  });
  const recordViewed = (code: string) => setRecentCodes((previous) => {
    const next = [code, ...previous.filter((item) => item !== code)].slice(0, 12);
    try { localStorage.setItem("netinho-recent-products", JSON.stringify(next)); } catch { /* storage unavailable */ }
    return next;
  });
  const toggleCompare = (id: string) => setCompared((previous) => {
    if (previous.includes(id)) return previous.filter((item) => item !== id);
    if (previous.length >= 3) { toast.info("Compare até 3 peças por vez."); return previous; }
    return [...previous, id];
  });
  const [filterMode, setFilterMode] = useState("relevantes");
  const [favorites, setFavorites] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("netinho-catalog-favorites") || "[]") as string[]; }
    catch { return []; }
  });
  const draft = useDraft();
  const toggleFavorite = (id: string) => {
    setFavorites((previous) => {
      const next = previous.includes(id) ? previous.filter((item) => item !== id) : [...previous, id];
      try { localStorage.setItem("netinho-catalog-favorites", JSON.stringify(next)); } catch { /* storage unavailable */ }
      return next;
    });
  };
  const filterOptions = [
    ["menor", "Preço menor"], ["maior", "Preço maior"], ["relevantes", "Relevantes"],
  ] as const;
  const { data: products = [], isLoading, error, refetch } = useQuery(productsQuery);
  const { data: registeredCategories = [], error: categoriesError, refetch: refetchCategories } = useQuery(categoriesQuery);
  const { data: access } = useQuery(accessQuery);
  const canSell = access?.can_sell === true || access?.level === 1;
  const visibleFilterOptions = filterOptions;
  const { data: campaignOffers = [], isLoading: campaignLoading } = useQuery({ queryKey: ["fco-campaign-10-2026"], queryFn: readOffers, staleTime: Infinity });

  useEffect(() => {
    setManufacturer(search.marca === "HD" ? "all" : (search.marca ?? "all"));
    setQ(search.q ?? "");
    setSearchInput(search.q ?? "");
    setHasSelectedCategory(false);
    setCategory("all");
    setVehicleBrand("all");
    setVehicleModel("all");
    setPage(1);
  }, [search.marca, search.q]);

  const localFco = useMemo(() => {
    const registeredFcoCodes = new Set(products.filter((p) => (p.manufacturer ?? "FCO") === "FCO").map((p) => p.code.toUpperCase()));
    return campaignOffers.filter(([code]) => !registeredFcoCodes.has(code.toUpperCase())).map(([code, application, price, stock]) => ({
    id: `fco-campaign-${code}`, code, application, refs: "",
    categories: { name: "Caixas de direção" }, category_id: "fco-campaign",
    manufacturer: "FCO" as const, image_url: null, catalog_page: null,
    price_cash: null, price_30: null, price_30_45_60: price,
    price_30_45_60_75: null, price_note: "Campanha outubro/2026", search_text: null,
    stock, active: true, brand: "FCO", created_at: "", updated_at: "", localOnly: true,
  })) as CatalogProduct[];
  }, [campaignOffers, products]);
  const combined = useMemo(() => {
    // Indexa os códigos HD uma vez, evitando percorrer todos os produtos
    // para cada item do catálogo local.
    const hdCodes = new Set(products.filter((p) => p.manufacturer === "HD").map((p) => p.code));
    return [
      ...products,
      ...localFco,
      ...localHd.filter((hd) => !hdCodes.has(hd.code)),
    ];
  }, [products, localFco]);
  const categories = useMemo(() => Array.from(new Set(combined.filter((p) => p.manufacturer !== "HD" && p.active !== false).map((p) => p.categories?.name).filter((n): n is string => typeof n === "string" && n.trim().length > 0))).sort((a, b) => a.localeCompare(b, "pt-BR")), [combined]);
  const categoryCounts = useMemo(() => {
    const eligible = combined.filter((p) => p.active !== false && p.manufacturer !== "HD" && (manufacturer === "all" || (p.manufacturer ?? "FCO") === manufacturer) && productMatches(p, dq));
    const counts = new Map<string, number>();
    for (const p of eligible) {
      const name = p.categories?.name;
      if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    return { total: eligible.length, counts };
  }, [combined, manufacturer, dq]);
  const availableVehicleBrands = useMemo(() => {
    // Uma única passagem pelos produtos elegíveis, sem repetir filtros para cada marca.
    const counts = new Map<string, number>();
    for (const product of combined) {
      if (product.active === false || product.manufacturer === "HD" || (manufacturer !== "all" && (product.manufacturer ?? "FCO") !== manufacturer) || (category !== "all" && product.categories?.name !== category) || !productMatches(product, dq)) continue;
      const application = product.application ?? "";
      for (const brand of vehicleBrands) {
        if (brand.pattern.test(application)) counts.set(brand.name, (counts.get(brand.name) ?? 0) + 1);
      }
    }
    return vehicleBrands.map((brand) => ({ ...brand, count: counts.get(brand.name) ?? 0 })).filter((brand) => brand.count > 0);
  }, [combined, manufacturer, category, dq]);
  const selectedVehicleBrand = useMemo(() => vehicleBrands.find((brand) => brand.name === vehicleBrand), [vehicleBrand]);
  const availableVehicleModels = useMemo(() => {
    if (vehicleBrand === "all") return [];
    const counts = new Map<string, number>();
    for (const product of combined) {
      if (product.active === false || product.manufacturer === "HD" || (manufacturer !== "all" && (product.manufacturer ?? "FCO") !== manufacturer) || (category !== "all" && product.categories?.name !== category) || !productMatches(product, dq)) continue;
      const application = product.application ?? "";
      if (!selectedVehicleBrand?.pattern.test(application)) continue;
      for (const model of vehicleModels[vehicleBrand] ?? []) {
        if (mentionsModel(application, model)) counts.set(model, (counts.get(model) ?? 0) + 1);
      }
    }
    return [...counts].map(([name, count]) => ({name, count})).sort((a,b) => a.name.localeCompare(b.name,"pt-BR"));
  }, [combined, manufacturer, category, dq, vehicleBrand, selectedVehicleBrand]);

  const list = useMemo(() => {
    // Índices temporários evitam percorrer favoritos e itens do pedido para cada peça.
    const favoriteIds = filterMode === "favoritos" ? new Set(favorites) : null;
    const orderProductIds = filterMode === "compras" ? new Set(draft.items.map((item) => item.productId)) : null;
    const recentPositions = filterMode === "recentes" ? new Map(recentCodes.map((code, index) => [code, index])) : null;
    const matching = combined.filter((p) =>
      p.manufacturer !== "HD" && (manufacturer === "all" || (p.manufacturer ?? "FCO") === manufacturer) && (category === "all" || p.categories?.name === category) && (vehicleBrand === "all" || selectedVehicleBrand?.pattern.test(p.application ?? "")) && (vehicleModel === "all" || mentionsModel(p.application ?? "", vehicleModel)) && productMatches(p, dq));
    const selected = matching.filter((p) => {
      if (filterMode === "recentes") return recentPositions?.has(p.code) === true;
      if (filterMode === "disponiveis") return p.stock > 0;
      if (filterMode === "favoritos") return favoriteIds?.has(p.id) === true;
      if (filterMode === "compras") return orderProductIds?.has(p.id) === true;
      if (filterMode === "ofertas") return /oferta|promo[cç][aã]o|campanha/i.test(p.price_note ?? "");
      if (filterMode === "saldao") return /sald[aã]o|liquida[cç][aã]o|queima de estoque/i.test(p.price_note ?? "");
      return true;
    });
    if (filterMode === "menor" || filterMode === "maior") {
      return [...selected].sort((a, b) => {
        const aPrice = a.price_cash, bPrice = b.price_cash;
        if (aPrice == null) return 1;
        if (bPrice == null) return -1;
        return filterMode === "menor" ? aPrice - bPrice : bPrice - aPrice;
      });
    }
    if (filterMode === "recentes") return [...selected].sort((a, b) => (recentPositions?.get(a.code) ?? Infinity) - (recentPositions?.get(b.code) ?? Infinity));
    return selected;
  }, [combined, manufacturer, category, vehicleBrand, vehicleModel, selectedVehicleBrand, dq, filterMode, favorites, draft.items, recentCodes]);
  const showProducts = hasSelectedCategory || vehicleBrand !== "all" || q.trim().length > 0;
  const pageCount = Math.max(1, Math.ceil(list.length / 24));
  const currentPage = Math.min(page, pageCount);
  const reset = () => { setFilterMode("relevantes"); setQ(""); setSearchInput(""); setManufacturer(search.marca === "HD" ? "all" : (search.marca ?? "all")); setCategory("all"); setVehicleBrand("all"); setVehicleModel("all"); setHasSelectedCategory(false); setPage(1); };
  const comparedProducts = compared.map((id) => combined.find((product) => product.id === id)).filter((p): p is CatalogProduct => !!p);
  const categoryIcon = (name: string) => /freio|disco|pastilha/i.test(name) ? Disc3 : /motor|coxim|embreagem/i.test(name) ? Cog : /suspens|amortec/i.test(name) ? Gauge : /elétr|eletr|igni|bobina/i.test(name) ? Zap : /filtro/i.test(name) ? Filter : /direç|direc/i.test(name) ? CarFront : /bateria/i.test(name) ? BatteryCharging : /rolamento/i.test(name) ? CircleDot : Settings2;

  return (
    <div className="catalog-showcase mx-auto w-full max-w-6xl space-y-4 px-2 pt-2 pb-28 sm:px-6 sm:pt-4 sm:pb-32">
      <div className="mx-auto w-full overflow-hidden rounded-2xl shadow-[0_5px_20px_rgba(0,48,105,0.25)]" aria-label="Catálogo de peças">
        <img src="/images/logo%20catalogo%20de%20pe%C3%A7as.webp" alt="Catálogo de Peças" className="block h-auto w-full object-contain" loading="eager" decoding="async" />
      </div>

      <section className="space-y-3 rounded-[22px] border-2 border-[#1b5b91] bg-gradient-to-b from-[#123c68] to-[#082644] p-3 shadow-lg sm:p-4" aria-label="Pesquisar catálogo">
        <div className="w-full" role="search">
          <div className="relative w-full min-w-0">
            <Search className="absolute left-3 top-4 text-[#1675d1]" size={20} aria-hidden="true" />
            <input id="catalog-search" aria-label="Buscar peças" value={searchInput}
              onChange={(e) => { const value = e.target.value; setSearchInput(value); setQ(value.trim()); setPage(1); }}
              placeholder="Busque pelo código, pela peça ou pelo veículo..."
              style={{ backgroundColor: "#ffffff", color: "#102a52", WebkitTextFillColor: "#102a52" }} className="min-h-14 w-full rounded-xl border-2 border-[#8dbbe5] pl-11 pr-9 text-sm font-semibold placeholder:!text-[#50657d] focus:border-[#facc15] focus:outline-none focus:ring-2 focus:ring-[#facc1540]" />
            {searchInput && <button type="button" aria-label="Limpar busca" onClick={() => { setSearchInput(""); setQ(""); setPage(1); }} className="absolute right-2 top-3.5 text-[#102a52]"><X size={20}/></button>}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
                        <div className="relative">
              <button type="button" aria-label="Filtros do catálogo" aria-expanded={filterOpen} onClick={() => setFilterOpen((open) => !open)}
                className="flex min-h-11 items-center gap-1 rounded-xl border-2 border-[#8fc9ff] bg-white px-3 py-2 text-[#102a52] hover:bg-[#eaf2ff]">
                <Filter size={19} /><span className="text-xs font-bold">Filtros</span>
              </button>
              {filterOpen && <div className="absolute left-0 top-full z-30 mt-2 w-44 overflow-hidden rounded-xl border border-[#416c93] bg-[#09213c] p-1 shadow-xl" role="group" aria-label="Ordenar e filtrar peças">
                {visibleFilterOptions.map(([value, label]) => <button key={value} type="button" aria-pressed={filterMode === value}
                  onClick={() => { setFilterMode(value); setPage(1); setFilterOpen(false); }}
                  className={`block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold hover:bg-[#24517b] ${filterMode === value ? "bg-[#21496c] text-[#39ff79]" : "text-white"}`}>{label}</button>)}
              </div>}
            </div>
          </div>
          <button type="button" onClick={() => { reset(); setFilterOpen(false); }} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border-2 border-[#8fc9ff] bg-white px-3 py-2 text-xs font-bold text-[#102a52] hover:bg-[#eaf2ff]" aria-label="Limpar filtros do catálogo"><X size={17} aria-hidden="true" />Limpar filtros</button>
        </div>
      </section>

      <section className="mt-4" aria-label="Buscar peças por representação">
        <p className="mb-3 border-b border-[#c7d8eb] pb-2 text-sm font-extrabold uppercase tracking-wide text-[#102a52]"><span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-b from-[#ffda5a] to-[#d59a05] text-[#09254d] shadow-sm">1</span>SELECIONE O CATÁLOGO</p>
        <nav className="grid grid-cols-4 items-stretch gap-1.5 sm:gap-3" aria-label="Filtro por representação">
          {(["all", "FCO", "HD", "JCREI"] as const).map((brand) => {
            const pending = brand === "HD" || brand === "JCREI";
            const selected = manufacturer === brand;
            const logo = brand === "FCO" ? "/images/brands/fco.webp" : brand === "HD" ? "/images/brands/hd.png" : brand === "JCREI" ? "/images/brands/Logo.webp" : null;
            return (
              <button
                key={brand}
                type="button"
                disabled={pending}
                aria-pressed={!pending && selected}
                aria-label={brand === "all" ? "Todas as representações" : brand === "JCREI" ? "JC REI — em breve" : `${brand}${pending ? " — em breve" : ""}`}
                title={pending ? "Em breve — representação em negociação" : brand === "all" ? "Todas as representações" : "Peças FCO"}
                onClick={() => { setManufacturer(brand); setCategory("all"); setVehicleBrand("all"); setHasSelectedCategory(false); setPage(1); }}
                className={`flex min-w-0 min-h-[72px] flex-col items-center justify-center gap-1 rounded-2xl border-2 px-1 py-2 shadow-sm text-center transition-colors ${pending ? "cursor-not-allowed border-[#a7b6c8] bg-[#e7edf4] text-[#102a52]" : selected ? "border-[#d4af37] bg-[#fff4c2] text-[#102a52] ring-2 ring-[#d4af37]/40" : "border-[#a7c1e5] bg-white text-[#102a52] hover:border-[#d4af37]"}`}
              >
                {logo ? <img src={logo} alt={brand === "JCREI" ? "JC REI" : brand} loading="lazy" decoding="async" className={`h-9 w-full max-w-[82px] object-contain ${pending ? "grayscale opacity-65" : ""}`} /> : <span className="text-xs font-extrabold sm:text-sm">TODOS</span>}
                {pending && <span className="text-[10px] font-bold leading-tight text-[#102a52]">Em breve</span>}
              </button>
            );
          })}
        </nav>
      </section>

      <p className="mb-3 mt-5 border-b border-[#c7d8eb] pb-2 text-sm font-extrabold uppercase tracking-wide text-[#102a52]"><span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-b from-[#ffda5a] to-[#d59a05] text-[#09254d] shadow-sm">2</span>ESCOLHA A CATEGORIA</p><nav className="catalog-category-filters" aria-label="Categorias de peças">
        <div className="catalog-category-item">
          <button type="button" aria-label="Todas as peças" title="Todas as peças" className="category-with-photo !p-0 !overflow-hidden relative" aria-pressed={category === "all"} onClick={() => { setCategory("all"); setHasSelectedCategory(true); setPage(1); }}><img src="/images/categorias/todas%20as%20pe%C3%A7as.webp" alt="Todas as peças" loading="eager" decoding="async" className="catalog-category-photo !w-full !h-full !max-w-none !max-h-none !rounded-none !object-cover" /></button>
          <span className="catalog-category-count">{categoryCounts.total} Itens</span>
        </div>
        {categories.map((name) => {
          const Icon = categoryIcon(name);
          const photo = categoryPhoto(name);
          return <div key={name} className="catalog-category-item">
            <button type="button" aria-label={displayCategoryName(name)} title={displayCategoryName(name)} className={photo ? "category-with-photo !p-0 !overflow-hidden relative" : "relative"} aria-pressed={category === name} onClick={() => { setCategory(name); setVehicleBrand("all"); setVehicleModel("all"); setHasSelectedCategory(true); setPage(1); }}>
              {photo ? <span className="relative flex h-full w-full items-center justify-center"><Icon size={35} strokeWidth={1.8} aria-hidden="true" className="absolute text-slate-500" /><img src={photo} alt={displayCategoryName(name)} loading="lazy" decoding="async" className="catalog-category-photo relative z-10 !w-full !h-full !max-w-none !max-h-none !rounded-none !object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} /></span> : <Icon size={35} strokeWidth={1.8} aria-hidden="true" />}
            </button>
            <span className="catalog-category-count">{categoryCounts.counts.get(name) ?? 0} Itens</span>
          </div>;
        })}
      </nav>
      <p className="mb-3 mt-5 border-b border-[#c7d8eb] pb-2 text-sm font-extrabold uppercase tracking-wide text-[#102a52]"><span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-b from-[#ffda5a] to-[#d59a05] text-[#09254d] shadow-sm">3</span>SELECIONE A MARCA DA MONTADORA</p>
      <nav aria-label="Filtrar peças por montadora" className="mb-4 flex w-full snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain rounded-xl bg-gradient-to-r from-[#f7fbff] via-white to-[#edf5ff] px-2 py-3 [scrollbar-width:thin]">
        {availableVehicleBrands.map((brand) => <div key={brand.name} className="flex shrink-0 snap-start flex-col items-center gap-1"><button type="button" title={`Ver peças para ${brand.name}`} aria-label={`Ver peças para ${brand.name}`} aria-pressed={vehicleBrand === brand.name} onClick={() => { setVehicleBrand(vehicleBrand === brand.name ? "all" : brand.name); setVehicleModel("all"); setHasSelectedCategory(true); setPage(1); }} className={`flex min-h-[76px] min-w-[88px] shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border-2 px-3 py-2 text-xs font-bold shadow-sm transition-colors ${vehicleBrand === brand.name ? "border-[#d4af37] bg-[#fff3bd] text-[#102a52] ring-2 ring-[#d4af37]/30" : "border-[#9fb2ca] bg-white text-[#102a52]"}`}>
          <img src={`https://cdn.simpleicons.org/${brand.slug}/${brand.color}`} alt="" aria-hidden="true" loading="lazy" decoding="async" className="h-9 w-9 object-contain" onError={(event) => { event.currentTarget.style.display = "none"; }} />
          <span>{brand.name}</span>
          
        </button><span className="text-[11px] font-bold text-[#102a52]">{brand.count} peças</span></div>)}
      </nav>
      {vehicleBrand !== "all" && <section aria-label="Modelos dos veículos" className="mb-4">
        <p className="mb-3 border-b border-[#c7d8eb] pb-2 text-sm font-extrabold uppercase tracking-wide text-[#102a52]"><span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-b from-[#ffda5a] to-[#d59a05] text-[#09254d] shadow-sm">4</span>SELECIONE O MODELO DO VEÍCULO</p>
        {availableVehicleModels.length ? <div className="flex w-full snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-3 [scrollbar-width:thin]">
          {availableVehicleModels.map((model) => <button key={model.name} type="button" aria-pressed={vehicleModel === model.name} onClick={() => { setVehicleModel(vehicleModel === model.name ? "all" : model.name); setHasSelectedCategory(true); setPage(1); }} className={`group flex min-h-[154px] min-w-[150px] max-w-[174px] shrink-0 snap-start flex-col items-center justify-between overflow-hidden rounded-2xl border-2 bg-gradient-to-b from-white to-[#f4f8fd] p-2 text-center shadow-[0_4px_10px_rgba(0,51,111,0.14)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${vehicleModel === model.name ? "border-[#e8ab16] ring-2 ring-[#ffdc55] shadow-[0_0_12px_rgba(255,204,0,0.3)]" : "border-[#c7d9ed] hover:border-[#d4af37]"}`}>
            <span className="flex h-[94px] w-full items-center justify-center rounded-xl bg-white text-[#174477]">
              <VehicleModelPicture name={model.name} />
            </span>
            <span className="mt-1 w-full break-words text-[13px] font-extrabold leading-tight text-[#102a52]">{model.name}</span>
            <span className="text-[11px] font-semibold text-[#4a6785]">{model.count} peças</span>
          </button>)}
        </div> : <p className="text-xs text-[#102a52]">Nenhum modelo identificado nas aplicações cadastradas para esta marca.</p>}
      </section>}
      {categoriesError && <div role="alert" className="rounded-xl border border-amber-400/30 p-4 text-sm">Não foi possível carregar todas as categorias. <button type="button" className="font-bold underline" onClick={() => void refetchCategories()}>Tentar novamente</button></div>}
      {error && <div role="alert" className="rounded-xl border border-amber-400/30 p-4 text-sm">Não foi possível carregar todas as peças. <button type="button" className="font-bold underline" onClick={() => refetch()}>Tentar novamente</button></div>}
      {(isLoading || campaignLoading) && <p role="status" className="text-sm">Carregando catálogo...</p>}
      {showProducts && (list.length ? (
        <ul className="catalog-product-grid grid grid-cols-1 gap-4">
          {list.slice((currentPage - 1) * 24, currentPage * 24).map((p) => <CatalogCard key={p.id} p={p} isFavorite={favorites.includes(p.id)} onToggleFavorite={() => toggleFavorite(p.id)} isCompared={compared.includes(p.id)} onToggleCompare={() => toggleCompare(p.id)} onView={() => recordViewed(p.code)}/>)}
        </ul>
      ) : !isLoading && <div className="surface-card p-10 text-center"><PackageSearch className="mx-auto text-primary" size={36}/><p className="mt-3 font-bold">Nenhuma peça encontrada.</p><button type="button" className="mt-3 underline" onClick={() => { setCategory("all"); setHasSelectedCategory(true); setPage(1); }}>Mostrar todas</button></div>)}
      {showProducts && pageCount > 1 && <nav aria-label="Páginas do catálogo" className="flex items-center justify-center gap-4 pb-5">
        <button type="button" disabled={currentPage === 1} onClick={() => { setPage(currentPage - 1); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="rounded-xl border border-[#a7c1e5] bg-[#eaf2ff] px-4 py-3 font-bold text-[#102a52] disabled:opacity-40">Anterior</button>
        <span className="text-sm font-bold">{currentPage} de {pageCount}</span>
        <button type="button" disabled={currentPage === pageCount} onClick={() => { setPage(currentPage + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="rounded-xl border border-[#a7c1e5] bg-[#eaf2ff] px-4 py-3 font-bold text-[#102a52] disabled:opacity-40">Próxima</button>
      </nav>}
    </div>
  );
}

function CatalogCard({ p, isFavorite, onToggleFavorite, isCompared, onToggleCompare, onView }: { p: CatalogProduct; isFavorite: boolean; onToggleFavorite: () => void; isCompared: boolean; onToggleCompare: () => void; onView: () => void }) {
  const [details, setDetails] = useState(false);
  const [promotionBusy, setPromotionBusy] = useState(false);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: access } = useQuery(accessQuery);
  const canSell = access?.can_sell === true || access?.level === 1;
  const isAdmin = access?.level === 1;
  const promotionType = /sald[aã]o|liquida[cç][aã]o|queima de estoque/i.test(p.price_note ?? "") ? "saldao" : /oferta|promo[cç][aã]o|campanha/i.test(p.price_note ?? "") ? "oferta" : "normal";
  async function setPromotion(type: "normal" | "oferta" | "saldao") {
    if (!isAdmin || p.localOnly || promotionBusy) return;
    setPromotionBusy(true);
    const note = type === "normal" ? null : type === "oferta" ? "Oferta" : "Saldão";
    const { error } = await supabase.from("products").update({ price_note: note }).eq("id", p.id);
    setPromotionBusy(false);
    if (error) { toast.error("Não foi possível atualizar a campanha: " + error.message); return; }
    await qc.invalidateQueries({ queryKey: ["products"] });
    toast.success(type === "normal" ? "Campanha removida." : "Produto marcado como " + (type === "oferta" ? "Oferta" : "Saldão") + ".");
  }
  const [showContact, setShowContact] = useState(false);
  const [city, setCity] = useState("");
  const { data: representatives = [], isError: representativesError } = useQuery({
    queryKey: ["public-sales-contacts"],
    enabled: showContact,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("commercial_representatives")
        .select("id,full_name,email,phone").eq("active", true).order("full_name");
      if (error) throw error;
      return (data ?? []).filter((seller) => !!seller.phone);
    },
  });

  const { data: regions = [] } = useQuery({
    queryKey: ["public-representative-regions"],
    enabled: showContact,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("representative_profiles").select("email,region");
      if (error) throw error;
      return data ?? [];
    },
  });
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const matchedRepresentatives = city.trim().length >= 2 ? representatives.filter((seller) =>
    regions.some((region) => region.email?.toLowerCase() === seller.email?.toLowerCase() &&
      normalize(region.region).includes(normalize(city)))
  ) : [];
  function whatsapp(phone: string) {
    const number = phone.replace(/\D/g, "");
    const target = number.length === 10 || number.length === 11 ? "55" + number : number;
    const message = "Olá! Tenho interesse na peça " + p.code + " (" + (p.manufacturer ?? "FCO") + ") do catálogo Netinho Auto Parts. Gostaria de falar com um vendedor sobre a compra. Minha cidade é " + (city.trim() || "não informada") + ".";
    window.open("https://wa.me/" + target + "?text=" + encodeURIComponent(message), "_blank", "noopener,noreferrer");
  }
  function buy() {
    if (!canSell) { setShowContact(true); return; }
    if (p.manufacturer === "HD") { toast.info("HD Embreagens: em breve."); return; }
    const prices = { cash: p.price_cash, "30": p.price_30, "30_45_60": p.price_30_45_60, "30_45_60_75": p.price_30_45_60_75 };
    if (Object.values(prices).every((value) => value == null)) {
      toast.info("Peça sem preço cadastrado. Consulte a distribuidora.");
      void navigate({ to: "/vendas", search: { modo: "venda", q: p.code, promo: "" } });
      return;
    }
    if (p.id.startsWith("fco-campaign-")) {
      void navigate({ to: "/vendas", search: { modo: "venda", q: p.code, promo: p.code } });
      return;
    }
    if (p.localOnly) {
      toast.info("Esta peça ainda não está cadastrada para pedidos. Consulte a distribuidora.");
      void navigate({ to: "/vendas", search: { modo: "venda", q: p.code, promo: "" } });
      return;
    }
    const draft = draftActions.get();
    if (draft.kind === "orcamento" && draft.items.length > 0 && !window.confirm("Transformar o orçamento em andamento em venda?")) return;
    const term = prices[draft.paymentTerm] != null ? draft.paymentTerm : (prices.cash != null ? "cash" : prices["30"] != null ? "30" : prices["30_45_60"] != null ? "30_45_60" : "30_45_60_75");
    draftActions.update({ kind: "pedido", paymentTerm: term });
    draftActions.addItem({ productId: p.id, code: p.code, category: `${brand} · ${p.categories?.name ?? "Peça automotiva"}`, application: p.application ?? "", prices, quantity: 1 });
    toast.success(`Peça ${p.code} adicionada ao pedido.`);
    void navigate({ to: "/pedido" });
  }
  const brand = p.manufacturer ?? "FCO";
  const img = p.image_url || categoryPhoto(p.categories?.name ?? "") || partImage(p.categories?.name);
    return <li className="catalog-product-card surface-card grid min-w-0 grid-cols-[minmax(0,1fr)] overflow-hidden rounded-2xl p-3 sm:grid-cols-[minmax(150px,28%)_minmax(0,1fr)]">
    <div className="relative catalog-card-image-col"><button type="button" onClick={onToggleFavorite} aria-label={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"} aria-pressed={isFavorite} className="absolute right-2 top-2 z-10 rounded-full bg-[#09213c] p-2 text-[#39ff79] shadow-lg"><Heart size={19} fill={isFavorite ? "currentColor" : "none"} /></button><div className="product-visual" aria-label={`Imagem da peça ${p.code}`}>{img ? <img src={img} alt={`Peça ${brand} ${p.code}`} loading="lazy" decoding="async"/> : <PackageSearch size={45} className="text-zinc-400"/>}</div></div>

    {showContact && <div className="rounded-xl border-2 border-[#a7c1e5] bg-[#f4f8ff] p-3 text-[#102a52]" role="group" aria-label={"Contato para comprar " + p.code}>
      <div className="mb-2 flex items-start justify-between gap-2"><p className="font-extrabold">Deseja comprar a peça {p.code}?</p><button type="button" aria-label="Fechar opções de contato" onClick={() => setShowContact(false)}><X size={20}/></button></div>
      <label htmlFor={"city-" + p.id} className="mb-1 block text-sm font-bold">Qual é a sua cidade?</label>
      <input id={"city-" + p.id} value={city} onChange={(event) => setCity(event.target.value)} placeholder="Digite sua cidade" autoComplete="address-level2" className="mb-3 min-h-12 w-full rounded-lg border border-[#a7c1e5] bg-white px-3 text-[#102a52]" />
      <p className="mb-3 text-sm">Representantes que atendem sua cidade, quando cadastrados. A peça escolhida irá na mensagem.</p>
      {matchedRepresentatives.map((seller) => <button key={seller.id} type="button" onClick={() => whatsapp(seller.phone!)} className="mb-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#a7c1e5] bg-white p-2 text-sm font-bold text-[#102a52]"><MessageCircle size={18}/> {seller.full_name}</button>)}
      {city.trim().length >= 2 && matchedRepresentatives.length === 0 && <p className="mb-2 text-sm">Nenhum representante localizado para essa cidade. Consulte o atendimento Netinho.</p>}
      <button type="button" onClick={() => whatsapp("5515992458492")} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#137c45] p-3 text-center text-sm font-extrabold text-white"><MessageCircle size={20}/> Falar com o atendimento Netinho</button>
      {representativesError && <p className="mt-2 text-xs">A lista de representantes não está disponível. Utilize o atendimento Netinho.</p>}
    </div>}
    <div className="catalog-card-info flex min-w-0 flex-1 flex-col px-1 pb-2 pt-4">
      <div className="flex items-start justify-between gap-2">
        <h2 className="min-w-0 flex-1 text-2xl sm:text-3xl font-black text-[#102a52]">{displayCategoryName(p.categories?.name?.replace(/^HD · /, "") || "Peça automotiva")}</h2>
      </div>
      <VehicleBrandIcons application={p.application} />
      
      <div className="my-3 flex flex-wrap items-center gap-2">
        <button type="button" aria-expanded={details} onClick={() => { if (!details) onView(); setDetails(!details); }} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#42678b] bg-[#142f4c] px-3 py-2 text-sm font-bold text-[#e5f2ff]"><PackageSearch size={18}/>{details ? "Fechar ficha técnica" : "Ficha técnica"}</button>
        <button type="button" onClick={buy} aria-label={canSell ? "Adicionar peça à venda" : "Consultar compra da peça"} title={canSell ? "Adicionar à venda" : "Consultar compra"} className="ml-auto inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#2588f9] bg-[#0878ed] px-3 py-2 text-sm font-bold text-white shadow-sm"><ShoppingCart size={20} aria-hidden="true" /><span className="sr-only">Comprar</span></button>
      </div>
      {details && <div className="mb-3 space-y-2 rounded-xl border border-[#102a52] bg-[#f1f1f1] p-3 text-sm leading-6 text-[#102a52]" style={{ backgroundColor: "var(--netinho-page-bg, #f1f1f1)", color: "#102a52" }}>
        <p><strong>Código:</strong> {p.code}</p>
        <p><strong>Fabricante:</strong> {p.manufacturer || "Não informado"}</p>
        <p><strong>Categoria:</strong> {displayCategoryName(p.categories?.name || "Não informada")}</p>
        {p.application && <p><strong>Aplicações:</strong> {p.application}</p>}
        {p.refs && <p><strong>Referências:</strong> {p.refs}</p>}
        <p className="text-xs text-[#102a52]">Confira a aplicação e as referências com o fabricante antes de confirmar a compra.</p>
        {p.catalog_page && <CatalogDownload brand="HD" page={p.catalog_page} className="text-xs underline"/>}
      </div>}
      {canSell && <div className="mt-2 space-y-2">
        <div className="catalog-card-stock">{p.stock > 0 ? `● Estoque = ${p.stock} un.` : "Estoque não informado"}</div>
      </div>}
      <div className="mt-auto pt-3">
        <div className="catalog-price-highlight flex flex-wrap items-center justify-between gap-2 rounded-xl border-2 border-[#d4af37] bg-[#102a52] px-4 py-3 shadow-md"><span className="text-base font-extrabold text-[#f4cf60]">{p.price_cash != null ? "Preço à vista:" : "Preço disponível:"}</span>{p.price_cash != null ? <strong className="text-2xl font-black text-[#f4cf60]">{brl(p.price_cash)}</strong> : <span className="text-sm font-semibold text-[#f4cf60]">{p.price_30 != null ? `30 dias: ${brl(p.price_30)}` : p.price_30_45_60 != null ? `30/45/60 dias: ${brl(p.price_30_45_60)}` : p.price_30_45_60_75 != null ? `30/45/60/75 dias: ${brl(p.price_30_45_60_75)}` : "Sob consulta"}</span>}</div>
      </div>
    </div>
  </li>;
}
