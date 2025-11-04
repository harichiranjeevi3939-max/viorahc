// This file handles data compression and a simple XOR encryption for local storage.
// It relies on the 'pako' library for Gzip compression, which must be loaded globally.
declare const pako: any;

const ENCRYPTION_KEY = 'tundra-viora-secret-key';

// XOR cipher function that operates on Uint8Arrays for robustness
const xorCipherBytes = (data: Uint8Array, key: string): Uint8Array => {
    const keyBytes = new TextEncoder().encode(key);
    const result = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) {
        result[i] = data[i] ^ keyBytes[i % keyBytes.length];
    }
    return result;
};

// Function to compress and then encrypt data
export const compressAndEncrypt = (data: string): string => {
    try {
        const dataBytes = new TextEncoder().encode(data);
        const compressedBytes: Uint8Array = pako.gzip(dataBytes);
        const encryptedBytes = xorCipherBytes(compressedBytes, ENCRYPTION_KEY);
        
        // Convert the final Uint8Array to a binary string for btoa
        let binaryString = '';
        for (let i = 0; i < encryptedBytes.length; i++) {
            binaryString += String.fromCharCode(encryptedBytes[i]);
        }
        return btoa(binaryString);
    } catch (error) {
        console.error("Compression/Encryption failed:", error);
        // Fallback for safety, to prevent data loss on an unexpected error.
        return data; 
    }
};

// A more robust check to see if a string is Base64 encoded.
const isBase64 = (str: string): boolean => {
    if (str === '' || str.trim() === '') { return false; }
    try {
        // The round-trip check is a common and effective way to validate Base64.
        return btoa(atob(str)) === str;
    } catch (err) {
        return false;
    }
};

// Function to decrypt and then decompress data
export const decompressAndDecrypt = (storedData: string): string => {
    // 1. Handle legacy unencrypted JSON data first
    if (storedData.trim().startsWith('{') || storedData.trim().startsWith('[')) {
        try {
            JSON.parse(storedData);
            return storedData; // It's valid raw JSON from a previous version
        } catch (e) {
            // It looks like JSON but isn't valid. Continue to try decryption.
        }
    }
    
    // 2. Before trying to decrypt, validate that it's a Base64 string.
    // This prevents the 'atob' error for corrupted or non-encoded data.
    if (!isBase64(storedData)) {
         console.warn("Decryption failed: Data is not valid Base64. Resetting data.", { data: storedData.substring(0,100) + '...' });
         return '[]'; // Return a safe, empty array structure to prevent app crashes
    }

    try {
        // Convert Base64 back to a binary string
        const binaryString = atob(storedData);
        // Convert binary string to Uint8Array
        const encryptedBytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            encryptedBytes[i] = binaryString.charCodeAt(i);
        }

        const decryptedBytes = xorCipherBytes(encryptedBytes, ENCRYPTION_KEY);
        const decompressedBytes: Uint8Array = pako.ungzip(decryptedBytes);
        
        // Convert final bytes back to a UTF-8 string
        return new TextDecoder().decode(decompressedBytes);
    } catch (error) {
        console.error("Decryption/Decompression failed with an error:", error);
        // If any step in the try block fails (atob, ungzip, etc.), the data is corrupt.
        return '[]'; // Return a safe default to prevent the app from crashing.
    }
};
