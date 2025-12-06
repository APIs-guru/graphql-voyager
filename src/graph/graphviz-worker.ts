// eslint-disable-next-line import/no-unresolved
import { type RenderResult, WASM_HASH as DotVizWorkerHash } from 'dotviz';
import DotVizWorkerSource from 'dotviz/dotviz-inline-worker';
import { type RenderRequest, type RenderResponse } from 'dotviz/dotviz-worker';

import { computeHash } from '../utils/compute-hash.ts';
import { LocalStorageLRUCache } from '../utils/local-storage-lru-cache.ts';

export class VizWorker {
  private _cache = new LocalStorageLRUCache({
    localStorageKey: 'VoyagerSVGCache',
    maxSize: 10,
  });
  private _worker: Worker;
  private _listeners: Map<number, (result: RenderResult) => void> = new Map();

  constructor() {
    const blob = new Blob([DotVizWorkerSource], {
      type: 'application/javascript',
    });
    const url = URL.createObjectURL(blob);
    this._worker = new Worker(url, {
      name: 'graphql-voyager-worker',
      type: 'module',
    });
    URL.revokeObjectURL(url);

    this._worker.addEventListener('error', (event) => {
      // FIXME: better error handling
      console.error('unexpected error from dotviz worker: ', event);
    });
    this._worker.addEventListener('message', (event) => {
      const { id, result } = event.data as RenderResponse;

      this._listeners.get(id)?.(result);
      this._listeners.delete(id);
    });
  }

  async renderString(dot: string): Promise<string> {
    const cacheKey = await this.generateCacheKey(dot);

    if (cacheKey != null) {
      try {
        const cachedSVG = this._cache.get(cacheKey);
        if (cachedSVG != null) {
          console.log('graphql-voyager: SVG cached');
          return decompressFromDataURL(cachedSVG);
        }
      } catch (err) {
        console.warn('graphql-voyager: Can not read cache: ', err);
      }
    }

    const svg = await this._renderString(dot);

    if (cacheKey != null) {
      try {
        this._cache.set(cacheKey, await compressToDataURL(svg));
      } catch (err) {
        console.warn('graphql-voyager: Can not write cache: ', err);
      }
    }
    return svg;
  }

  async generateCacheKey(dot: string): Promise<string | null> {
    const dotHash = await computeHash(dot);
    return dotHash == null ? null : `worker:${DotVizWorkerHash}:dot:${dotHash}`;
  }

  _renderString(src: string): Promise<string> {
    const id = this._listeners.size;
    const renderRequest: RenderRequest = {
      id,
      input: src,
      options: { engine: 'dot', format: 'svg' },
    };

    return new Promise((resolve, reject) => {
      this._listeners.set(id, RenderResponseListener);

      console.time('graphql-voyager: Rendering SVG');
      this._worker.postMessage(renderRequest);

      function RenderResponseListener(result: RenderResult): void {
        console.timeEnd('graphql-voyager: Rendering SVG');
        if (result.errors.length !== 0) {
          return reject(
            AggregateError([
              result.errors.map(
                (error) => new Error(`${error.level} : ${error.message}`),
              ),
            ]),
          );
        }
        if (result.status === 'success') {
          return resolve(result.output);
        }
        return reject(new Error('invalid response from dotviz worker'));
      }
    });
  }
}

async function decompressFromDataURL(dataURL: string): Promise<string> {
  const response = await fetch(dataURL);
  const blob = await response.blob();
  switch (blob.type) {
    case 'application/gzip': {
      const stream = blob.stream().pipeThrough(new DecompressionStream('gzip'));
      const decompressedBlob = await streamToBlob(stream, 'text/plain');
      return decompressedBlob.text();
    }
    case 'text/plain':
      return blob.text();
    default:
      throw new Error('Can not convert data url with MIME type:' + blob.type);
  }
}

async function compressToDataURL(str: string): Promise<string> {
  try {
    const blob = new Blob([str], { type: 'text/plain' });
    const stream = blob.stream().pipeThrough(new CompressionStream('gzip'));
    const compressedBlob = await streamToBlob(stream, 'application/gzip');
    return blobToDataURL(compressedBlob);
  } catch (err) {
    console.warn('graphql-voyager: Can not compress string: ', err);
    return `data:text/plain;charset=utf-8,${encodeURIComponent(str)}`;
  }
}

function blobToDataURL(blob: Blob): Promise<string> {
  const fileReader = new FileReader();

  return new Promise((resolve, reject) => {
    try {
      fileReader.onload = function (event) {
        // eslint-disable-next-line @typescript-eslint/no-base-to-string
        const dataURL = event.target!.result!.toString();
        resolve(dataURL);
      };
      fileReader.readAsDataURL(blob);
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
      reject(err);
    }
  });
}

function streamToBlob(stream: ReadableStream, mimeType: string): Promise<Blob> {
  const response = new Response(stream, {
    headers: { 'Content-Type': mimeType },
  });
  return response.blob();
}
