import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { generateJSON } from "@/lib/gemini";
import { personalizationSchema, personalizationZ } from "@/lib/schemas";
import { DEFAULT_ROLE, toRoleEnum, ROLE_DISPLAY } from "@/lib/role";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const authData = await getCurrentProfile();
    if (!authData?.user || !authData.profile) {
      return NextResponse.json(
        { error: "Sesi login tidak valid. Silakan login terlebih dahulu." },
        { status: 401 }
      );
    }

    const { preferensiBelajar } = await req.json();

    const promptText = `Nama Petualang: ${authData.profile.nama}
Preferensi / Jawaban Belajar:
"${String(preferensiBelajar ?? "Saya ingin belajar dengan cara yang menantang dan mendalam.").slice(0, 500)}"

Tentukan 1 nama peran karakter belajar bergaya RPG yang paling cocok untuk siswa ini.
Contoh opsi peran:
- "Ksatria Nalar" (fokus pada aksi, latihan soal cepat, dan tantangan langsung)
- "Penyihir Teori" (fokus pada abstraksi konsep, pemahaman filosofis, dan pola)
- "Cendekia Analitik" (fokus pada logika runtut, data, dan pembuktian fakta)
- "Pengelana Konsep" (fokus pada eksplorasi mandiri dan rasa ingin tahu bebas)

Berikan alasan singkat dan panduan gaya bahasa untuk AI tutor (Guru Besar) saat berbicara dengannya.`;

    let assignedRole = DEFAULT_ROLE;
    let alasan = "Peran default statis.";
    let gayaBahasa = "Bahasa ramah, sopan, dan memotivasi.";

    try {
      // Panggil Gemini untuk menilai peran belajar
      const raw = await generateJSON({
        prompt: promptText,
        schema: personalizationSchema,
        system:
          "Kamu adalah penilai karakter RPG NalarQuest yang bijak. Nilai kepribadian belajar siswa secara akurat dan ringkas. Pilih peran HANYA dari opsi yang diberikan.",
      });

      const parsed = personalizationZ.safeParse(raw);
      if (parsed.success) {
        assignedRole = parsed.data.peran;
        alasan = parsed.data.alasan;
        gayaBahasa = parsed.data.gayaBahasa;
      }
    } catch (aiErr) {
      console.warn(
        "[personalize] AI evaluasi gagal, menggunakan nilai statis:",
        aiErr
      );
      // Fallback ke peran statis
      assignedRole = DEFAULT_ROLE;
    }

    // Update profile user di Prisma dengan peran dari enum statis
    const updatedProfile = await prisma.profile.update({
      where: { id: authData.user.id },
      data: {
        role: toRoleEnum(assignedRole),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Peran petualang berhasil dievaluasi dan diperbarui.",
      profile: {
        nama: updatedProfile.nama,
        role: ROLE_DISPLAY[updatedProfile.role],
      },
      evaluasiAI: {
        peran: assignedRole,
        alasan,
        gayaBahasa,
      },
    });
  } catch (err) {
    console.error("[api/auth/personalize] Error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan internal server." },
      { status: 500 }
    );
  }
}
