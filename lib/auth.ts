import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

/**
 * Mengambil data user Supabase Auth yang sedang aktif di session.
 */
export async function getSession() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

/**
 * Mengambil data user Supabase Auth beserta Profile & Role dari Prisma.
 */
export async function getCurrentProfile() {
  const user = await getSession();
  if (!user) {
    return null;
  }

  try {
    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      include: { role: true },
    });

    return { user, profile };
  } catch (err) {
    console.error("[auth] Gagal mengambil profile dari database:", err);
    return { user, profile: null };
  }
}

/**
 * Memastikan user sudah login. Jika belum, otomatis redirect ke /login.
 */
export async function requireAuth() {
  const data = await getCurrentProfile();
  if (!data?.user) {
    redirect("/login");
  }
  return data;
}
