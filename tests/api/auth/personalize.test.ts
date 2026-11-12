import { beforeEach, describe, expect, it, vi } from "vitest";

const supabase = vi.hoisted(() => ({ getUser: vi.fn() }));
const db = vi.hoisted(() => ({
  profile: { findUnique: vi.fn(), upsert: vi.fn(), update: vi.fn() },
}));
const ai = vi.hoisted(() => ({ generateJSON: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: supabase.getUser } }),
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));
vi.mock("@/lib/gemini", () => ({ generateJSON: ai.generateJSON }));

import { POST } from "@/app/api/auth/personalize/route";

function req(body: unknown) {
  return new Request("http://localhost/api/auth/personalize", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

const USER = { id: "uuid-1", email: "siswa@example.com" };

beforeEach(() => {
  vi.clearAllMocks();
  supabase.getUser.mockResolvedValue({ data: { user: USER }, error: null });
  db.profile.findUnique.mockResolvedValue({ id: USER.id, nama: "Siswa", role: "Ksatria_Nalar" });
});

describe("POST /api/auth/personalize", () => {
  it("mengembalikan 401 bila tidak ada sesi", async () => {
    supabase.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const res = await POST(req({ preferensiBelajar: "suka latihan cepat" }));
    expect(res.status).toBe(401);
  });

  it("menyimpan peran hasil AI langsung ke kolom enum tanpa upsert role", async () => {
    ai.generateJSON.mockResolvedValue({
      peran: "Penyihir Teori",
      alasan: "Siswa menyukai abstraksi konsep.",
      gayaBahasa: "Tenang dan filosofis.",
    });
    db.profile.update.mockResolvedValue({ id: USER.id, nama: "Siswa", role: "Penyihir_Teori" });

    const res = await POST(req({ preferensiBelajar: "suka konsep abstrak" }));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.profile.role).toBe("Penyihir Teori");
    expect(body.evaluasiAI.peran).toBe("Penyihir Teori");

    // Peran ditulis ke kolom enum profile, bukan dibuat sebagai baris baru
    expect(db.profile.update).toHaveBeenCalledWith({
      where: { id: USER.id },
      data: { role: "Penyihir_Teori" },
    });
    expect(db.profile.upsert).not.toHaveBeenCalled();
    expect(Object.keys(db)).not.toContain("role");
  });

  it("fallback ke peran default bila AI mengembalikan teks di luar enum", async () => {
    ai.generateJSON.mockResolvedValue({
      peran: "Guru Agung Sepanjang Masa",
      alasan: "Siswa sangat pintar sekali.",
      gayaBahasa: "Megah dan penuh hormat.",
    });
    db.profile.update.mockResolvedValue({ id: USER.id, nama: "Siswa", role: "Ksatria_Nalar" });

    const res = await POST(req({ preferensiBelajar: "apa saja" }));
    expect(res.status).toBe(200);
    expect(db.profile.update).toHaveBeenCalledWith({
      where: { id: USER.id },
      data: { role: "Ksatria_Nalar" },
    });
  });

  it("fallback ke peran default bila AI gagal / kuota habis", async () => {
    ai.generateJSON.mockRejectedValue(new Error("quota exceeded"));
    db.profile.update.mockResolvedValue({ id: USER.id, nama: "Siswa", role: "Ksatria_Nalar" });

    const res = await POST(req({ preferensiBelajar: "apa saja" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.evaluasiAI.peran).toBe("Ksatria Nalar");
    expect(body.evaluasiAI.alasan).toMatch(/default/i);
    expect(db.profile.update).toHaveBeenCalledWith({
      where: { id: USER.id },
      data: { role: "Ksatria_Nalar" },
    });
  });

  it("mengembalikan 500 bila pembaruan profile gagal", async () => {
    ai.generateJSON.mockResolvedValue({
      peran: "Ksatria Nalar",
      alasan: "Siswa suka tantangan langsung.",
      gayaBahasa: "Tegas dan memantik.",
    });
    db.profile.update.mockRejectedValue(new Error("db down"));

    const res = await POST(req({ preferensiBelajar: "apa saja" }));
    expect(res.status).toBe(500);
  });
});
