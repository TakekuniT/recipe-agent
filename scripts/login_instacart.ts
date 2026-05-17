import fs from "fs/promises";
import path from "path";
import os from "os";

const COOKIE_PATH = path.join(
  os.homedir(),
  ".truffleoa",
  "instacart-cookie.json",
);

type StoredCookie = {
  cookie: string;
  savedAt: number;
};

async function ensureDir() {
  await fs.mkdir(path.dirname(COOKIE_PATH), { recursive: true });
}

export async function saveInstacartCookie(cookie: string) {
  await ensureDir();

  const data: StoredCookie = {
    cookie,
    savedAt: Date.now(),
  };

  await fs.writeFile(COOKIE_PATH, JSON.stringify(data, null, 2));

  console.log("Saved Instacart cookie");
}

export async function getInstacartCookie(): Promise<string | null> {
  try {
    const raw = await fs.readFile(COOKIE_PATH, "utf8");

    const data: StoredCookie = JSON.parse(raw);

    return data.cookie;
  } catch {
    return null;
  }
}

export async function requireInstacartCookie(): Promise<string> {
  const cookie = await getInstacartCookie();

  if (!cookie) {
    throw new Error(
      [
        "No Instacart cookie found.",
        "",
        "1. Open Instacart in Chrome",
        "2. Open DevTools -> Network",
        "3. Refresh page",
        "4. Copy request Cookie header",
        "5. Save it with saveInstacartCookie(...)",
      ].join("\n"),
    );
  }

  return cookie;
}
