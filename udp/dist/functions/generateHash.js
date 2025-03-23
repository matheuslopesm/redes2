"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateHash = generateHash;
const fs_1 = require("fs");
const crypto_1 = __importDefault(require("crypto"));
function generateHash(filePath) {
    const fileBuffer = (0, fs_1.readFileSync)(filePath);
    const hash = crypto_1.default.createHash('sha256').update(fileBuffer).digest('hex');
    return hash;
}
