import svgPanZoom from 'svg-pan-zoom';

import { typeNameToId } from '../introspection/utils.ts';
import { stringToSvg } from '../utils/dom-helpers.ts';

// FIXME: we are waiting for this [PR](https://github.com/ariutta/svg-pan-zoom/pull/379), after that this two interfaces might be removed in favor to `import { Instance, Point } from 'svg-pan-zoom'`
interface Point {
  x: number;
  y: number;
}

interface Instance {
  resize(): Instance;
  zoom(scale: number): void;
  zoomIn(): void;
  zoomOut(): void;
  reset(): void;
  getPan(): Point;
  getZoom(): number;
  pan(point: Point): Instance;
  destroy(): void;
}

export class Viewport {
  onSelectNode: (id: string | null) => void;
  onSelectEdge: (id: string) => void;

  $svg: SVGSVGElement;
  // @ts-expect-error FIXME: Consider for future fix
  zoomer: Instance;
  // @ts-expect-error FIXME: Consider for future fix
  offsetLeft: number;
  // @ts-expect-error FIXME: Consider for future fix
  offsetTop: number;
  // @ts-expect-error FIXME: Consider for future fix
  maxZoom: number;
  resizeObserver: ResizeObserver;

  constructor(
    svgString: string,
    public container: HTMLElement,
    onSelectNode: (id: string | null) => void,
    onSelectEdge: (id: string) => void,
  ) {
    this.onSelectNode = onSelectNode;
    this.onSelectEdge = onSelectEdge;

    this.container.innerHTML = '';
    this.$svg = stringToSvg(svgString);
    this.container.appendChild(this.$svg);

    // Allow the SVG dimensions to be computed
    // Quick fix for SVG manipulation issues.
    setTimeout(() => this.enableZoom(), 0);
    this.bindClick();
    this.bindHover();

    this.resizeObserver = new ResizeObserver(() => {
      const bbRect = this.container.getBoundingClientRect();
      this.offsetLeft = bbRect.left;
      this.offsetTop = bbRect.top;
      if (this.zoomer !== undefined) {
        this.zoomer.resize();
      }
    });
    this.resizeObserver.observe(this.container);
  }

  enableZoom() {
    const svgHeight = this.$svg['height'].baseVal.value;
    const svgWidth = this.$svg['width'].baseVal.value;
    const bbRect = this.container.getBoundingClientRect();
    this.maxZoom = Math.max(svgHeight / bbRect.height, svgWidth / bbRect.width);

    this.zoomer = svgPanZoom(this.$svg, {
      zoomScaleSensitivity: 0.25,
      minZoom: 0.95,
      maxZoom: this.maxZoom,
    });
    this.zoomer.zoom(0.95);
  }

  bindClick() {
    let dragged = false;

    const moveHandler = () => (dragged = true);
    this.$svg.addEventListener('mousedown', () => {
      dragged = false;
      setTimeout(() => this.$svg.addEventListener('mousemove', moveHandler));
    });
    this.$svg.addEventListener('mouseup', (event) => {
      this.$svg.removeEventListener('mousemove', moveHandler);
      if (dragged) return;

      const target = event.target as SVGElement;
      if (isLink(target)) {
        const typeId = typeNameToId(target.textContent!);
        this.focusElement(typeId);
      } else if (isNode(target)) {
        const $node = getParent(target, 'node')!;
        this.onSelectNode($node.id);
      } else if (isEdge(target)) {
        const $edge = getParent(target, 'edge')!;
        this.onSelectEdge(edgeSource($edge).id);
      } else if (!isControl(target)) {
        this.onSelectNode(null);
      }
    });
  }

  bindHover() {
    let $prevHovered: SVGElement | null = null;
    let $prevHoveredEdge: SVGElement | null = null;

    function clearSelection() {
      if ($prevHovered) $prevHovered.classList.remove('hovered');
      if ($prevHoveredEdge) $prevHoveredEdge.classList.remove('hovered');
    }

    this.$svg.addEventListener('mousemove', (event) => {
      const target = event.target as SVGElement;
      if (isEdgeSource(target)) {
        const $sourceGroup = getParent(target, 'edge-source')!;
        if ($sourceGroup.classList.contains('hovered')) return;
        clearSelection();
        $sourceGroup.classList.add('hovered');
        $prevHovered = $sourceGroup;
        const $edge = edgeFrom($sourceGroup.id);
        $edge.classList.add('hovered');
        $prevHoveredEdge = $edge;
      } else {
        clearSelection();
      }
    });
  }

  selectNodeById(id: string | null) {
    this.removeClass('.node.selected', 'selected');
    this.removeClass('.highlighted', 'highlighted');
    this.removeClass('.selected-reachable', 'selected-reachable');

    if (id === null) {
      this.$svg.classList.remove('selection-active');
      return;
    }

    this.$svg.classList.add('selection-active');
    // @ts-expect-error https://github.com/microsoft/TypeScript/issues/4689#issuecomment-690503791
    const $selected = document.getElementById(id) as SVGElement;
    this.selectNode($selected);
  }

  selectNode(node: SVGElement) {
    node.classList.add('selected');

    for (const $edge of edgesFromNode(node)) {
      $edge.classList.add('highlighted');
      edgeTarget($edge).classList.add('selected-reachable');
    }

    for (const $edge of edgesTo(node.id)) {
      $edge.classList.add('highlighted');
      edgeSource($edge).parentElement!.classList.add('selected-reachable');
    }
  }

  selectEdgeById(id: string | null) {
    this.removeClass('.edge.selected', 'selected');
    this.removeClass('.edge-source.selected', 'selected');
    this.removeClass('.field.selected', 'selected');

    if (id === null) return;

    const $selected = document.getElementById(id);
    if ($selected) {
      const $edge = edgeFrom($selected.id);
      if ($edge) $edge.classList.add('selected');
      $selected.classList.add('selected');
    }
  }

  removeClass(selector: string, className: string) {
    for (const node of this.$svg.querySelectorAll(selector)) {
      node.classList.remove(className);
    }
  }

  focusElement(id: string) {
    const bbBox = document.getElementById(id)!.getBoundingClientRect();
    const currentPan = this.zoomer.getPan();
    const viewPortSizes = (this.zoomer as any).getSizes();

    currentPan.x += viewPortSizes.width / 2 - bbBox.width / 2;
    currentPan.y += viewPortSizes.height / 2 - bbBox.height / 2;

    const zoomUpdateToFit =
      1.2 *
      Math.max(
        bbBox.height / viewPortSizes.height,
        bbBox.width / viewPortSizes.width,
      );
    let newZoom = this.zoomer.getZoom() / zoomUpdateToFit;
    const recommendedZoom = this.maxZoom * 0.6;
    if (newZoom > recommendedZoom) newZoom = recommendedZoom;

    const newX = currentPan.x - bbBox.left + this.offsetLeft;
    const newY = currentPan.y - bbBox.top + this.offsetTop;
    this.animatePanAndZoom(newX, newY, newZoom);
  }

  animatePanAndZoom(x: number, y: number, zoomEnd: number) {
    const pan = this.zoomer.getPan();
    const panEnd = { x, y };
    animate(pan, panEnd, (props) => {
      this.zoomer.pan({ x: props.x, y: props.y });
      if (props === panEnd) {
        const zoom = this.zoomer.getZoom();
        animate({ zoom }, { zoom: zoomEnd }, (props) => {
          this.zoomer.zoom(props.zoom);
        });
      }
    });
  }

  zoomIn() {
    this.zoomer.zoomIn();
  }

  zoomOut() {
    this.zoomer.zoomOut();
  }

  reset() {
    this.zoomer.reset();
  }

  destroy() {
    this.resizeObserver.disconnect();
    try {
      this.zoomer.destroy();
    } catch {
      // skip
    }
  }
}

function getParent(elem: SVGElement, className: string): SVGElement | null {
  while (elem && elem.tagName !== 'svg') {
    if (elem.classList.contains(className)) return elem;
    elem = elem.parentNode as SVGElement;
  }
  return null;
}

function isNode(elem: SVGElement): boolean {
  return getParent(elem, 'node') != null;
}

function isEdge(elem: SVGElement): boolean {
  return getParent(elem, 'edge') != null;
}

function isLink(elem: SVGElement): boolean {
  return elem.classList.contains('type-link');
}

function isEdgeSource(elem: SVGElement): boolean {
  return getParent(elem, 'edge-source') != null;
}

function isControl(elem: SVGElement) {
  if (!(elem instanceof SVGElement)) return false;
  return elem.className.baseVal.startsWith('svg-pan-zoom');
}

function edgeSource(edge: SVGElement): SVGElement {
  // @ts-expect-error FIXME: Consider for future fix
  return document.getElementById(edge['dataset']['from']);
}

function edgeTarget(edge: SVGElement): SVGElement {
  // @ts-expect-error FIXME: Consider for future fix
  return document.getElementById(edge['dataset']['to']);
}

function edgeFrom(id: string): SVGElement {
  // @ts-expect-error FIXME: Consider for future fix
  return document.querySelector(`.edge[data-from='${id}']`);
}

function edgesFromNode($node: SVGElement) {
  const edges = [];
  for (const $source of $node.querySelectorAll('.edge-source')) {
    const $edge = edgeFrom($source.id);
    edges.push($edge);
  }
  return edges;
}

function edgesTo(id: string): NodeListOf<SVGElement> {
  return document.querySelectorAll(`.edge[data-to='${id}']`);
}

function animate<OBJ extends { [key: string]: number }>(
  startObj: OBJ,
  endObj: OBJ,
  render: (obj: OBJ) => void,
) {
  const defaultDuration = 350;
  const fps60 = 1000 / 60;
  const totalFrames = defaultDuration / fps60;
  const startTime = new Date().getTime();

  window.requestAnimationFrame(ticker);

  function ticker() {
    const timeElapsed = new Date().getTime() - startTime;
    const framesElapsed = timeElapsed / fps60;

    if (totalFrames - framesElapsed < 1) {
      render(endObj);
      return;
    }

    const t = framesElapsed / totalFrames;

    const frame = Object.fromEntries(
      Object.keys(startObj).map((key) => {
        const start = startObj[key];
        const end = endObj[key];

        return [key, start + t * (end - start)];
      }),
    ) as OBJ;

    render(frame);

    window.requestAnimationFrame(ticker);
  }
}
