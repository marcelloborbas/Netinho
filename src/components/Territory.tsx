import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
export function Territory({ email }: { email?: string | undefined }) {
  const [open, setOpen] = useState(false);
  const { data: profile } = useQuery({
    queryKey: ["my-territory", email],
    enabled: !!email,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("representative_profiles")
        .select("slug,full_name,region")
        .ilike("email", email!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  if (!profile)
    return (
      <p className="mt-3 text-sm text-muted-foreground">
        Área de atuação: consulte seu cadastro com a administração.
      </p>
    );
  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <p className="text-sm">
        Área de atuação: <strong>{profile.region}</strong>
      </p>
      {profile.slug === "abdenego-eugenio" && (
        <>
          <button className="classic-button" onClick={() => setOpen(true)}>
            Ver área no mapa
          </button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="max-w-5xl">
              <DialogHeader>
                <DialogTitle>Área de atuação · {profile.full_name}</DialogTitle>
              </DialogHeader>
              <a href="/images/territories/abdenego.webp" target="_blank" rel="noreferrer">
                <img
                  className="max-h-[70vh] w-full object-contain"
                  src="/images/territories/abdenego.webp"
                  alt="Mapa dos municípios paulistas da área de atuação de Abdenego"
                />
              </a>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
