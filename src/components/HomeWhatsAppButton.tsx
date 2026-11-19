import { BRAND } from "@/lib/brand";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";

/**
 * Atendimento pelo WhatsApp no cabeçalho da página inicial, no fluxo normal (sem sobrepor
 * conteúdo). Usa o ícone oficial do site e o mesmo padrão do rodapé: verde e telefone em negrito.
 */
export function HomeWhatsAppButton() {
  const href = `https://wa.me/${BRAND.phoneDigits}?text=${encodeURIComponent("Olá, Netinho Auto Parts! Preciso de ajuda para encontrar uma peça.")}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Falar com a Netinho pelo WhatsApp ${BRAND.phone}`}
      title="Conversar pelo WhatsApp"
      className="flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-gold/50 bg-navy-deep/70 px-2 py-1.5 text-whatsapp transition-colors hover:bg-navy-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold sm:px-3"
    >
      <WhatsAppIcon size={28} />
      <span className="hidden text-left leading-tight sm:block">
        <strong className="block text-sm font-extrabold">WhatsApp</strong>
        <small className="block whitespace-nowrap text-xs font-bold">{BRAND.phone}</small>
      </span>
    </a>
  );
}
