import renderVoyagerPage, { MiddlewareOptions } from './render-voyager-page.ts';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pkg = require('../package.json');

const hapi = {
  pkg,
  register(server: any, options: any) {
    if (arguments.length !== 2) {
      throw new Error(
        `Voyager middleware expects exactly 3 arguments, got ${arguments.length}`,
      );
    }

    const { path, route: config = {}, ...middlewareOptions } = options;

    server.route({
      method: 'GET',
      path,
      config,
      handler: (_request: any, h: any) =>
        h.response(renderVoyagerPage(middlewareOptions as MiddlewareOptions)),
    });
  },
};

export default hapi;
