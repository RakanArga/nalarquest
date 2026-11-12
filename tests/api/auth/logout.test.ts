import { beforeEach, describe, expect, it, vi } from "vitest";

const supabase = vi.hoisted(() => ({ signOut: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { signOut: supabase.signOut } }),
}));

import { POST } from "@/app/api/auth/logout/route";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/auth/logout", () => {
  it("sukses: sesi diakhiri", async () => {
    supabase.signOut.mockResolvedValue({ error: null });

    const res = await POST();
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
  });

  it("mengembalikan 500 bila signOut gagal", async () => {
    supabase.signOut.mockResolvedValue({ error: { message: "session error" } });

    const res = await POST();
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("session error");
  });

  it("tidak crash bila Supabase melempar exception", async () => {
    supabase.signOut.mockRejectedValue(new Error("network down"));

    const res = await POST();
    expect(res.status).toBe(500);
  });
});
