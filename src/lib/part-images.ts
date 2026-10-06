import embreagem from "@/assets/parts/embreagem.jpg";
import corrente from "@/assets/parts/corrente.jpg";
import tbi from "@/assets/parts/tbi.jpg";
import turbina from "@/assets/parts/turbina.jpg";
import atuador from "@/assets/parts/atuador.jpg";
import rolamento from "@/assets/parts/rolamento.jpg";
import coxim from "@/assets/parts/coxim.jpg";
import bobina from "@/assets/parts/bobina.jpg";
import bicoSprite from "@/assets/catalog/bico-sprite.webp";
import atuadorSprite from "@/assets/catalog/atuador-sprite.webp";

const RULES: [string, string][] = [
  ["corrente", corrente], ["atuador", atuador], ["embreagem", embreagem], ["tbi", tbi],
  ["turbina", turbina], ["rolamento", rolamento], ["coxim", coxim], ["bobina", bobina],
];

const BICO_CODES = [
  "701001","701002","701003","701004","701005","701006","701007","701008","701009","701010","701011","701012","701013",
  "701014","701015","701016","701017","701018","701019","701020","701021","701022","701023","701024","701025","701026","701027",
  "701028","701029","701030","701031","701032","701033","701034","701035","701036","701037","701038","701039","701040","701041",
  "701042","701043","701044","701045","701046","701047","701048","701049","701050","701051","701052","701053","701054","701055",
  "701056","701057","701058","701059","701060","701061","701062","701063","701064","701065","701066","701067","701068",
  "LN489","LN481","LN483","LN464","LN484","LN492","LN482","LN485","LN115","LN116","LN117","LN118","LN119",
];

const ATUADOR_CODES = ["A050J-1600006","A051J-1600006","A052J-1600006","A053J-1600006","A054J-1600006","A055J-1600006"];

export type CatalogSprite = { url: string; position: string; size: string; aspectRatio: string };

function sprite(code: string, codes: string[], columns: number, rows: number, url: string): CatalogSprite | null {
  const index = codes.indexOf(code);
  if (index < 0) return null;
  const col = index % columns;
  const row = Math.floor(index / columns);
  const x = columns === 1 ? 0 : (col / (columns - 1)) * 100;
  const y = rows === 1 ? 0 : (row / (rows - 1)) * 100;
  return { url, position: `${x}% ${y}%`, size: `${columns * 100}% ${rows * 100}%`, aspectRatio: columns === 9 ? "8 / 7" : "18 / 13" };
}

export function catalogSprite(code: string | null | undefined): CatalogSprite | null {
  if (!code) return null;
  const upper = code.toUpperCase();
  return sprite(upper.replace(/^BICO-/, ""), BICO_CODES, 9, 9, bicoSprite)
    ?? sprite(upper.replace(/^ATU-/, ""), ATUADOR_CODES, 3, 2, atuadorSprite);
}

export function partImage(category: string | null | undefined): string | null {
  const c = (category ?? "").toLowerCase();
  return RULES.find(([k]) => c.includes(k))?.[1] ?? null;
}
