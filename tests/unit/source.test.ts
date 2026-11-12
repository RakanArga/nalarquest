import fs from "fs/promises";
import path from "path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getSource } from "@/lib/source";

const FIXTURE = "Isi materi uji untuk tes sumber belajar.";

beforeAll(async () => {
  await fs.mkdir(path.join(process.cwd(), "data/sources"), { recursive: true });
  await fs.writeFile(path.join(process.cwd(), "data/sources/unit-test.md"), FIXTURE, "utf-8");
});

afterAll(async () => {
  await fs.rm(path.join(process.cwd(), "data/sources/unit-test.md"), { force: true });
});

describe("getSource", () => {
  it("membaca file sumber dengan slug valid", async () => {
    const isi = await getSource("unit", "test");
    expect(isi).toBe(FIXTURE);
  });

  it("menolak slug dengan karakter berbahaya (path traversal)", async () => {
    await expect(getSource("../etc", "passwd")).rejects.toThrow("bad input");
    await expect(getSource("unit", "../../.env")).rejects.toThrow("bad input");
  });

  it("menolak slug dengan spasi, huruf besar, atau karakter khusus", async () => {
    await expect(getSource("Ilmu Komputer", "materi1")).rejects.toThrow("bad input");
    await expect(getSource("unit", "materi$1")).rejects.toThrow("bad input");
    await expect(getSource("", "")).rejects.toThrow("bad input");
  });

  it("melempar error bila file tidak ada", async () => {
    await expect(getSource("unit", "tidakada")).rejects.toThrow();
  });
});
