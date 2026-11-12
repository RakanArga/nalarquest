import { describe, expect, it } from "vitest";
import { DEFAULT_ROLE, ROLES, ROLE_DISPLAY, ROLE_ENUM, toRoleEnum } from "@/lib/role";

describe("konstanta peran statis", () => {
  it("berisi tepat 4 peran RPG", () => {
    expect(ROLES).toHaveLength(4);
  });

  it("DEFAULT_ROLE adalah Ksatria Nalar (fallback bila AI gagal)", () => {
    expect(DEFAULT_ROLE).toBe("Ksatria Nalar");
  });
});

describe("toRoleEnum", () => {
  it("memetakan nama tampilan ke nilai enum Prisma", () => {
    expect(toRoleEnum("Ksatria Nalar")).toBe("Ksatria_Nalar");
    expect(toRoleEnum("Penyihir Teori")).toBe("Penyihir_Teori");
    expect(toRoleEnum("Cendekia Analitik")).toBe("Cendekia_Analitik");
    expect(toRoleEnum("Pengelana Konsep")).toBe("Pengelana_Konsep");
  });

  it("tidak peka huruf besar/kecil dan spasi berlebih", () => {
    expect(toRoleEnum("penyihir teori")).toBe("Penyihir_Teori");
    expect(toRoleEnum("  KSATRIA NALAR  ")).toBe("Ksatria_Nalar");
  });

  it("fallback ke peran default untuk teks tak dikenal (tidak pernah error)", () => {
    expect(toRoleEnum("siswa")).toBe("Ksatria_Nalar");
    expect(toRoleEnum("")).toBe("Ksatria_Nalar");
    expect(toRoleEnum("Peran Buatan AI Nakal")).toBe("Ksatria_Nalar");
  });
});

describe("ROLE_DISPLAY", () => {
  it("bolak-balik enum -> tampilan -> enum konsisten", () => {
    for (const [enumValue, display] of Object.entries(ROLE_DISPLAY)) {
      expect(ROLE_ENUM[display as keyof typeof ROLE_ENUM]).toBe(enumValue);
    }
  });
});
