import { readFileSync } from "fs";
import crypto from "crypto";

export function generateHash(filePath: string): string {
    const fileBuffer = readFileSync(filePath);
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    return hash;
}