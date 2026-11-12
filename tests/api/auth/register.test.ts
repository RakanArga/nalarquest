import { beforeEach, describe, expect, it, vi } from "vitest";

const supabase = vi.hoisted(() => ({ signUp: vi.fn() }));
const db = vi.hoisted(() => ({ profile: { upsert: vi.fn(), findUnique: vi.fn(), update: vi.fn() } }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { signUp: supabase.signUp } }),
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

import { POST } from "@/app/api/auth/register/route";

function req(body: unknown) {
  return new Request("http://localhost/api/auth/register", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

const USER = { id: "uuid-1", email: "siswa@example.com" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/auth/register", () => {
  it("menolak field wajib yang hilang", async () => {
    const res = await POST(req({ email: "a@b.co", password: "123456" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/wajib diisi/);
  });

  it("menolak password terlalu pendek", async () => {
    const res = await POST(req({ email: "a@b.co", password: "123", nama: "Siswa" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/minimal/);
  });

  it("meneruskan error Supabase dengan status 400", async () => {
    supabase.signUp.mockResolvedValue({ data: {}, error: { message: "User already registered" } });
    const res = await POST(req({ email: "a@b.co", password: "123456", nama: "Siswa" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("User already registered");
  });

  it("mengembalikan 500 bila Supabase tidak mengembalikan user", async () => {
    supabase.signUp.mockResolvedValue({ data: { user: null }, error: null });
    const res = await POST(req({ email: "a@b.co", password: "123456", nama: "Siswa" }));
    expect(res.status).toBe(500);
  });

  it("sukses: membuat profile tanpa roleId (peran dari enum default)", async () => {
    supabase.signUp.mockResolvedValue({ data: { user: USER }, error: null });
    db.profile.upsert.mockResolvedValue({ id: USER.id, nama: "Siswa", role: "Ksatria_Nalar" });

    const res = await POST(req({ email: USER.email, password: "123456", nama: "Siswa" }));
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.profile.nama).toBe("Siswa");

    expect(db.profile.upsert).toHaveBeenCalledTimes(1);
    const args = db.profile.upsert.mock.calls[0][0];
    expect(args.create).toEqual({ id: USER.id, nama: "Siswa" });
    expect(args.where).toEqual({ id: USER.id });
    expect(JSON.stringify(args)).not.toContain("roleId");
  });

  it("mengembalikan 500 bila Prisma gagal", async () => {
    supabase.signUp.mockResolvedValue({ data: { user: USER }, error: null });
    db.profile.upsert.mockRejectedValue(new Error("db down"));

    const res = await POST(req({ email: USER.email, password: "123456", nama: "Siswa" }));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/kesalahan internal/);
  });
});
