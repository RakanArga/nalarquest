import { beforeEach, describe, expect, it } from "vitest";

import { POST } from "@/app/api/recommend/route";

function req(body: unknown) {
  return new Request("http://localhost/api/recommend", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {});

describe("POST /api/recommend", () => {
  it("merekomendasikan ujian bila skor terbaik >= 80", async () => {
    const res = await POST(req({ skorTerbaik: 80, totalPercobaan: 1 }));
    expect(res.status).toBe(200);
    expect((await res.json()).rekomendasi).toBe("ujian");
  });

  it("merekomendasikan ujian bila total percobaan >= 3 walaupun skor rendah", async () => {
    const res = await POST(req({ skorTerbaik: 40, totalPercobaan: 3 }));
    expect((await res.json()).rekomendasi).toBe("ujian");
  });

  it("merekomendasikan quest bila pemahaman belum cukup", async () => {
    const res = await POST(req({ skorTerbaik: 60, totalPercobaan: 1 }));
    expect((await res.json()).rekomendasi).toBe("quest");
  });

  it("default quest untuk input kosong", async () => {
    const res = await POST(req({}));
    expect((await res.json()).rekomendasi).toBe("quest");
  });

  it("fallback quest (200) bila body tidak valid JSON", async () => {
    const res = await POST(
      new Request("http://localhost/api/recommend", { method: "POST", body: "bukan json" })
    );
    expect(res.status).toBe(200);
    expect((await res.json()).rekomendasi).toBe("quest");
  });

  it("angka dalam bentuk string tetap diproses", async () => {
    const res = await POST(req({ skorTerbaik: "90", totalPercobaan: "0" }));
    expect((await res.json()).rekomendasi).toBe("ujian");
  });
});
