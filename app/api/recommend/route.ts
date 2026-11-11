import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { skorTerbaik, totalPercobaan } = await req.json();

    // Fallback aturan tetap jika skor kuis belum cukup
    const skor = Number(skorTerbaik ?? 0);
    const percobaan = Number(totalPercobaan ?? 0);

    if (skor >= 80 || percobaan >= 3) {
      return NextResponse.json({
        rekomendasi: "ujian",
        alasan:
          "Pemahaman materi dasar Anda sudah mantap. Guru Besar menanti di ruang ujian studi kasus!",
      });
    }

    return NextResponse.json({
      rekomendasi: "quest",
      alasan:
        "Sebaiknya perdalam pemahaman materi melalui latihan soal Quest sebelum menghadapi Guru Besar.",
    });
  } catch (err) {
    console.error("[recommend] Error:", err);
    return NextResponse.json(
      {
        rekomendasi: "quest",
        alasan: "Jalur default petualang.",
      },
      { status: 200 }
    );
  }
}
