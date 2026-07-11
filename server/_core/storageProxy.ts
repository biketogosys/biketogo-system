import type { Express } from "express";
import { ENV } from "./env";

export function registerStorageProxy(app: Express) {
  // ─── Rota genérica: `/storage/<key>` (backends s3 e local) ─────────────────
  // storagePut (s3/local) guarda URLs `/storage/<key>` no banco. Esta rota
  // resolve o backend sob demanda: presigned URL (S3, redirect) ou os bytes
  // direto do disco (local). Assim as URLs persistidas não expiram.
  app.get("/storage/*", async (req, res) => {
    const key = decodeURIComponent(req.path.replace(/^\/storage\//, ""));
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }
    try {
      const { getStorageBackend, storageGet, readLocalFile } = await import(
        "../storage"
      );
      const backend = getStorageBackend();
      if (backend === "local") {
        const file = await readLocalFile(key);
        if (!file) {
          res.status(404).send("Not found");
          return;
        }
        res.set("Content-Type", file.contentType);
        res.set("Cache-Control", "private, no-cache");
        res.send(file.body);
        return;
      }
      // s3 / manus: gerar URL assinada e redirecionar
      const { url } = await storageGet(key);
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }
      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[Storage] serve failed:", err);
      res.status(502).send("Storage error");
    }
  });

  // ─── Rota legada Manus: `/manus-storage/<key>` ─────────────────────────────
  // Mantida para compatibilidade com URLs antigas geradas no sandbox Manus.
  app.get("/manus-storage/*", async (req, res) => {
    const key = req.path.replace(/^\/manus-storage\//, "");
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }
    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }
    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/",
      );
      forgeUrl.searchParams.set("path", key);
      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
      });
      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }
      const { url } = (await forgeResp.json()) as { url: string };
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }
      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}
