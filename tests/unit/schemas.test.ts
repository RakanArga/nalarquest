import { describe, expect, it } from "vitest";
import { chatZ, personalizationZ, personalizationSchema, questionZ } from "@/lib/schemas";

describe("questionZ (skema soal pilihan ganda)", () => {
  const valid = {
    pertanyaan: "Apa fungsi utama dari RAM dalam komputer?",
    opsi: ["Menyimpan data sementara", "Memproses grafis", "Menyimpan OS permanen", "Menghubungkan internet"],
    indeksBenar: 0,
    penjelasan: "RAM menyimpan data sementara saat program berjalan.",
    kutipanBukti: "RAM menyimpan data sementara saat program berjalan.",
  };

  it("menerima soal valid", () => {
    expect(questionZ.safeParse(valid).success).toBe(true);
  });

  it("menolak jika opsi bukan tepat 4", () => {
    expect(questionZ.safeParse({ ...valid, opsi: valid.opsi.slice(0, 3) }).success).toBe(false);
    expect(questionZ.safeParse({ ...valid, opsi: [...valid.opsi, "tambahan"] }).success).toBe(false);
  });

  it("menolak indeksBenar di luar 0-3", () => {
    expect(questionZ.safeParse({ ...valid, indeksBenar: 4 }).success).toBe(false);
    expect(questionZ.safeParse({ ...valid, indeksBenar: -1 }).success).toBe(false);
    expect(questionZ.safeParse({ ...valid, indeksBenar: 1.5 }).success).toBe(false);
  });

  it("menolak pertanyaan terlalu pendek atau terlalu panjang", () => {
    expect(questionZ.safeParse({ ...valid, pertanyaan: "pendek" }).success).toBe(false);
    expect(questionZ.safeParse({ ...valid, pertanyaan: "a".repeat(401) }).success).toBe(false);
  });

  it("menolak field wajib yang hilang", () => {
    const tanpaKutipan = { ...valid } as Record<string, unknown>;
    delete tanpaKutipan.kutipanBukti;
    expect(questionZ.safeParse(tanpaKutipan).success).toBe(false);
  });
});

describe("chatZ (skema ujian Guru Besar)", () => {
  const valid = { balasan: "Baik, jelaskan alasanmu.", selesai: false, lulus: false };

  it("menerima output valid", () => {
    expect(chatZ.safeParse(valid).success).toBe(true);
  });

  it("menolak balasan kosong", () => {
    expect(chatZ.safeParse({ ...valid, balasan: "" }).success).toBe(false);
  });

  it("menolak selesai/lulus yang bukan boolean", () => {
    expect(chatZ.safeParse({ ...valid, selesai: "false" }).success).toBe(false);
    expect(chatZ.safeParse({ ...valid, lulus: null }).success).toBe(false);
  });

  it("menolak jika field wajib hilang", () => {
    expect(chatZ.safeParse({ balasan: "isi", selesai: true }).success).toBe(false);
  });
});

describe("personalizationZ (skema peran RPG dari AI)", () => {
  it("menerima peran yang valid dari 4 opsi statis", () => {
    for (const peran of ["Ksatria Nalar", "Penyihir Teori", "Cendekia Analitik", "Pengelana Konsep"]) {
      expect(
        personalizationZ.safeParse({ peran, alasan: "Cocok dengan gaya belajar siswa.", gayaBahasa: "Ramah dan memotivasi." }).success
      ).toBe(true);
    }
  });

  it("menolak peran di luar enum (AI tidak bisa membuat peran baru)", () => {
    expect(
      personalizationZ.safeParse({ peran: "siswa", alasan: "Cocok dengan gaya belajar siswa.", gayaBahasa: "Ramah dan memotivasi." }).success
    ).toBe(false);
    expect(
      personalizationZ.safeParse({ peran: "Ksatria Nalar Kecil", alasan: "Cocok dengan gaya belajar siswa.", gayaBahasa: "Ramah dan memotivasi." }).success
    ).toBe(false);
  });

  it("menolak alasan atau gayaBahasa terlalu pendek", () => {
    expect(
      personalizationZ.safeParse({ peran: "Ksatria Nalar", alasan: "ok", gayaBahasa: "Ramah dan memotivasi." }).success
    ).toBe(false);
  });
});

describe("personalizationSchema (skema Gemini)", () => {
  it("membatasi peran ke enum 4 peran statis", () => {
    expect(personalizationSchema.properties.peran.enum).toEqual([
      "Ksatria Nalar",
      "Penyihir Teori",
      "Cendekia Analitik",
      "Pengelana Konsep",
    ]);
  });

  it("mewajibkan semua field", () => {
    expect(personalizationSchema.required).toEqual(["peran", "alasan", "gayaBahasa"]);
  });
});
