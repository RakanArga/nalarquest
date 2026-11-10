import { NextResponse } from "next/server";
import { generateJSON } from "@/lib/gemini";
import { questionSchema, questionZ } from "@/lib/schemas";
import { getSource } from "@/lib/source";

// Samakan huruf, spasi, tanda kutip, dan tanda hubung sebelum membandingkan
const norm = (s: string) =>
  s
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();

export async function POST(req: Request) {
  try {
    const { subjek, materi } = await req.json();
    const source = await getSource(String(subjek), String(materi));

    const prompt = `Buat 1 soal pilihan ganda dengan tepat 4 opsi dalam bahasa Indonesia,
HANYA berdasarkan teks berikut. Jangan memakai pengetahuan di luar teks.

Aturan:
- Hanya satu opsi yang benar, tiga lainnya masuk akal tetapi salah.
- indeksBenar adalah posisi opsi yang benar (0 sampai 3).
- kutipanBukti harus disalin PERSIS dari teks asli (satu atau dua kalimat),
  tanpa diterjemahkan dan tanpa diubah, sebagai bukti jawaban benar.
- penjelasan ditulis singkat dalam bahasa Indonesia.

TEKS:
${source}`;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const raw = await generateJSON({
          prompt,
          schema: questionSchema,
          system:
            "Kamu pembuat soal yang akurat dan tidak keluar dari teks sumber.",
        });

        const parsed = questionZ.safeParse(raw);
        if (!parsed.success) {
          console.error(`[question] percobaan ${attempt + 1}: format salah`, parsed.error.issues);
          continue;
        }

        if (!norm(source).includes(norm(parsed.data.kutipanBukti))) {
          console.error(
            `[question] percobaan ${attempt + 1}: kutipan tidak ada di sumber:`,
            parsed.data.kutipanBukti
          );
          continue;
        }

        return NextResponse.json(parsed.data);
      } catch (err) {
        console.error(`[question] percobaan ${attempt + 1}: error API`, err);
      }
    }

    return NextResponse.json(
      { error: "Soal gagal dibuat, coba lagi." },
      { status: 502 }
    );
  } catch (err) {
    console.error("[question] error umum", err);
    return NextResponse.json({ error: "Terjadi kesalahan." }, { status: 500 });
  }
}