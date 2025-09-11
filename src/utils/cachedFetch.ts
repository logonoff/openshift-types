import { readFileSync } from "fs";
import { resolve } from "path";

/** Fetch but the response is stored in disk */
export const cachedFetch: typeof fetch = async (url, options) => {
  const cachePath = resolve(
    __dirname,
    "../../cached",
    encodeURIComponent(url.toString()) + ".json",
  );
  try {
    const data = readFileSync(cachePath, "utf8");
    return new Response(data, { status: 200 });
  } catch (err) {
    const res = await fetch(url, options);
    const data = await res.text();
    if (res.ok) {
      import("fs").then((fs) => {
        fs.writeFileSync(cachePath, data, "utf8");
      });
    }
    // Return a new Response so the body can be read again
    return new Response(data, { ...res });
  }
};
