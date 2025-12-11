// Minimal TextEncoder polyfill for environments (like Civ7's V8) that lack the Web TextEncoder API.
// Implements UTF-8 encoding for the subset needed by our hashing code paths.
if (typeof globalThis.TextEncoder === "undefined") {
  class TextEncoderPolyfill {
    readonly encoding = "utf-8";

    encode(input: string = ""): Uint8Array {
      const bytes: number[] = [];

      for (let i = 0; i < input.length; i++) {
        let codePoint = input.codePointAt(i);
        if (codePoint === undefined) continue;

        // Skip the second half of surrogate pairs since codePointAt already consumed it.
        if (codePoint > 0xffff) {
          i++;
        }

        if (codePoint <= 0x7f) {
          bytes.push(codePoint);
        } else if (codePoint <= 0x7ff) {
          bytes.push(0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f));
        } else if (codePoint <= 0xffff) {
          bytes.push(
            0xe0 | (codePoint >> 12),
            0x80 | ((codePoint >> 6) & 0x3f),
            0x80 | (codePoint & 0x3f)
          );
        } else {
          bytes.push(
            0xf0 | (codePoint >> 18),
            0x80 | ((codePoint >> 12) & 0x3f),
            0x80 | ((codePoint >> 6) & 0x3f),
            0x80 | (codePoint & 0x3f)
          );
        }
      }

      return new Uint8Array(bytes);
    }

    encodeInto(source: string, destination: Uint8Array): { read: number; written: number } {
      const encoded = this.encode(source);
      const writeLength = Math.min(encoded.length, destination.length);
      for (let i = 0; i < writeLength; i++) {
        destination[i] = encoded[i];
      }
      return { read: source.length, written: writeLength };
    }
  }

  // Attach to the global scope so downstream modules (TypeBox) can use it.
  (globalThis as any).TextEncoder = TextEncoderPolyfill;
}

export {}; // Ensure this file is treated as a module.
