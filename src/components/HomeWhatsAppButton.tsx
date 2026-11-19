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
      className="netinho-home-whatsapp relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-0 bg-transparent p-0 text-whatsapp focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
    >
      <WhatsAppIcon size={42} />
    </a>
  );
}
