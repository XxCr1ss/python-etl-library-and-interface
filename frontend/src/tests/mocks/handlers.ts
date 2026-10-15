import { http, HttpResponse } from "msw";
import { API_URL, previewResponse, uploadResponse } from "../fixtures/api";

// Only used routes have defaults. Other endpoints (especially load/execute) must
// be declared explicitly by a test, so a new request cannot silently succeed.
export const handlers = [
  http.get(`${API_URL}/health`, () => HttpResponse.json({ status: "ok", message: "ETL API is running" })),
  http.post(`${API_URL}/extract/upload`, () => HttpResponse.json(uploadResponse)),
  http.post(`${API_URL}/transform/preview`, () => HttpResponse.json(previewResponse)),
  http.post(`${API_URL}/load/test-connection`, () => HttpResponse.json({ status: "success", message: "Conexión sintética verificada" })),
  http.get(`${API_URL}/extract/agent/status/:agentId`, ({ params }) => HttpResponse.json({ agent_id: params.agentId, connected: false })),
];
