import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("sonner", () => ({ toast: { loading: vi.fn(), success: vi.fn(), error: vi.fn() } }));
import { toast } from "sonner";
import { CatalogDownload } from "@/components/CatalogDownload";

const pdfResponse = (bytes = 3) => ({
  ok: true,
  status: 200,
  headers: new Headers({ "content-type": "application/pdf", "content-length": String(bytes) }),
  body: null,
  blob: async () => new Blob([new Uint8Array(bytes)], { type: "application/pdf" }),
});
const missingResponse = {
  ok: false,
  status: 404,
  headers: new Headers({ "content-type": "text/plain" }),
  body: null,
  blob: async () => new Blob([""]),
};

let appended: HTMLAnchorElement[] = [];
const appendOriginal = document.body.appendChild.bind(document.body);

beforeEach(() => {
  appended = [];
  URL.createObjectURL = vi.fn(() => "blob:catalogo");
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  vi.spyOn(document.body, "appendChild").mockImplementation((node) => {
    if (node instanceof HTMLAnchorElement) appended.push(node);
    return appendOriginal(node as Node);
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("catalog download", () => {
  it("asks for the FCO file published under /downloads", async () => {
    const fetchMock = vi.fn(async () => missingResponse);
    vi.stubGlobal("fetch", fetchMock);
    render(<CatalogDownload brand="FCO" />);
    fireEvent.click(screen.getByRole("button", { name: "Baixar catálogo PDF FCO" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock.mock.calls[0][0]).toBe("/downloads/Catalogo_Completo_FCO.pdf");
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ cache: "no-store" });
  });

  it("asks for the HD file when the brand is HD", async () => {
    const fetchMock = vi.fn(async () => missingResponse);
    vi.stubGlobal("fetch", fetchMock);
    render(<CatalogDownload brand="HD" />);
    fireEvent.click(screen.getByRole("button", { name: "Baixar catálogo PDF HD" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock.mock.calls[0][0]).toBe("/downloads/hd-catalogo.pdf");
  });

  it("tells the user the catalog is not available when the file is missing", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => missingResponse));
    render(<CatalogDownload brand="HD" />);
    fireEvent.click(screen.getByRole("button", { name: "Baixar catálogo PDF HD" }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "O catálogo PDF ainda não está disponível para download.",
        expect.anything(),
      ),
    );
    expect(appended).toHaveLength(0);
  });

  it("saves the catalog under its official file name once the PDF arrives", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => pdfResponse()));
    render(<CatalogDownload brand="FCO" />);
    fireEvent.click(screen.getByRole("button", { name: "Baixar catálogo PDF FCO" }));
    await waitFor(() => expect(appended).toHaveLength(1));
    expect(appended[0]?.download).toBe("Catalogo_Completo_FCO.pdf");
    expect(appended[0]?.href).toBe("blob:catalogo");
    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining("Catálogo FCO pronto"),
      expect.anything(),
    );
  });
});
