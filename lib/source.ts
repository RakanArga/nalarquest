import fs from "fs/promises";
import path from "path";

export async function getSource(subjek: string, materi: string) {
  const safe = /^[a-z0-9-]+$/;
  if (!safe.test(subjek) || !safe.test(materi)) throw new Error("bad input");
  const file = path.join(process.cwd(), "data/sources", `${subjek}-${materi}.md`);
  return fs.readFile(file, "utf-8");
}