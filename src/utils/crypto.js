import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';

// Configuration
const algorithm = 'aes-256-cbc';
const key = randomBytes(32); // Generate a secure key
const iv = randomBytes(16);  // Initialization vector

// Encryption
function encrypt(text) {
    const cipher = createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text, 'utf-8', 'hex');
    encrypted += cipher.final('hex');
    return { iv: iv.toString('hex'), encryptedData: encrypted };
}

// Decryption
function decrypt(encryptedData, iv) {
    const decipher = createDecipheriv(algorithm, key, Buffer.from(iv, 'hex'));
    let decrypted = decipher.update(encryptedData, 'hex', 'utf-8');
    decrypted += decipher.final('utf-8');
    return decrypted;
}

export {
    encrypt,
    decrypt
}
