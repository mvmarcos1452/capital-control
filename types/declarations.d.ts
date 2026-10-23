declare module 'qrcode-terminal' {
  interface Options {
    small?: boolean;
  }
  export function generate(input: string, opts?: Options, cb?: (qrcode: string) => void): void;
  export function setErrorLevel(error: 'L' | 'M' | 'Q' | 'H'): void;
}

declare namespace Bun {
  class SQL {
    constructor(options: { url: string });
    unsafe(query: string): Promise<any>;
    close(): Promise<void>;
  }
}
