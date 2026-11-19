import { useEffect, useRef, type ReactNode } from "react";
import {
  BriefcaseBusiness,
  IdCard,
  MapPin,
  Percent,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

/** Abas fixas da ficha administrativa de uma pessoa/representante. */
export type PersonFileTabId = "dados" | "acesso" | "comissao" | "carteira" | "regiao";

export const PERSON_FILE_TABS: ReadonlyArray<{
  id: PersonFileTabId;
  label: string;
  icon: LucideIcon;
}> = [
  { id: "dados", label: "Dados pessoais", icon: IdCard },
  { id: "acesso", label: "Acesso", icon: ShieldCheck },
  { id: "comissao", label: "Comissão", icon: Percent },
  { id: "carteira", label: "Carteira de clientes", icon: BriefcaseBusiness },
  { id: "regiao", label: "Região de atendimento", icon: MapPin },
];

export interface PersonFileTabsProps {
  value: PersonFileTabId;
  onValueChange: (tab: PersonFileTabId) => void;
  /** Conteúdo de cada aba. Todas ficam montadas para não perder edições não salvas. */
  panels: Record<PersonFileTabId, ReactNode>;
  /** Nome usado nos rótulos acessíveis (ex.: "Ficha de Maria"). */
  label: string;
}

function isTab(value: string): value is PersonFileTabId {
  return PERSON_FILE_TABS.some((tab) => tab.id === value);
}

/**
 * Navegação por abas dentro do próprio card. Em telas estreitas a lista rola
 * horizontalmente e a aba ativa é trazida para a área visível.
 */
export function PersonFileTabs({ value, onValueChange, panels, label }: PersonFileTabsProps) {
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const active = listRef.current?.querySelector<HTMLElement>('[data-state="active"]');
    active?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [value]);

  return (
    <Tabs
      value={value}
      onValueChange={(next) => {
        if (isTab(next)) onValueChange(next);
      }}
      className="w-full"
    >
      <TabsList
        ref={listRef}
        aria-label={label}
        className="flex h-auto w-full justify-start gap-1 overflow-x-auto overscroll-x-contain rounded-xl bg-muted p-1 [scrollbar-width:thin]"
      >
        {PERSON_FILE_TABS.map(({ id, label: tabLabel, icon: Icon }) => (
          <TabsTrigger
            key={id}
            value={id}
            className={cn(
              "min-h-10 shrink-0 gap-1.5 rounded-lg px-3 text-xs font-bold text-muted-foreground sm:text-sm",
              "hover:text-navy data-[state=active]:bg-navy data-[state=active]:text-navy-foreground data-[state=active]:shadow-md",
              "[&[data-state=active]_svg]:text-gold",
            )}
          >
            <Icon size={16} aria-hidden="true" />
            {tabLabel}
          </TabsTrigger>
        ))}
      </TabsList>
      {PERSON_FILE_TABS.map(({ id }) => (
        <TabsContent key={id} value={id} forceMount className="mt-3 data-[state=inactive]:hidden">
          {panels[id]}
        </TabsContent>
      ))}
    </Tabs>
  );
}
