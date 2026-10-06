import embreagem from "@/assets/parts/embreagem.jpg";
import corrente from "@/assets/parts/corrente.jpg";
import tbi from "@/assets/parts/tbi.jpg";
import turbina from "@/assets/parts/turbina.jpg";
import atuador from "@/assets/parts/atuador.jpg";
import rolamento from "@/assets/parts/rolamento.jpg";
import coxim from "@/assets/parts/coxim.jpg";
import bobina from "@/assets/parts/bobina.jpg";

/** Foto ilustrativa por família de peça (ordem importa: "corrente" antes de "embreagem"/"atuador"). */
const RULES: [string, string][] = [
  ["corrente", corrente], ["atuador", atuador], ["embreagem", embreagem], ["tbi", tbi],
  ["turbina", turbina], ["rolamento", rolamento], ["coxim", coxim], ["bobina", bobina],
];

export function partImage(category: string | null | undefined): string | null {
  const c = (category ?? "").toLowerCase();
  return RULES.find(([k]) => c.includes(k))?.[1] ?? null;
}
