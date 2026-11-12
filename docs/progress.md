# Progress Implementasi — NalarQuest

Ringkasan pekerjaan yang sudah selesai per 12 November 2026. Semua status di bawah sudah diverifikasi dengan `npm run build`, `npm run lint`, dan `npm test` (74/74 hijau).

## 1. Sistem peran RPG statis (FR-02)

Sesuai AGENTS.md §7.4 — peran tidak lagi disimpan di tabel `roles`, sehingga **tidak perlu upsert/seed role sama sekali**.

| Berkas | Peran |
|---|---|
| `lib/role.ts` | Sumber kebenaran tunggal: `ROLES` (4 peran), `DEFAULT_ROLE` (`Ksatria Nalar`), `toRoleEnum()` (nama tampilan → enum Prisma, fallback default untuk teks tak dikenal) |
| `prisma/schema.prisma` | Enum `roleNama` (`Ksatria_Nalar`, `Penyihir_Teori`, `Cendekia_Analitik`, `Pengelana_Konsep`) langsung di kolom `Profile.role` dengan default `Ksatria_Nalar`; tabel `roles` dan FK `role_id` dihapus |
| `lib/schemas.ts` | AI dibatasi dari dua sisi: skema Gemini `enum: [...ROLES]` + validasi Zod `z.enum(ROLES)`. Output AI di luar 4 peran **tidak mungkin tersimpan** |

Perilaku: registrasi otomatis dapat peran default dari kolom enum; `/api/auth/personalize` cukup satu `profile.update` — tidak ada pembuatan peran dari teks AI, tidak ada race FK, tidak ada seed.

## 2. Perbaikan registrasi & auth

| Berkas | Perbaikan |
|---|---|
| `app/api/auth/register/route.ts` | `create` profile tanpa `roleId`; dibersihkan dari sisa `include: { role }` yang membuat error |
| `app/api/auth/login/route.ts` | `role` dibaca langsung dari kolom enum profile |
| `app/api/auth/me/route.ts` | idem; degradasi halus: DB gagal → 200 dengan `profile: null` |
| `app/api/auth/logout/route.ts` | sudah aman, kini di-cover test |
| `lib/auth.ts` | `getCurrentProfile` tidak lagi include relasi `role`; error DB ditangkap → `{ user, profile: null }` |
| `app/api/auth/personalize/route.ts` | mengganti `prisma.role.upsert` dengan `profile.update({ role: toRoleEnum(...) })`; fallback default bila AI gagal/keluar enum |
| `app/auth/actions.ts` | impor yang rusak (`DEFAULT_STATIC_ROLE` dari route register) diganti `DEFAULT_ROLE` dari `lib/role.ts`; dua `prisma.role.upsert` dihapus |

## 3. Perbaikan build (Next.js 16 cacheComponents)

- `app/page.tsx`: cek sesi (`cookies()`) dipindah ke komponen `<Suspense>` (`SessionRedirect`) — landing page bisa di-prerender.
- `app/api/chat/route.ts:20`: `any` pada mapping riwayat diganti tipe eksplisit.

Verifikasi: `npm run build` ✅, `npm run lint` ✅, `npx prisma generate` ✅.

## 4. Test suite backend (74 test, 12 berkas)

Framework **Vitest**, konfigurasi `vitest.config.ts` (alias `@` → root). Semua dependensi luar (Supabase, Prisma, Gemini, filesystem) di-mock — cepat, offline, hemat kuota. Perintah: `npm test` / `npm run test:watch`.

```
tests/unit/schemas.test.ts     # validasi Zod + skema Gemini (tolak opsi≠4, indeks 0-3, enum peran)
tests/unit/role.test.ts        # 4 peran statis, toRoleEnum + fallback default
tests/unit/source.test.ts      # slug valid/invalid (anti path traversal) + baca file sumber
tests/lib/auth.test.ts         # getSession & getCurrentProfile (termasuk DB gagal)
tests/api/auth/*.test.ts       # register, login, logout, me, personalize (happy path + semua error)
tests/api/question.test.ts     # grounding kutipan + retry 1x lalu 502 + pemulihan di percobaan ke-2
tests/api/chat.test.ts         # lulus dipaksa false, selesai dipaksa true di giliran 6, model smart, 502
tests/api/recommend.test.ts    # aturan skor/percobaan + fallback quest yang tidak pernah 500
```

Detail strategi mock dan matriks cakupan per endpoint: lihat [testing.md](./testing.md).

## 5. Dokumentasi

- `docs/README.md` — indeks folder docs
- `docs/testing.md` — panduan test lengkap
- `docs/progress.md` — dokumen ini

## 6. Yang masih harus dilakukan (jangan sampai terlewat)

1. **Migrasi database belum dijalankan.** Database masih punya tabel `roles` dan kolom `profiles.role_id NOT NULL` → registrasi akan tetap gagal di runtime. Jalankan dengan env `DATABASE_URL` + `DIRECT_URL` terisi:
   ```bash
   npx prisma migrate dev --name drop_roles_use_enum
   ```
2. **`/api/question` masih mengirim `indeksBenar` segera** — melanggar FR-06. Perlu step `POST /api/question/answer` + kolom `opsi`/`indeks_benar` (gap #1 AGENTS.md §9).
3. **`/api/chat` membaca `nama`/`peran` dari body**, bukan dari sesi (`getCurrentProfile`).
4. **`/api/recommend` membaca performa dari body**, bukan dari database.
5. Tabel `exam_messages`, indeks tambahan, dan RLS (gap §9 AGENTS.md) belum dikerjakan.
6. Rate limiting + `/api/recommend` berbasis DB (rencana hari 5).

Status FR yang sudah aman: FR-01 (sebagian — profil ada, callback verifikasi email belum membuat profil), FR-02, FR-05, FR-07 (sebagian — belum ambil konteks dari sesi), FR-10/FR-11 (belum).
