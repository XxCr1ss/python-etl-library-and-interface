import { setupServer } from "msw/node";
import { handlers } from "./handlers";

export const server = setupServer(...handlers);

// A page may catch fetch's rejection and render an error. Still fail the test
// if it forgot to declare that request (or its handler threw unexpectedly).
const unmatched = new Map<string, string>();
server.events.on("request:start", ({ request, requestId }) => {
  unmatched.set(requestId, `${request.method} ${request.url}`);
});
server.events.on("request:match", ({ requestId }) => { unmatched.delete(requestId); });
export function consumeUnmatchedRequests() {
  const requests = Array.from(unmatched.values());
  unmatched.clear();
  return requests;
}
