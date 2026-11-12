import { beforeEach, describe, expect, it, vi } from "vitest";

const ai = vi.hoisted(() => ({ generateJSON: vi.fn() }));
const src = vi.hoisted(() => ({ getSource: vi.fn() }));

vi.mock("@/lib/gemini", () => ({ generateJSON: ai.generateJSON }));
vi.mock("@/lib/source", () => ({ getSource: src.getSource }));

import { POST } from "@/app/api/chat/route";

function req(body: unknown) {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

function riwayat(pertanyaanSiswa: number) {
  const items: { role: string; text: string }[] = [];
  for (let i = 0; i < pertanyaanSiswa; i++) {
    items.push({ role: "model", text: `pertanyaan ${i}` }, { role: "user", text: `jawaban ${i}` });
  }
  return items;
}

beforeEach(() => {
  vi.clearAllMocks();
  src.getSource.mockResolvedValue("Materi uji studi kasus.");
});

describe("POST /api/chat (ujian Guru Besar)", () => {
  it("menolak riwayat yang bukan array", async () => {
    const res = await POST(req({ riwayat: "bukan array" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Riwayat tidak valid/);
  });

  it("menolak riwayat melebihi batas maksimum", async () => {
    const res = await POST(req({ riwayat: riwayat(10) }));
    expect(res.status).toBe(400);
  });

  it("selama ujian berjalan, lulus dipaksa false walaupun AI mengaku lulus", async () => {
    ai.generateJSON.mockResolvedValue({ balasan: "Menarik! Jelaskan lagi.", selesai: false, lulus: true });

    const res = await POST(req({ riwayat: [{ role: "user", text: "Mulai ujian." }] }));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.selesai).toBe(false);
    expect(body.lulus).toBe(false);
  });

  it("di giliran terakhir, selesai dipaksa true bila AI enggan menutup ujian", async () => {
    ai.generateJSON.mockResolvedValue({ balasan: "Baik, penilaian akhir.", selesai: false, lulus: false });

    const res = await POST(req({ riwayat: riwayat(6), nama: "Siswa", peran: "Ksatria Nalar" }));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.selesai).toBe(true);
    expect(body.lulus).toBe(false);
  });

  it("hasil jujur dipertahankan bila AI menutup ujian dengan benar", async () => {
    ai.generateJSON.mockResolvedValue({ balasan: "Ujian selesai.", selesai: true, lulus: true });

    const res = await POST(req({ riwayat: riwayat(3) }));
    const body = await res.json();
    expect(body.selesai).toBe(true);
    expect(body.lulus).toBe(true);
  });

  it("502 bila Gemini gagal dua kali berturut-turut", async () => {
    ai.generateJSON.mockRejectedValue(new Error("network down"));

    const res = await POST(req({ riwayat: [] }));
    expect(res.status).toBe(502);
    expect(ai.generateJSON).toHaveBeenCalledTimes(2);
    expect((await res.json()).error).toMatch(/sibuk/);
  });

  it("memakai model smart untuk ujian", async () => {
    ai.generateJSON.mockResolvedValue({ balasan: "ok", selesai: false, lulus: false });

    await POST(req({ riwayat: [{ role: "user", text: "Mulai." }] }));
    expect(ai.generateJSON).toHaveBeenCalledWith(expect.objectContaining({ smart: true }));
  });

  it("500 bila sumber materi gagal dibaca", async () => {
    src.getSource.mockRejectedValue(new Error("bad input"));

    const res = await POST(req({ riwayat: [] }));
    expect(res.status).toBe(500);
  });
});
