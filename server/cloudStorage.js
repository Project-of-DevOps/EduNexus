const fs = require('fs');
let Storage;
let storageInstance = null;

function getStorage() {
  if (storageInstance) return storageInstance;
  try {
    Storage = Storage || require('@google-cloud/storage').Storage;
  } catch (err) {
    // dependency may not be installed yet
    console.error('Missing @google-cloud/storage: please run `npm install @google-cloud/storage` in server/');
    throw err;
  }
  const keyFilename = process.env.GCP_SERVICE_ACCOUNT_KEY_PATH || process.env.GCP_SERVICE_ACCOUNT_JSON_PATH;
  const opts = {};
  if (keyFilename) opts.keyFilename = keyFilename;
  storageInstance = new Storage(opts);
  return storageInstance;
}

async function uploadBuffer(filename, buffer, bucketName) {
  const storage = getStorage();
  const bucket = bucketName || process.env.GCP_BACKUP_BUCKET;
  if (!bucket) throw new Error('GCP_BACKUP_BUCKET not configured');
  const file = storage.bucket(bucket).file(filename);
  await file.save(buffer, { resumable: false });
  return true;
}

async function uploadFile(localPath, destName, bucketName) {
  if (!fs.existsSync(localPath)) throw new Error('Local file not found: ' + localPath);
  const storage = getStorage();
  const bucket = bucketName || process.env.GCP_BACKUP_BUCKET;
  if (!bucket) throw new Error('GCP_BACKUP_BUCKET not configured');
  await storage.bucket(bucket).upload(localPath, { destination: destName });
  return true;
}

// List files under a prefix in the backup bucket
async function listFiles(prefix = 'backups/', bucketName) {
  const storage = getStorage();
  const bucket = bucketName || process.env.GCP_BACKUP_BUCKET;
  if (!bucket) throw new Error('GCP_BACKUP_BUCKET not configured');
  const [files] = await storage.bucket(bucket).getFiles({ prefix });
  return files.map(f => ({
    name: f.name,
    size: f.metadata && f.metadata.size ? Number(f.metadata.size) : null,
    updated: f.metadata && f.metadata.updated ? f.metadata.updated : null,
  }));
}

module.exports = {
  uploadBuffer,
  uploadFile,
  listFiles,
};
