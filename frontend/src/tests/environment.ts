import { builtinEnvironments, type Environment } from "vitest/runtime";

// Keep Node's web body types together with its real fetch/Request. Mixing
// jsdom File/FormData with Node 24's multipart encoder can leave formData()
// pending forever. The DOM itself still runs in jsdom without browser mocks.
const environment: Environment = {
  name: "jsdom-web",
  viteEnvironment: "client",
  async setup(global, options) {
    const web = { Blob: global.Blob, File: global.File, FormData: global.FormData };
    const dom = await builtinEnvironments.jsdom.setup(global, options);
    Object.assign(global, web);
    return {
      async teardown() { await dom.teardown(global); },
    };
  },
};
export default environment;
