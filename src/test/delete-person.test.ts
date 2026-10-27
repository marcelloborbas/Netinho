import { describe, expect, it, vi } from "vitest";
import { handleDeletePerson, type DeletePersonServices } from "../../supabase/functions/delete-person/handler";

const adminId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const targetId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
function services(): DeletePersonServices {
  return {
    authenticate: vi.fn(async () => ({ id: adminId })),
    isAdmin: vi.fn(async () => true),
    targetExists: vi.fn(async () => true),
    deleteUser: vi.fn(async () => {}),
    verifyRemoved: vi.fn(async () => true),
  };
}
const request = (userId = targetId, token: string | null = "test-token") => new Request("https://example.test/delete-person", {
  method: "POST", headers: token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : {},
  body: JSON.stringify({ userId }),
});

describe("Permanent person deletion authorization", () => {
  it("requires authentication before deleting", async () => {
    const api = services();
    expect((await handleDeletePerson(request(targetId, null), api)).status).toBe(401);
    expect(api.deleteUser).not.toHaveBeenCalled();
  });
  it("denies authenticated non-admin users", async () => {
    const api = services(); api.isAdmin = vi.fn(async () => false);
    expect((await handleDeletePerson(request(), api)).status).toBe(403);
    expect(api.deleteUser).not.toHaveBeenCalled();
  });
  it("prevents deleting the administrator's own account even with uppercase UUID", async () => {
    const api = services();
    expect((await handleDeletePerson(request(adminId.toUpperCase()), api)).status).toBe(403);
    expect(api.deleteUser).not.toHaveBeenCalled();
  });
  it("deletes only the selected user and confirms exact identity", async () => {
    const api = services(); const response = await handleDeletePerson(request(), api);
    expect(api.deleteUser).toHaveBeenCalledExactlyOnceWith(targetId);
    expect(api.verifyRemoved).toHaveBeenCalledExactlyOnceWith(targetId);
    expect(await response.json()).toMatchObject({ success: true, deletedUserId: targetId });
  });
  it("never reports success on database constraints or Auth failures", async () => {
    const api = services(); api.deleteUser = vi.fn(async () => { throw new Error("constraint"); });
    const response = await handleDeletePerson(request(), api);
    expect(response.status).toBe(409);
    expect((await response.json()).success).toBeUndefined();
    expect(api.verifyRemoved).not.toHaveBeenCalled();
  });
  it("never reports success when related records remain", async () => {
    const api = services(); api.verifyRemoved = vi.fn(async () => false);
    const response = await handleDeletePerson(request(), api);
    expect(response.status).toBe(500);
    expect((await response.json()).success).toBeUndefined();
  });
  it("does not attempt deleting nonexistent accounts", async () => {
    const api = services(); api.targetExists = vi.fn(async () => false);
    expect((await handleDeletePerson(request(), api)).status).toBe(404);
    expect(api.deleteUser).not.toHaveBeenCalled();
  });
});