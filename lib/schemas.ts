import { Type } from "@google/genai";
import { z } from "zod";

// --- SKEMA KUIS / SOAL ---
export const questionSchema = {
  type: Type.OBJECT,
  properties: {
    pertanyaan: { type: Type.STRING },
    opsi: { type: Type.ARRAY, items: { type: Type.STRING } },
    indeksBenar: { type: Type.INTEGER },
    penjelasan: { type: Type.STRING },
    kutipanBukti: { type: Type.STRING },
  },
  required: ["pertanyaan", "opsi", "indeksBenar", "penjelasan", "kutipanBukti"],
};

export const questionZ = z.object({
  pertanyaan: z.string().min(10).max(400),
  opsi: z.array(z.string()).length(4),
  indeksBenar: z.number().int().min(0).max(3),
  penjelasan: z.string().min(5),
  kutipanBukti: z.string().min(5),
});

// --- SKEMA CHAT GURU BESAR ---
export const chatSchema = {
  type: Type.OBJECT,
  properties: {
    balasan: { type: Type.STRING },
    selesai: { type: Type.BOOLEAN },
    lulus: { type: Type.BOOLEAN },
  },
  required: ["balasan", "selesai", "lulus"],
};

export const chatZ = z.object({
  balasan: z.string().min(1).max(1500),
  selesai: z.boolean(),
  lulus: z.boolean(),
});

// --- SKEMA PERSONALISASI PERAN OLEH AI ---
export const personalizationSchema = {
  type: Type.OBJECT,
  properties: {
    peran: { type: Type.STRING },
    alasan: { type: Type.STRING },
    gayaBahasa: { type: Type.STRING },
  },
  required: ["peran", "alasan", "gayaBahasa"],
};

export const personalizationZ = z.object({
  peran: z.string().min(3).max(50),
  alasan: z.string().min(5).max(500),
  gayaBahasa: z.string().min(5).max(300),
});
