import contracts from "./backend-contracts.json";

export const API_URL = "http://localhost:8000/api/v1";
// Verified against the HTTP handlers by backend/tests/test_environment.py.
// The CSV reader maps blank cells to null; scalarValues below tests "" separately.
export const sales = contracts.sales;
export const uploadResponse = contracts.uploadResponse;
export const fileSource = {
  type: "file", filename: uploadResponse.filename, filepath: uploadResponse.filepath,
  unique_filename: uploadResponse.unique_filename, total_rows: sales.length,
};
export const previewResponse = contracts.previewResponse;
export const scalarValues = [0, false, "", null];
export const recursiveValues = [[1, 2], [], { a: 1 }, { nested: [false, null, ""] }];
