declare module "xlsx/xlsx.mjs" {
  export * from "xlsx";
  const xlsx: typeof import("xlsx");
  export default xlsx;
}