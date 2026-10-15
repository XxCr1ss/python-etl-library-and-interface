export const API_URL = "http://localhost:8000/api/v1";
export const sales = Array.from({ length: 12 }, (_, index) => ({
  id: index + 1,
  cliente_id: index % 3 + 1,
  col_monto: index * 10,
  fecha: "2024-01-01",
  activo: index % 2 === 1,
  etiquetas: index % 3 === 0 ? "a;b" : index % 3 === 1 ? "" : null,
}));
export const uploadResponse = {
  status: "success", filename: "sample_sales.csv",
  filepath: "/synthetic/etl_uploads/sample_sales.csv",
  unique_filename: "synthetic_sample_sales.csv", message: "Archivo cargado",
  preview_data: sales.slice(0, 5), total_rows: sales.length,
};
export const fileSource = {
  type: "file", filename: uploadResponse.filename, filepath: uploadResponse.filepath,
  unique_filename: uploadResponse.unique_filename, total_rows: sales.length,
};
export const previewResponse = {
  status: "success", total_rows: sales.length,
  columns: Object.keys(sales[0]),
  dtypes: { id: "int64", cliente_id: "int64", col_monto: "int64", fecha: "str", activo: "bool", etiquetas: "str" },
  preview_data: sales.slice(0, 10),
};
export const scalarValues = [0, false, "", null];
export const recursiveValues = [[1, 2], [], { a: 1 }, { nested: [false, null, ""] }];
