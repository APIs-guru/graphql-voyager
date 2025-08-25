import {
  RenderRequest,
  RenderResponse,
  RenderResult,
  VizWorkerHash,
  VizWorkerSource,
  // eslint-disable-next-line import/no-unresolved
} from '../../worker/voyager.worker.ts';
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
    const blob = new Blob([VizWorkerSource], {
      type: 'application/javascript',
    });
    const url = URL.createObjectURL(blob);
    this._worker = new Worker(url, { name: 'graphql-voyager-worker' });
    URL.revokeObjectURL(url);

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
    return dotHash == null ? null : `worker:${VizWorkerHash}:dot:${dotHash}`;
  }

  _renderString(src: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const id = this._listeners.size;

      this._listeners.set(id, function (result): void {
        if ('error' in result) {
          const { error } = result;
          const e = new Error(error.message);
          if (error.fileName) (e as any).fileName = error.fileName;
          if (error.lineNumber) (e as any).lineNumber = error.lineNumber;
          if (error.stack) (e as any).stack = error.stack;
          return reject(e);
        }
        console.timeEnd('graphql-voyager: Rendering SVG');
        resolve(result.value);
      });

      console.time('graphql-voyager: Rendering SVG');
      const renderRequest: RenderRequest = { id, src };
      this._worker.postMessage(renderRequest);
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
