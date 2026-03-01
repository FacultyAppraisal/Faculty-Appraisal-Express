declare module 'libreoffice-convert' {
  type ConvertCallback = (err: Error | null, result: Buffer) => void;

  function convert(
    document: Buffer,
    format: string,
    filter: string | undefined,
    callback: ConvertCallback
  ): void;

  function convertWithOptions(
    document: Buffer,
    format: string,
    filter: string | undefined,
    options: object,
    callback: ConvertCallback
  ): void;

  export { convert, convertWithOptions };
  export default { convert, convertWithOptions };
}
