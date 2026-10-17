import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  user: null as { id: string; is_anonymous: boolean } | null,
  download: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: state.user }, error: null }) },
    storage: { from: () => ({ download: state.download }) },
  },
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));
import { CatalogDownload } from "@/components/CatalogDownload";
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
describe("catalog download authentication", () => {
  it.each([null, { id: "anonymous", is_anonymous: true }])(
    "blocks download without a real login (%j)",
    async (user) => {
      state.user = user;
      render(<CatalogDownload brand="FCO" />);
      fireEvent.click(screen.getByRole("button", { name: "Baixar PDF FCO" }));
      await waitFor(() =>
        expect(screen.getByRole("button", { name: "Baixar PDF FCO" })).toBeEnabled(),
      );
      expect(state.download).not.toHaveBeenCalled();
    },
  );
  it("requests the private catalog for a signed-in account", async () => {
    state.user = { id: "seller", is_anonymous: false };
    state.download.mockResolvedValue({ data: null, error: new Error("Offline") });
    render(<CatalogDownload brand="HD" />);
    fireEvent.click(screen.getByRole("button", { name: "Baixar PDF HD" }));
    await waitFor(() => expect(state.download).toHaveBeenCalledWith("hd-catalogo.pdf"));
  });
});
