"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export type AuthActionResult = {
  error?: string;
  success?: boolean;
};

/**
 * Server Action untuk Login dengan Email & Password.
 */
export async function loginAction(
  _prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const email = formData.get("email")?.toString().trim();
  const password = formData.get("password")?.toString();

  if (!email || !password) {
    return { error: "Email dan password wajib diisi." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}

/**
 * Server Action untuk Registrasi Pengguna Baru & Pembuatan Profil Prisma.
 */
export async function registerAction(
  _prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const nama = formData.get("nama")?.toString().trim();
  const email = formData.get("email")?.toString().trim();
  const password = formData.get("password")?.toString();
  const roleInput = formData.get("role")?.toString().trim() || "siswa";

  if (!nama || !email || !password) {
    return { error: "Nama, email, dan password wajib diisi." };
  }

  if (password.length < 6) {
    return { error: "Password minimal terdiri dari 6 karakter." };
  }

  const supabase = await createClient();

  // 1. Daftarkan akun ke Supabase Auth
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        nama,
        role: roleInput,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  // 2. Sinkronisasi data ke tabel Profile di PostgreSQL via Prisma
  if (data.user) {
    try {
      // Pastikan master role tersedia di tabel roles
      const roleRecord = await prisma.role.upsert({
        where: { nama: roleInput },
        update: {},
        create: { nama: roleInput },
      });

      // Simpan profile user
      await prisma.profile.upsert({
        where: { id: data.user.id },
        update: {
          nama,
          roleId: roleRecord.id,
        },
        create: {
          id: data.user.id,
          nama,
          roleId: roleRecord.id,
        },
      });
    } catch (dbErr) {
      console.error("[registerAction] Peringatan: Profil Prisma gagal disinkronkan:", dbErr);
      // User di Supabase Auth tetap berhasil dibuat
    }
  }

  redirect("/dashboard");
}

/**
 * Server Action untuk Logout.
 */
export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
