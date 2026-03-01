declare module 'pizzip' {
  class PizZip {
    constructor(data?: string | ArrayBuffer | Uint8Array | Buffer, options?: object);
    file(name: string): { asText(): string; asBinary(): string; asUint8Array(): Uint8Array; asNodeBuffer(): Buffer } | null;
    file(name: string, data: string | Uint8Array | Buffer, options?: object): this;
    folder(name: string): PizZip | null;
    generate(options: { type: 'nodebuffer' }): Buffer;
    generate(options: { type: 'base64' | 'string' | 'blob' | 'uint8array' }): string | Blob | Uint8Array;
    generate(options?: object): Buffer | string | Blob | Uint8Array;
  }
  export = PizZip;
}
