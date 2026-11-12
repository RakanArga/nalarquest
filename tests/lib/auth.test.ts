import { beforeEach, describe, expect, it, vi } from "vitest";

const supabase = vi.hoisted(() => ({ getUser: vi.fn() }));
const db = vi.hoisted(() => ({
  profile: { findUnique: vi.fn(), upsert: vi.fn(), update: vi.fn() },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: supabase.getUser } }),
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

import { getCurrentProfile, getSession } from "@/lib/auth";

const USER = { id: "uuid-1", email: "siswa@example.com" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getSession", () => {
  it("mengembalikan null bila tidak ada sesi", async () => {
    supabase.getUser.mockResolvedValue({ data: { user: null }, error: new Error("no session") });
    await expect(getSession()).resolves.toBeNull();
  });

  it("mengembalikan user bila sesi valid", async () => {
    supabase.getUser.mockResolvedValue({ data: { user: USER }, error: null });
    await expect(getSession()).resolves.toEqual(USER);
  });
});

describe("getCurrentProfile", () => {
  it("mengembalikan null bila tidak ada sesi", async () => {
    supabase.getUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(getCurrentProfile()).resolves.toBeNull();
    expect(db.profile.findUnique).not.toHaveBeenCalled();
  });

  it("mengembalikan user + profile bila keduanya ada", async () => {
    supabase.getUser.mockResolvedValue({ data: { user: USER }, error: null });
    db.profile.findUnique.mockResolvedValue({ id: USER.id, nama: "Siswa", role: "Ksatria_Nalar" });

    const result = await getCurrentProfile();
    expect(result).toEqual({
      user: USER,
      profile: { id: USER.id, nama: "Siswa", role: "Ksatria_Nalar" },
    });
    expect(db.profile.findUnique).toHaveBeenCalledWith({ where: { id: USER.id } });
  });

  it("tidak crash bila database gagal (profile: null)", async () => {
    supabase.getUser.mockResolvedValue({ data: { user: USER }, error: null });
    db.profile.findUnique.mockRejectedValue(new Error("db down"));

    const result = await getCurrentProfile();
    expect(result).toEqual({ user: USER, profile: null });
  });
});
