/**
 * Durable JSON state for serverless hosting.
 *
 * On a long-running server the relayer and agent keep their small state (display names, invites, alert
 * briefs) in a local file. A serverless function has no lasting disk, so on Vercel the same JSON is kept in
 * a Vercel Blob instead. The path includes a hash of a server secret, so it cannot be guessed. Nothing in it
 * can move money: the chain holds the money, the passkeys and the rules.
 */
export type RemoteState = {
  load(): Promise<string | undefined>;
  save(json: string): Promise<void>;
};

export async function blobState(name: string, secret: string): Promise<RemoteState | undefined> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return undefined;
  const { put, list } = await import("@vercel/blob");
  const { createHash } = await import("node:crypto");
  const pathname = `state/${createHash("sha256").update(secret).digest("hex").slice(0, 32)}/${name}.json`;
  return {
    async load() {
      const { blobs } = await list({ prefix: pathname, limit: 1 });
      const found = blobs.find((b) => b.pathname === pathname);
      if (!found) return undefined;
      const response = await fetch(`${found.url}?v=${Date.now()}`);
      return response.ok ? await response.text() : undefined;
    },
    async save(json) {
      await put(pathname, json, {
        access: "public",
        addRandomSuffix: false,
        contentType: "application/json",
        cacheControlMaxAge: 60,
      });
    },
  };
}
