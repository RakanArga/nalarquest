import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";

export async function GET() {
  try {
    const data = await getCurrentProfile();

    if (!data?.user) {
      return NextResponse.json(
        {
          authenticated: false,
          user: null,
          profile: null,
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: data.user.id,
        email: data.user.email,
      },
      profile: data.profile
        ? {
            id: data.profile.id,
            nama: data.profile.nama,
            role: data.profile.role?.nama ?? "siswa",
            createdAt: data.profile.createdAt,
          }
        : null,
    });
  } catch (err) {
    console.error("[api/auth/me] Error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan internal server." },
      { status: 500 }
    );
  }
}
