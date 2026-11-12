import { beforeEach, describe, expect, it, vi } from "vitest";

const ai = vi.hoisted(() => ({ generateJSON: vi.fn() }));
const src = vi.hoisted(() => ({ getSource: vi.fn() }));

vi.mock("@/lib/gemini", () => ({ generateJSON: ai.generateJSON }));
vi.mock("@/lib/source", () => ({ getSource: src.getSource }));

import { POST } from "@/app/api/question/route";

function req(body: unknown) {
  return new Request("http://localhost/api/question", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

const SUMBER = "Kucing adalah hewan menyusui yang hidup di darat. Kucing suka tidur di siang hari.";

const SOAL_VALID = {
  pertanyaan: "Di mana kucing hidup?",
  opsi: ["Darat", "Laut", "Udara", "Bawah tanah"],
  indeksBenar: 0,
  penjelasan: "Teks menyebut kucing hidup di darat.",
  kutipanBukti: "Kucing adalah hewan menyusui yang hidup di darat.",
};

beforeEach(() => {
  vi.clearAllMocks();
  src.getSource.mockResolvedValue(SUMBER);
});

describe("POST /api/question", () => {
  it("mengembalikan soal valid yang kutipannya ada di sumber", async () => {
    ai.generateJSON.mockResolvedValue(SOAL_VALID);

    const res = await POST(req({ subjek: "unit", materi: "test" }));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.pertanyaan).toBe(SOAL_VALID.pertanyaan);
    expect(body.opsi).toHaveLength(4);
    expect(body.indeksBenar).toBe(0);
    expect(body.kutipanBukti).toBe(SOAL_VALID.kutipanBukti);
  });

  it("memvalidasi kutipan terhadap sumber secara tidak peka kapital/spasi", async () => {
    ai.generateJSON.mockResolvedValue({
      ...SOAL_VALID,
      kutipanBukti: "kucing suka tidur di siang hari",
    });

    const res = await POST(req({ subjek: "unit", materi: "test" }));
    expect(res.status).toBe(200);
    expect(ai.generateJSON).toHaveBeenCalledTimes(1);
  });

  it("menerima kutipan yang melewati batas kalimat setelah normalisasi tanda baca", async () => {
    ai.generateJSON.mockResolvedValue({
      ...SOAL_VALID,
      kutipanBukti: "Kucing adalah hewan menyusui yang hidup di darat. Kucing suka tidur di siang hari.",
    });

    const res = await POST(req({ subjek: "unit", materi: "test" }));
    expect(res.status).toBe(200);
  });

  it("menolak kutipan yang tidak ada di sumber, lalu 502 setelah 1 percobaan ulang", async () => {
    ai.generateJSON.mockResolvedValue({
      ...SOAL_VALID,
      kutipanBukti: "Kalimat ini tidak pernah ada di dalam teks sumber sama sekali.",
    });

    const res = await POST(req({ subjek: "unit", materi: "test" }));
    expect(res.status).toBe(502);
    expect(ai.generateJSON).toHaveBeenCalledTimes(2);
    expect((await res.json()).error).toMatch(/coba lagi/);
  });

  it("menolak output AI yang gagal validasi Zod, lalu 502 setelah 1 percobaan ulang", async () => {
    ai.generateJSON.mockResolvedValue({ ...SOAL_VALID, opsi: ["hanya", "tiga", "opsi"] });

    const res = await POST(req({ subjek: "unit", materi: "test" }));
    expect(res.status).toBe(502);
    expect(ai.generateJSON).toHaveBeenCalledTimes(2);
  });

  it("502 bila panggilan Gemini gagal dua kali (kuota/jaringan)", async () => {
    ai.generateJSON.mockRejectedValue(new Error("quota exceeded"));

    const res = await POST(req({ subjek: "unit", materi: "test" }));
    expect(res.status).toBe(502);
    expect(ai.generateJSON).toHaveBeenCalledTimes(2);
  });

  it("berhasil di percobaan kedua setelah satu output buruk", async () => {
    ai.generateJSON
      .mockResolvedValueOnce({ pertanyaan: "pendek", opsi: [], indeksBenar: 9, penjelasan: "", kutipanBukti: "" })
      .mockResolvedValueOnce(SOAL_VALID);

    const res = await POST(req({ subjek: "unit", materi: "test" }));
    expect(res.status).toBe(200);
    expect(ai.generateJSON).toHaveBeenCalledTimes(2);
  });

  it("500 bila slug sumber tidak valid", async () => {
    src.getSource.mockRejectedValue(new Error("bad input"));

    const res = await POST(req({ subjek: "../hack", materi: "test" }));
    expect(res.status).toBe(500);
  });
});
