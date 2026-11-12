export const ROLES = [
  "Ksatria Nalar",
  "Penyihir Teori",
  "Cendekia Analitik",
  "Pengelana Konsep",
] as const;

export type RoleNama = (typeof ROLES)[number];

export const DEFAULT_ROLE: RoleNama = "Ksatria Nalar";

export const ROLE_ENUM: Record<RoleNama, "Ksatria_Nalar" | "Penyihir_Teori" | "Cendekia_Analitik" | "Pengelana_Konsep"> = {
  "Ksatria Nalar": "Ksatria_Nalar",
  "Penyihir Teori": "Penyihir_Teori",
  "Cendekia Analitik": "Cendekia_Analitik",
  "Pengelana Konsep": "Pengelana_Konsep",
};

export type RoleEnum = (typeof ROLE_ENUM)[RoleNama];

export const ROLE_DISPLAY: Record<RoleEnum, RoleNama> = {
  Ksatria_Nalar: "Ksatria Nalar",
  Penyihir_Teori: "Penyihir Teori",
  Cendekia_Analitik: "Cendekia Analitik",
  Pengelana_Konsep: "Pengelana Konsep",
};

export function toRoleEnum(nama: string): RoleEnum {
  const match = ROLES.find(
    (r) => r.toLowerCase() === nama.toLowerCase().trim()
  );
  return ROLE_ENUM[match ?? DEFAULT_ROLE];
}
