const crypto = require('crypto');

// Derive a 32-byte key from JWT_SECRET (authoritative source)
function getKey() {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || String(jwtSecret).trim() === '') {
    throw new Error('Missing JWT_SECRET for encryption');
  }
  return crypto.createHash('sha256').update(String(jwtSecret)).digest();
}

function encryptText(plaintext) {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Store tag appended to ciphertext
  return { ciphertext: Buffer.concat([enc, tag]), iv };
}

function decryptText(ciphertextWithTag, iv) {
  const key = getKey();
  const ct = Buffer.isBuffer(ciphertextWithTag) ? ciphertextWithTag : Buffer.from(ciphertextWithTag);
  const tag = ct.subarray(ct.length - 16);
  const enc = ct.subarray(0, ct.length - 16);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString('utf8');
}

module.exports = { encryptText, decryptText };


