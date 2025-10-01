/* eslint-disable @typescript-eslint/no-explicit-any */
declare module 'archiver' {
  // Minimal declaration to satisfy TypeScript in this project
  // You can replace this with @types/archiver if compatible with your version
  export interface ArchiverZlibOptions {
    level?: number;
  }
  export interface ArchiverOptions {
    zlib?: ArchiverZlibOptions;
  }
  // Archiver instance is left as any to avoid strict coupling
  export type Archiver = any;
  function archiver(format: string, options?: ArchiverOptions): Archiver;
  export default archiver;
}
