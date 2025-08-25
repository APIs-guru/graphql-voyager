import renderVoyagerPage, { MiddlewareOptions } from './render-voyager-page.ts';

export default function expressMiddleware(options: MiddlewareOptions) {
  return (_req: any, res: any) => {
    res.setHeader('Content-Type', 'text/html');
    res.write(renderVoyagerPage(options));
    res.end();
  };
}
