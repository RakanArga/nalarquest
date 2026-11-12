"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { generateJSON } from "@/lib/gemini";
import { personalizationSchema, personalizationZ } from "@/lib/schemas";
import { DEFAULT_ROLE, toRoleEnum, ROLE_DISPLAY } from "@/lib/role";

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
 * Server Action untuk Registrasi Pengguna Baru.
 * Role TIDAK dipilih oleh pengguna di form, melainkan otomatis menggunakan
 * nilai default dari enum statis, yang nantinya dapat dinilai ulang oleh AI.
 */
export async function registerAction(
  _prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const nama = formData.get("nama")?.toString().trim();
  const email = formData.get("email")?.toString().trim();
  const password = formData.get("password")?.toString();

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
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  // 2. Sinkronisasi data ke tabel Profile di PostgreSQL via Prisma
  if (data.user) {
    try {
      await prisma.profile.upsert({
        where: { id: data.user.id },
        update: {
          nama,
        },
        create: {
          id: data.user.id,
          nama,
        },
      });
    } catch (dbErr) {
      console.error("[registerAction] Peringatan: Profil Prisma gagal disinkronkan:", dbErr);
    }
  }

  redirect("/dashboard");
}

/**
 * Server Action untuk menilai dan memperbarui Peran pengguna dengan AI.
 */
export async function personalizeRoleAction(preferensiBelajar: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  let assignedRole = DEFAULT_ROLE;
  try {
    const raw = await generateJSON({
      prompt: `Tentukan peran RPG belajar yang cocok untuk siswa ini berdasarkan preferensi: "${preferensiBelajar}". Pilih peran HANYA dari opsi: Ksatria Nalar, Penyihir Teori, Cendekia Analitik, Pengelana Konsep.`,
      schema: personalizationSchema,
      system: "Kamu penilai karakter belajar RPG yang ringkas. Pilih peran HANYA dari opsi yang diberikan.",
    });

    const parsed = personalizationZ.safeParse(raw);
    if (parsed.success) {
      assignedRole = parsed.data.peran;
    }
  } catch (err) {
    console.warn("[personalizeRoleAction] Menggunakan fallback statis:", err);
  }

  await prisma.profile.update({
    where: { id: user.id },
    data: { role: toRoleEnum(assignedRole) },
  });

  return { success: true, role: ROLE_DISPLAY[toRoleEnum(assignedRole)] };
}

/**
 * Server Action untuk Logout.
 */
export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
