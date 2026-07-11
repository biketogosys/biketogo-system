// Storage helpers com seleção automática de backend:
//
//   1) "manus" — proxy de storage do Manus (Authorization: Bearer <token>).
//                Usado quando BUILT_IN_FORGE_API_URL/_KEY existem (sandbox Manus).
//   2) "s3"    — Amazon S3 / Supabase Storage (S3-compatível). Usado quando
//                S3_BUCKET + credenciais existem. Leitura via presigned URL.
//   3) "local" — disco local (.dev-storage/), fallback de desenvolvimento
//                (npm run dev:local, sem Manus e sem S3).
//
// `storagePut` devolve uma URL **durável** para persistir no banco:
//   - manus: a URL retornada pelo proxy;
//   - s3/local: um caminho estável `/storage/<key>` servido pelo storageProxy,
//     que resolve a URL assinada (S3) ou serve o arquivo (local) sob demanda.
//     Isso evita guardar URLs presigned que expiram (contrato PDF, docs, fotos).
//
// `storageGet` devolve uma URL de **leitura** fresca (presigned no S3).

import { ENV } from "./_core/env";
import path from "path";

export type StorageBackend = "manus" | "s3" | "local";

/** Raiz do storage local (dev). Relativa ao cwd (repo root no dev:local). */
const LOCAL_ROOT = path.resolve(process.cwd(), ".dev-storage");

/** Content-types inferidos por extensão (usado ao servir o backend local). */
const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  pdf: "application/pdf",
  svg: "image/svg+xml",
};

export function getStorageBackend(): StorageBackend {
  if (ENV.forgeApiUrl && ENV.forgeApiKey) return "manus";
  if (ENV.s3Bucket && ENV.s3AccessKeyId && ENV.s3SecretAccessKey) return "s3";
  return "local";
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

/** Caminho estável servido pelo storageProxy (`/storage/<key>`). */
function stableUrl(key: string): string {
  return `/storage/${key.split("/").map(encodeURIComponent).join("/")}`;
}

function toBuffer(data: Buffer | Uint8Array | string): Buffer {
  if (typeof data === "string") return Buffer.from(data);
  return Buffer.isBuffer(data) ? data : Buffer.from(data);
}

function contentTypeForKey(key: string): string {
  const ext = key.split(".").pop()?.toLowerCase() ?? "";
  return CONTENT_TYPES[ext] ?? "application/octet-stream";
}

// ─── Manus proxy ─────────────────────────────────────────────────────────────

function getManusConfig(): { baseUrl: string; apiKey: string } {
  const baseUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;
  if (!baseUrl || !apiKey) {
    throw new Error(
      "Storage proxy credentials missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY"
    );
  }
  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function toFormData(
  data: Buffer | Uint8Array | string,
  contentType: string,
  fileName: string
): FormData {
  const blob =
    typeof data === "string"
      ? new Blob([data], { type: contentType })
      : new Blob([data as any], { type: contentType });
  const form = new FormData();
  form.append("file", blob, fileName || "file");
  return form;
}

async function manusPut(
  key: string,
  data: Buffer | Uint8Array | string,
  contentType: string
): Promise<{ key: string; url: string }> {
  const { baseUrl, apiKey } = getManusConfig();
  const uploadUrl = new URL("v1/storage/upload", ensureTrailingSlash(baseUrl));
  uploadUrl.searchParams.set("path", key);
  const formData = toFormData(data, contentType, key.split("/").pop() ?? key);
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });
  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(
      `Storage upload failed (${response.status} ${response.statusText}): ${message}`
    );
  }
  const url = (await response.json()).url;
  return { key, url };
}

async function manusGet(key: string): Promise<{ key: string; url: string }> {
  const { baseUrl, apiKey } = getManusConfig();
  const downloadApiUrl = new URL(
    "v1/storage/downloadUrl",
    ensureTrailingSlash(baseUrl)
  );
  downloadApiUrl.searchParams.set("path", key);
  const response = await fetch(downloadApiUrl, {
    method: "GET",
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  return { key, url: (await response.json()).url };
}

// ─── Amazon S3 / Supabase Storage ─────────────────────────────────────────────

type S3ClientType = import("@aws-sdk/client-s3").S3Client;
let _s3Client: S3ClientType | null = null;

async function getS3Client(): Promise<S3ClientType> {
  if (_s3Client) return _s3Client;
  const { S3Client } = await import("@aws-sdk/client-s3");
  _s3Client = new S3Client({
    region: ENV.s3Region || "us-east-1",
    endpoint: ENV.s3Endpoint || undefined,
    // Supabase/MinIO usam endpoint custom → path-style é obrigatório.
    forcePathStyle: Boolean(ENV.s3Endpoint),
    credentials: {
      accessKeyId: ENV.s3AccessKeyId,
      secretAccessKey: ENV.s3SecretAccessKey,
    },
  });
  return _s3Client;
}

async function s3Put(
  key: string,
  data: Buffer | Uint8Array | string,
  contentType: string
): Promise<{ key: string; url: string }> {
  const client = await getS3Client();
  const { PutObjectCommand } = await import("@aws-sdk/client-s3");
  await client.send(
    new PutObjectCommand({
      Bucket: ENV.s3Bucket,
      Key: key,
      Body: toBuffer(data),
      ContentType: contentType,
    })
  );
  // URL durável (proxy) — a presigned real é gerada em storageGet.
  return { key, url: stableUrl(key) };
}

async function s3Get(key: string): Promise<{ key: string; url: string }> {
  const client = await getS3Client();
  const { GetObjectCommand } = await import("@aws-sdk/client-s3");
  const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
  const url = await getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: ENV.s3Bucket, Key: key }),
    { expiresIn: 3600 }
  );
  return { key, url };
}

// ─── Local (disco) — fallback de desenvolvimento ──────────────────────────────

function localPathFor(key: string): string {
  // Impede escapar da raiz (path traversal) via `..` na key.
  const full = path.resolve(LOCAL_ROOT, key);
  if (full !== LOCAL_ROOT && !full.startsWith(LOCAL_ROOT + path.sep)) {
    throw new Error("Invalid storage key");
  }
  return full;
}

async function localPut(
  key: string,
  data: Buffer | Uint8Array | string
): Promise<{ key: string; url: string }> {
  const fs = await import("fs/promises");
  const filePath = localPathFor(key);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, toBuffer(data));
  return { key, url: stableUrl(key) };
}

/**
 * Lê um arquivo do storage local (usado pelo storageProxy para servir bytes).
 * Devolve `null` se não existir.
 */
export async function readLocalFile(
  relKey: string
): Promise<{ body: Buffer; contentType: string } | null> {
  const fs = await import("fs/promises");
  const key = normalizeKey(relKey);
  try {
    const body = await fs.readFile(localPathFor(key));
    return { body, contentType: contentTypeForKey(key) };
  } catch {
    return null;
  }
}

// ─── API pública ──────────────────────────────────────────────────────────────

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  const backend = getStorageBackend();
  if (backend === "manus") return manusPut(key, data, contentType);
  if (backend === "s3") return s3Put(key, data, contentType);
  return localPut(key, data);
}

export async function storageGet(
  relKey: string
): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  const backend = getStorageBackend();
  if (backend === "manus") return manusGet(key);
  if (backend === "s3") return s3Get(key);
  // local: a própria rota do proxy serve os bytes.
  return { key, url: stableUrl(key) };
}
