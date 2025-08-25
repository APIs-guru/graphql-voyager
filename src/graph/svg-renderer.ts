// eslint-disable-next-line import/no-unresolved
import DeprecatedIconSvg from '../components/icons/deprecated-icon.svg?raw';
// eslint-disable-next-line import/no-unresolved
import RelayIconSvg from '../components/icons/relay-icon.svg?raw';
import { stringToSvg } from '../utils/dom-helpers.ts';
import { getDot } from './dot.ts';
import { VizWorker } from './graphviz-worker.ts';
import { TypeGraph } from './type-graph.ts';

const vizWorker = new VizWorker();

export async function renderSvg(typeGraph: TypeGraph) {
  const dot = getDot(typeGraph);
  const rawSVG = await vizWorker.renderString(dot);
  const svg = preprocessVizSVG(rawSVG);
  return svg;
}

const svgNS = 'http://www.w3.org/2000/svg';
const xlinkNS = 'http://www.w3.org/1999/xlink';

function preprocessVizSVG(svgString: string): string {
  const svg = stringToSvg(svgString);

  //Add Relay and Deprecated icons
  let defs = svg.querySelector('defs');
  if (!defs) {
    defs = document.createElementNS(svgNS, 'defs');
    svg.insertBefore(defs, svg.firstChild);
  }
  defs.appendChild(svgToSymbol(DeprecatedIconSvg, 'DeprecatedIcon'));
  defs.appendChild(svgToSymbol(RelayIconSvg, 'RelayIcon'));

  for (const $a of svg.querySelectorAll('a')) {
    const $g = $a.parentNode!;

    const $docFrag = document.createDocumentFragment();
    while ($a.firstChild) {
      const $child = $a.firstChild;
      $docFrag.appendChild($child);
    }

    $g.replaceChild($docFrag, $a);

    // @ts-expect-error We know for sure `id` is present here
    $g.id = $g.id.replace(/^a_/, '');
  }

  for (const $el of svg.querySelectorAll('title')) {
    $el.remove();
  }

  const edgesSources = new Set<string>();
  for (const $edge of svg.querySelectorAll('.edge')) {
    const [from, to] = $edge.id.split(' => ');
    $edge.removeAttribute('id');
    $edge.setAttribute('data-from', from);
    $edge.setAttribute('data-to', to);
    edgesSources.add(from);
  }

  for (const $el of svg.querySelectorAll('[id*=\\:\\:]')) {
    const [tag] = $el.id.split('::');
    $el.classList.add(tag.toLowerCase().replace(/_/, '-'));
  }

  for (const $path of svg.querySelectorAll('g.edge path')) {
    const $newPath = $path.cloneNode() as HTMLElement;
    $newPath.classList.add('hover-path');
    $newPath.removeAttribute('stroke-dasharray');
    $path.parentNode?.appendChild($newPath);
  }

  for (const $field of svg.querySelectorAll('.field')) {
    const texts = $field.querySelectorAll('text');
    texts[0].classList.add('field-name');
    //Remove spaces used for text alignment
    texts[1].remove();

    if (edgesSources.has($field.id)) $field.classList.add('edge-source');

    for (let i = 2; i < texts.length; ++i) {
      const str = texts[i].innerHTML;
      if (str === '{R}' || str == '{D}') {
        const $iconPlaceholder = texts[i];
        const height = 22;
        const width = 22;
        const $useIcon = document.createElementNS(svgNS, 'use');
        $useIcon.setAttributeNS(
          xlinkNS,
          'href',
          str === '{R}' ? '#RelayIcon' : '#DeprecatedIcon',
        );
        $useIcon.setAttribute('width', `${width}px`);
        $useIcon.setAttribute('height', `${height}px`);

        //FIXME: remove hardcoded offset
        const y = parseInt($iconPlaceholder.getAttribute('y')!) - 15;
        $useIcon.setAttribute('x', $iconPlaceholder.getAttribute('x')!);
        $useIcon.setAttribute('y', y.toString());
        $field.replaceChild($useIcon, $iconPlaceholder);
        continue;
      }

      texts[i].classList.add('field-type');
      if (edgesSources.has($field.id) && !/[[\]!]/.test(str))
        texts[i].classList.add('type-link');
    }
  }

  for (const $derivedType of svg.querySelectorAll('.derived-type')) {
    $derivedType.classList.add('edge-source');
    $derivedType.querySelector('text')?.classList.add('type-link');
  }

  for (const $possibleType of svg.querySelectorAll('.possible-type')) {
    $possibleType.classList.add('edge-source');
    $possibleType.querySelector('text')?.classList.add('type-link');
  }

  const serializer = new XMLSerializer();
  return serializer.serializeToString(svg);
}

function svgToSymbol(svg: string, id: string): SVGSymbolElement {
  const $svg = stringToSvg(svg);
  const $symbol = document.createElementNS(svgNS, 'symbol');

  // Transfer supported attributes <svg> to the <symbol>.
  const attributes = ['viewBox', 'height', 'width', 'preserveAspectRatio'];
  attributes.forEach(function (attr) {
    const value = $svg.getAttribute(attr);
    if (value != null) {
      $symbol.setAttribute(attr, value);
    }
  });
  $symbol.setAttribute('id', id);

  // Move all child nodes from <svg> to the <symbol>
  $symbol.append(...$svg.children);

  return $symbol;
}
