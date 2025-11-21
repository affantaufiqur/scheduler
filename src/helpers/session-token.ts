import { randomBytes } from "crypto";

/**
 * Generates a random session token.
 * @param length - The length of the session token. Default is 48 characters.
 * @returns A string of random session token.
 */
export default function createSessionToken(length: number = 48): string {
  if (length <= 0 || !Number.isInteger(length)) {
    throw new Error("Length must be a positive integer");
  }

  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = randomBytes(length);

  return Array.from(bytes, (byte) => characters[byte % characters.length]).join("");
}
