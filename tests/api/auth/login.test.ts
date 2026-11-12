import { beforeEach, describe, expect, it, vi } from "vitest";

const supabase = vi.hoisted(() => ({ signIn: vi.fn() }));
const db = vi.hoisted(() => ({ profile: { findUnique: vi.fn() } }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { signInWithPassword: supabase.signIn } }),
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

import { POST } from "@/app/api/auth/login/route";

function req(body: unknown) {
  return new Request("http://localhost/api/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

const USER = { id: "uuid-1", email: "siswa@example.com" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/auth/login", () => {
  it("menolak field wajib yang hilang", async () => {
    const res = await POST(req({ email: "a@b.co" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/wajib diisi/);
  });

  it("mengembalikan 401 bila kredensial salah", async () => {
    supabase.signIn.mockResolvedValue({ data: {}, error: { message: "Invalid login credentials" } });
    const res = await POST(req({ email: "a@b.co", password: "salah" }));
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("Invalid login credentials");
  });

  it("sukses: mengembalikan nama dan peran dari enum profile", async () => {
    supabase.signIn.mockResolvedValue({ data: { user: USER }, error: null });
    db.profile.findUnique.mockResolvedValue({ id: USER.id, nama: "Siswa", role: "Penyihir_Teori" });

    const res = await POST(req({ email: USER.email, password: "123456" }));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.profile.nama).toBe("Siswa");
    expect(body.profile.role).toBe("Penyihir_Teori");
  });

  it("sukses: profile null tetap dikembalikan apa adanya", async () => {
    supabase.signIn.mockResolvedValue({ data: { user: USER }, error: null });
    db.profile.findUnique.mockResolvedValue(null);

    const res = await POST(req({ email: USER.email, password: "123456" }));
    expect(res.status).toBe(200);
    expect((await res.json()).profile).toBeNull();
  });

  it("mengembalikan 500 bila Prisma gagal", async () => {
    supabase.signIn.mockResolvedValue({ data: { user: USER }, error: null });
    db.profile.findUnique.mockRejectedValue(new Error("db down"));

    const res = await POST(req({ email: USER.email, password: "123456" }));
    expect(res.status).toBe(500);
  });
});
