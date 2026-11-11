import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email dan password wajib diisi." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Verifikasi kredensial via Supabase Auth
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email: String(email).trim(),
        password: String(password),
      });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || "Email atau password salah." },
        { status: 401 }
      );
    }

    // Ambil data profil & peran dari database Prisma
    const profile = await prisma.profile.findUnique({
      where: { id: authData.user.id },
      include: { role: true },
    });

    return NextResponse.json({
      success: true,
      message: "Login berhasil.",
      user: {
        id: authData.user.id,
        email: authData.user.email,
      },
      profile: profile
        ? {
            nama: profile.nama,
            role: profile.role?.nama ?? "siswa",
          }
        : null,
    });
  } catch (err) {
    console.error("[api/auth/login] Error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan internal server." },
      { status: 500 }
    );
  }
}
