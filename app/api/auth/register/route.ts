import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { email, password, nama } = await req.json();

    if (!email || !password || !nama) {
      return NextResponse.json(
        { error: "Nama, email, dan password wajib diisi." },
        { status: 400 }
      );
    }

    if (String(password).length < 6) {
      return NextResponse.json(
        { error: "Password minimal terdiri dari 6 karakter." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // 1. Daftarkan ke Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: String(email).trim(),
      password: String(password),
      options: {
        data: {
          nama: String(nama).trim(),
        },
      },
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: "Pendaftaran gagal diproses oleh sistem auth." },
        { status: 500 }
      );
    }

    // 3. Simpan data Profile pengguna di Prisma (role default dari enum)
    const profile = await prisma.profile.upsert({
      where: { id: authData.user.id },
      update: {
        nama: String(nama).trim()
      },
      create: {
        id: authData.user.id,
        nama: String(nama).trim()
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Akun berhasil didaftarkan dengan peran awal statis.",
        user: {
          id: authData.user.id,
          email: authData.user.email,
        },
        profile: {
          nama: profile.nama,
        }
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[api/auth/register] Error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan internal server." },
      { status: 500 }
    );
  }
}
