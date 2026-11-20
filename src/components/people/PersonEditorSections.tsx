import { useCallback, useState, type ReactNode } from "react";
import {
  BriefcaseBusiness,
  IdCard,
  MapPin,
  Percent,
  ShieldCheck,
  X,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Blocos fixos da ficha administrativa de uma pessoa/representante. */
export type PersonSectionId = "dados" | "acesso" | "comissao" | "carteira" | "regiao";

export const PERSON_SECTIONS: ReadonlyArray<{
  id: PersonSectionId;
  label: string;
  icon: LucideIcon;
}> = [
  { id: "dados", label: "Dados e contato / WhatsApp", icon: IdCard },
  { id: "acesso", label: "Acesso e perfil", icon: ShieldCheck },
  { id: "comissao", label: "Comissão", icon: Percent },
  { id: "carteira", label: "Carteira de clientes", icon: BriefcaseBusiness },
  { id: "regiao", label: "Região", icon: MapPin },
];

function isSection(value: string): value is PersonSectionId {
  return PERSON_SECTIONS.some((section) => section.id === value);
}

/**
 * Estado dos blocos abertos. `reveal` abre um bloco e o traz para a tela —
 * usado pelas validações para mostrar onde está o problema.
 */
export function usePersonSections(idPrefix: string, initial: PersonSectionId[] = ["dados"]) {
  const [open, setOpen] = useState<PersonSectionId[]>(initial);
  const reveal = useCallback(
    (id: PersonSectionId) => {
      setOpen((current) => (current.includes(id) ? current : [...current, id]));
      requestAnimationFrame(() =>
        document
          .getElementById(`${idPrefix}-${id}`)
          ?.scrollIntoView({ block: "start", behavior: "smooth" }),
      );
    },
    [idPrefix],
  );
  return { open, setOpen, reveal, idPrefix };
}

export type PersonSectionsState = ReturnType<typeof usePersonSections>;

export interface PersonEditorSectionsProps {
  state: PersonSectionsState;
  /** Conteúdo e resumo curto (exibido com o bloco fechado) de cada bloco. */
  sections: Record<PersonSectionId, { content: ReactNode; summary?: ReactNode }>;
}

/**
 * Blocos recolhíveis da ficha. Todos ficam montados (apenas ocultos quando
 * fechados) para que edições ainda não salvas não se percam.
 */
export function PersonEditorSections({ state, sections }: PersonEditorSectionsProps) {
  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-3 sm:p-4" aria-label="Ficha completa de edição">
      {PERSON_SECTIONS.map(({ id, label, icon: Icon }) => (
        <section key={id} id={`${state.idPrefix}-${id}`} className="scroll-mt-4 border-b border-border pb-4 last:border-b-0 last:pb-0">
          <h4 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-navy">
            <Icon size={18} aria-hidden="true" />{label}
          </h4>
          {sections[id].content}
        </section>
      ))}
    </div>
  );
}

export interface PersonEditorFrameProps {
  title: string;
  saving: boolean;
  saveLabel: string;
  onSave: () => void;
  /** Fecha a ficha descartando o que não foi salvo. */
  onCancel: () => void;
  footerNote?: ReactNode;
  children: ReactNode;
}

/** Moldura da edição inline, com barra de Cancelar/Salvar sempre visível. */
export function PersonEditorFrame({
  title,
  saving,
  saveLabel,
  onSave,
  onCancel,
  footerNote,
  children,
}: PersonEditorFrameProps) {
  return (
    <section
      aria-label={title}
      className="mt-3 rounded-2xl border border-gold/60 bg-background text-navy"
    >
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2 sm:px-4">
        <h3 className="truncate text-sm font-black sm:text-base">{title}</h3>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          aria-label="Fechar edição"
          className="rounded-lg p-2 text-muted-foreground hover:bg-muted disabled:opacity-40"
        >
          <X size={20} />
        </button>
      </div>
      <div className="p-2 sm:p-3">{children}</div>
      <div className="sticky bottom-[calc(70px+env(safe-area-inset-bottom,0px))] z-10 flex flex-col gap-2 rounded-b-2xl border-t border-border bg-card/95 p-3 backdrop-blur sm:flex-row sm:items-center sm:justify-end">
        {footerNote && <p className="hidden text-xs text-muted-foreground sm:mr-auto sm:block">{footerNote}</p>}
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={onCancel}
            className="min-h-11"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={saving}
            onClick={onSave}
            className={cn("min-h-11 bg-navy font-bold text-navy-foreground hover:bg-navy-soft")}
          >
            {saving ? "Salvando…" : saveLabel}
          </Button>
        </div>
      </div>
    </section>
  );
}
