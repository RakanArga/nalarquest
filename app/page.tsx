import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function Home() {
  const user = await getSession();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-6 py-12 text-zinc-100">
      <div className="max-w-2xl text-center space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-sm font-medium text-amber-300">
          ✨ Platform Belajar Berbasis Teks RPG & AI
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white">
          Nalar<span className="text-amber-400">Quest</span>
        </h1>

        <p className="text-lg text-zinc-400 max-w-xl mx-auto leading-relaxed">
          Taklukkan materi pelajaran melalui kuis berbasis grounded AI dan hadapi ujian studi kasus bersama Guru Besar.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            href="/register"
            className="w-full sm:w-auto rounded-xl bg-amber-400 px-6 py-3 text-sm font-bold text-zinc-950 shadow-lg hover:bg-amber-300 transition-all"
          >
            Daftar Karakter Baru 🚀
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto rounded-xl border border-zinc-700 bg-zinc-800/80 px-6 py-3 text-sm font-semibold text-zinc-200 hover:bg-zinc-700 hover:text-white transition-all"
          >
            Sudah Punya Akun (Masuk)
          </Link>
        </div>
      </div>
    </div>
  );
}
