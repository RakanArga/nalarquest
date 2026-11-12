import { beforeEach, describe, expect, it, vi } from "vitest";

const supabase = vi.hoisted(() => ({ getUser: vi.fn() }));
const db = vi.hoisted(() => ({
  profile: { findUnique: vi.fn(), upsert: vi.fn(), update: vi.fn() },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: supabase.getUser } }),
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

import { GET } from "@/app/api/auth/me/route";

const USER = { id: "uuid-1", email: "siswa@example.com" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/auth/me", () => {
  it("mengembalikan 401 bila tidak ada sesi", async () => {
    supabase.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const res = await GET();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.authenticated).toBe(false);
    expect(body.profile).toBeNull();
  });

  it("mengembalikan data user + profile bila sesi valid", async () => {
    supabase.getUser.mockResolvedValue({ data: { user: USER }, error: null });
    db.profile.findUnique.mockResolvedValue({
      id: USER.id,
      nama: "Siswa",
      role: "Cendekia_Analitik",
      createdAt: "2026-01-01T00:00:00.000Z",
    });

    const res = await GET();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.authenticated).toBe(true);
    expect(body.user.id).toBe(USER.id);
    expect(body.profile.role).toBe("Cendekia_Analitik");
  });

  it("mengembalikan profile null bila user ada tapi profile belum dibuat", async () => {
    supabase.getUser.mockResolvedValue({ data: { user: USER }, error: null });
    db.profile.findUnique.mockResolvedValue(null);

    const res = await GET();
    expect(res.status).toBe(200);
    expect((await res.json()).profile).toBeNull();
  });

  it("degradasi halus: 200 dengan profile null bila database gagal", async () => {
    supabase.getUser.mockResolvedValue({ data: { user: USER }, error: null });
    db.profile.findUnique.mockRejectedValue(new Error("db down"));

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.authenticated).toBe(true);
    expect(body.profile).toBeNull();
  });
});
