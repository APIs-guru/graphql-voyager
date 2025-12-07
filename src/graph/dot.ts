// eslint-disable-next-line import/no-unresolved
import { Edge, Graph, Node } from 'dotviz';
import {
  getNamedType,
  GraphQLField,
  GraphQLNamedType,
  isEnumType,
  isInputObjectType,
  isInterfaceType,
  isObjectType,
  isScalarType,
  isUnionType,
} from 'graphql/type';

import {
  mapDerivedTypes,
  mapFields,
  mapPossibleTypes,
  typeObjToId,
} from '../introspection/utils.ts';
import { stringifyTypeWrappers } from '../utils/stringify-type-wrappers.ts';
import { unreachable } from '../utils/unreachable.ts';
import { TypeGraph } from './type-graph.ts';

export function getDot(typeGraph: TypeGraph): Graph {
  const { schema } = typeGraph;

  const nodes: Array<Node> = [];
  const edges: Array<Edge> = [];
  for (const type of typeGraph.nodes.values()) {
    const fields = mapFields<string>(type, (id, field) => {
      const fieldType = getNamedType(field.type);
      if (isNode(fieldType)) {
        edges.push({
          tail: type.name,
          head: fieldType.name,
          attributes: {
            tailport: field.name,
            id: `${id} => ${typeObjToId(fieldType)}`,
            label: `${type.name}:${field.name}`,
          },
        });
        return fieldLabel(id, field);
      }
      return typeGraph.showLeafFields ? fieldLabel(id, field) : '';
    }).join('');

    const possibleTypes = mapPossibleTypes<string>(type, (id, possibleType) => {
      edges.push({
        tail: type.name,
        head: possibleType.name,
        attributes: {
          tailport: possibleType.name,
          id: `${id} => ${typeObjToId(possibleType)}`,
          style: 'dashed',
        },
      });
      return `
        <TR>
          <TD ${HtmlId(id)} ALIGN="LEFT" PORT="${possibleType.name}">${possibleType.name}</TD>
        </TR>
      `;
    }).join('');

    const derivedTypes = mapDerivedTypes<string>(
      schema,
      type,
      (id, derivedType) => {
        edges.push({
          tail: type.name,
          head: derivedType.name,
          attributes: {
            tailport: derivedType.name,
            id: `${id} => ${typeObjToId(derivedType)}`,
            style: 'dotted',
          },
        });
        return `
          <TR>
            <TD ${HtmlId(id)} ALIGN="LEFT" PORT="${derivedType.name}">${derivedType.name}</TD>
          </TR>
        `;
      },
    ).join('');

    const htmlID = HtmlId('TYPE_TITLE::' + type.name);
    const kindLabel = isObjectType(type)
      ? ''
      : '&lt;&lt;' + typeToKind(type).toLowerCase() + '&gt;&gt;';

    const html = `
      <TABLE ALIGN="LEFT" BORDER="0" CELLBORDER="1" CELLSPACING="0" CELLPADDING="5">
        <TR>
          <TD CELLPADDING="4" ${htmlID}><FONT POINT-SIZE="18">${type.name}</FONT><BR/>${kindLabel}</TD>
        </TR>
        ${fields}
        ${possibleTypes !== '' ? '<TR><TD>possible types</TD></TR>\n' + possibleTypes : ''}
        ${derivedTypes !== '' ? '<TR><TD>implementations</TD></TR>\n' + derivedTypes : ''}
      </TABLE>
    `;
    nodes.push({
      name: type.name,
      attributes: {
        id: typeObjToId(type),
        label: { html },
      },
    });
  }

  return {
    directed: true,
    graphAttributes: {
      rankdir: 'LR',
      ranksep: 2.0,
    },
    nodeAttributes: {
      fontsize: '16',
      fontname: 'helvetica',
      shape: 'plaintext',
    },
    nodes,
    edges,
  };

  function isNode(type: GraphQLNamedType): boolean {
    return typeGraph.nodes.has(type.name);
  }

  function fieldLabel(id: string, field: GraphQLField<any, any>): string {
    const namedType = getNamedType(field.type);
    const parts = stringifyTypeWrappers(field.type).map(TEXT);
    const relayIcon = field.extensions.isRelayField ? TEXT('{R}') : '';
    const deprecatedIcon = field.deprecationReason != null ? TEXT('{D}') : '';
    return `
      <TR>
        <TD ${HtmlId(id)} ALIGN="LEFT" PORT="${field.name}">
          <TABLE CELLPADDING="0" CELLSPACING="0" BORDER="0">
            <TR>
              <TD ALIGN="LEFT">${field.name}<FONT>  </FONT></TD>
              <TD ALIGN="RIGHT">${deprecatedIcon}${relayIcon}${parts[0]}${
                namedType.name
              }${parts[1]}</TD>
            </TR>
          </TABLE>
        </TD>
      </TR>
    `;
  }
}

function HtmlId(id: string) {
  return 'HREF="remove_me_url" ID="' + id + '"';
}

function TEXT(str: string) {
  if (str === '') return '';
  str = str.replace(/]/, '&#93;');
  return '<FONT>' + str + '</FONT>';
}

function typeToKind(type: GraphQLNamedType): string {
  if (isInterfaceType(type)) {
    return 'INTERFACE';
  }
  if (isObjectType(type)) {
    return 'OBJECT';
  }
  if (isScalarType(type)) {
    return 'SCALAR';
  }
  if (isUnionType(type)) {
    return 'UNION';
  }
  if (isEnumType(type)) {
    return 'UNION';
  }
  if (isInputObjectType(type)) {
    return 'INPUT_OBJECT';
  }
  unreachable(type);
}
