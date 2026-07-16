declare module 'franc' {
  interface FrancOptions {
    minLength?: number;
    only?: string[];
    ignore?: string[];
  }

  interface Franc {
    (value: string, options?: FrancOptions): string;
    all(value: string, options?: FrancOptions): [string, number][];
  }

  const franc: Franc;
  export = franc;
}
