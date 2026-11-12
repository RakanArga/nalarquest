# Testing — NalarQuest Backend

Dokumentasi lengkap test suite backend. Jalankan dengan:

```bash
npm test          # jalankan semua test sekali
npm test -- tests/api/question.test.ts   # jalankan satu file
npm run test:watch       # mode watch saat development
```

Framework: **Vitest** (`vitest.config.ts`, alias `@` → root proyek, environment `node`). Tidak ada test yang memanggil Gemini, Supabase, atau PostgreSQL sungguhan — semuanya di-mock, jadi test cepat (< 2 detik), gratis kuota, dan bisa jalan offline.

## Struktur

```
tests/
  unit/                       # test modul murni (tanpa Next.js)
    schemas.test.ts           #   validasi Zod + skema Gemini (lib/schemas.ts)
    role.test.ts              #   peran RPG statis + mapping enum (lib/role.ts)
    source.test.ts            #   validasi slug + baca file sumber (lib/source.ts)
  lib/
    auth.test.ts              # getSession & getCurrentProfile (lib/auth.ts)
  api/                        # test Route Handlers per endpoint
    auth/
      register.test.ts
      login.test.ts
      logout.test.ts
      me.test.ts
      personalize.test.ts
    question.test.ts
    chat.test.ts
    recommend.test.ts
```

Total: **12 file, 74 test, semuanya hijau.**

## Strategi mock

Setiap file test API me-mock dependensi luar di level modul (`vi.hoisted` + `vi.mock`), sehingga kode route dijalankan apa adanya:

| Modul | Mock | Catatan |
|---|---|---|
| `@/lib/supabase/server` | `auth.signUp`, `signInWithPassword`, `signOut`, `getUser` | ganti hasil per test untuk simulasi sesi valid/gagal |
| `@/lib/prisma` | `profile.upsert/findUnique/update` | test juga memastikan TIDAK ada akses ke `prisma.role` (tabel sudah dihapus) |
| `@/lib/gemini` | `generateJSON` | simulasi output valid, output invalid, dan error kuota/jaringan |
| `@/lib/source` | `getSource` | hanya di test `question` & `chat`; `unit/source.test.ts` test modul aslinya dengan file fixture sementara |

## Matriks cakupan

### Unit — `lib/`

| Yang diuji | Kenapa penting |
|---|---|
| `questionZ` / `chatZ` / `personalizationZ` | Semua output AI **wajib** lolos Zod di server sebelum dipakai (aturan AGENTS.md §12). Test menolak opsi ≠ 4, `indeksBenar` di luar 0–3, tipe salah, field hilang. |
| `personalizationZ` enum + skema Gemini `enum` | AI **tidak bisa** mengarang peran baru; hanya 4 peran statis yang lolos (FR-02, AGENTS.md §7.4). |
| `toRoleEnum` | Mapping nama tampilan → enum Prisma; input tak dikenal **fallback** ke `Ksatria_Nalar` (peran default), tidak pernah error. |
| `getSource` | Menolak slug berbahaya (`../`, spasi, huruf besar, `$`) → mencegah path traversal (aturan "never accept a slug without validating"). |

### API — auth

| Endpoint | Kasus yang diuji |
|---|---|
| `POST /api/auth/register` | field hilang 400; password < 6 400; error Supabase diteruskan 400; sukses 201 + `prisma.profile.upsert` dipanggil **tanpa `roleId`**; Prisma gagal → 500 |
| `POST /api/auth/login` | field hilang 400; kredensial salah 401; sukses mengembalikan `role` dari enum profile; profile belum dibuat → `profile: null`; DB gagal 500 |
| `POST /api/auth/logout` | sukses 200; signOut error 500; exception jaringan → 500 (tidak crash) |
| `GET /api/auth/me` | tanpa sesi → 401 `authenticated: false`; sesi valid → user + profile + role; DB gagal → **200 dengan `profile: null`** (degradasi halus dari `getCurrentProfile`) |
| `POST /api/auth/personalize` | tanpa sesi 401; peran AI valid ditulis **langsung ke kolom enum** (`profile.update`, tanpa upsert/tabel role); AI keluar enum → fallback default; AI gagal (kuota) → fallback default tetap 200; update gagal → 500 |

### API — konten & ujian

| Endpoint | Kasus yang diuji |
|---|---|
| `POST /api/question` | soal valid 200; kutipan divalidasi terhadap sumber **setelah normalisasi** (huruf kecil, spasi, tanda kutip/dash); kutipan tidak ada di sumber → retry 1x lalu 502; output gagal Zod → retry lalu 502; Gemini error 2x → 502; buruk 1x lalu bagus → 200 di percobaan ke-2; slug invalid → 500 |
| `POST /api/chat` | riwayat bukan array / kelebihan 14 item → 400; `lulus` **dipaksa false** selama ujian berjalan walaupun AI mengaku lulus; giliran ke-6 → `selesai` dipaksa true; hasil jujur AI dipertahankan; Gemini gagal 2x → 502; pastikan memakai model `smart`; sumber gagal → 500 |
| `POST /api/recommend` | skor ≥ 80 → `ujian`; percobaan ≥ 3 → `ujian`; skor rendah → `quest`; input kosong → `quest`; body bukan JSON → fallback `quest` **200** (tidak pernah 500); angka string tetap diproses |

## Menambah test baru

1. Taruh di `tests/unit/` (modul murni) atau `tests/api/<nama>.test.ts` (Route Handler).
2. Salin blok `vi.hoisted` + `vi.mock` dari file test sejenis yang sudah ada.
3. Gunakan helper `new Request("http://localhost/api/...", { method: "POST", body: JSON.stringify(...) })` untuk memanggil handler secara langsung.
4. Jalankan `npm test` — wajib hijau sebelum commit, bersamaan dengan `npm run build` dan `npm run lint`.

## Celah yang diketahui (ditemukan saat menulis test)

Perilaku berikut **terdokumentasi di test** sesuai kondisi kode saat ini, tapi perlu dibereskan agar sesuai AGENTS.md:

1. **`/api/question` mengirim `indeksBenar` segera** (FR-06 dilanggar). Jawaban seharusnya baru dikirim setelah siswa menjawab lewat `POST /api/question/answer` — test perlu ditambah untuk step jawaban itu begitu routenya ada.
2. **`/api/chat` membaca `nama` & `peran` dari body request**, bukan dari sesi. Seharusnya dari `getCurrentProfile()` (AGENTS.md §12: "derive user_id from the session, never from the request body").
3. **`/api/recommend` membaca performa dari body**, bukan dari database. Kontrak §10 menghendaki data performa dihitung server-side.
4. **Tidak ada test integrasi database** (Prisma query nyata, RLS, unlock `LULUS` → topic berikutnya). Butuh database test terpisah; pantau FR-08/FR-09 saat implementasi `user_topic_progress`.
5. **Belum ada rate limiting** yang bisa dites (rencana hari 5, lihat AGENTS.md §14).

Saat memperbaiki salah satu poin di atas, perbarui test yang mendokumentasikan perilaku lamanya agar tetap jujur.
