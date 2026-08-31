// utif.d.ts
// utif ships no TypeScript types of its own.
declare module "utif" {
  interface IFD {
    width?: number;
    height?: number;
    data?: Uint8Array;
    [tag: string]: unknown;
  }

  const UTIF: {
    decode(buffer: ArrayBuffer): IFD[];
    decodeImage(buffer: ArrayBuffer, ifd: IFD, ifds?: IFD[]): void;
    toRGBA8(ifd: IFD): Uint8Array;
  };

  export default UTIF;
}
