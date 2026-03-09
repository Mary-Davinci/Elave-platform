#!/usr/bin/env node
import fs from "fs";
import path from "path";
import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const value = argv[i + 1];
    out[key] = value;
    i += 1;
  }
  return out;
}

async function listAllObjects(client, bucket, prefix) {
  const objects = [];
  let continuationToken = undefined;
  do {
    const result = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      })
    );
    if (Array.isArray(result.Contents)) objects.push(...result.Contents);
    continuationToken = result.IsTruncated ? result.NextContinuationToken : undefined;
  } while (continuationToken);
  return objects;
}

async function deleteKeysInChunks(client, bucket, keys) {
  const chunkSize = 1000;
  for (let i = 0; i < keys.length; i += chunkSize) {
    const chunk = keys.slice(i, i + chunkSize).map((Key) => ({ Key }));
    await client.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: { Objects: chunk, Quiet: true },
      })
    );
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const filePath = args.file;
  const bucket = args.bucket;
  const endpoint = args.endpoint;
  const region = args.region || "us-east-005";
  const keyId = args.keyId;
  const appKey = args.appKey;
  const prefix = args.prefix || "mongo-backups/";
  const retentionDays = Number(args.retentionDays || "30");

  if (!filePath || !bucket || !endpoint || !keyId || !appKey) {
    throw new Error(
      "Parametri mancanti: --file --bucket --endpoint --keyId --appKey (opzionali: --region --prefix --retentionDays)"
    );
  }
  if (!fs.existsSync(filePath)) {
    throw new Error(`File backup non trovato: ${filePath}`);
  }

  const client = new S3Client({
    region,
    endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: keyId,
      secretAccessKey: appKey,
    },
  });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const originalFileName = path.basename(filePath);
  const objectKey = `${prefix.replace(/\/?$/, "/")}mongo-backup-${timestamp}-${originalFileName}`;

  const body = fs.createReadStream(filePath);
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      Body: body,
      ContentType: "application/zip",
    })
  );
  console.log(`[backup] upload completato: s3://${bucket}/${objectKey}`);

  if (Number.isFinite(retentionDays) && retentionDays > 0) {
    const threshold = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    const allObjects = await listAllObjects(client, bucket, prefix);
    const expiredKeys = allObjects
      .filter((obj) => obj.Key && obj.LastModified && obj.LastModified.getTime() < threshold)
      .map((obj) => obj.Key);

    if (expiredKeys.length > 0) {
      await deleteKeysInChunks(client, bucket, expiredKeys);
      console.log(`[backup] rimossi ${expiredKeys.length} file vecchi dal bucket`);
    } else {
      console.log("[backup] nessun file vecchio da rimuovere sul bucket");
    }
  }
}

main().catch((err) => {
  console.error(`[backup] errore upload B2: ${err.message}`);
  process.exit(1);
});
