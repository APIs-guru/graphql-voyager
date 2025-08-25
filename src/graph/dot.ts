import {
  getNamedType,
  GraphQLField,
  GraphQLNamedType,
  GraphQLObjectType,
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

export function getDot(typeGraph: TypeGraph): string {
  const { schema } = typeGraph;

  const nodeResults = [];
  for (const node of typeGraph.nodes.values()) {
    nodeResults.push(printNode(node));
  }

  return `
    digraph {
      graph [
        rankdir = "LR"
      ];
      node [
        fontsize = "16"
        fontname = "helvetica"
        shape = "plaintext"
      ];
      edge [
      ];
      ranksep = 2.0
      ${nodeResults.join('\n')}
    }
  `;

  function printNode(node: GraphQLNamedType) {
    return `
      "${node.name}" [
        id = "${typeObjToId(node)}"
        label = ${nodeLabel(node)}
      ]
      ${forEachField((id, field) => {
        if (!isNode(getNamedType(field.type))) {
          return null;
        }
        return `
            "${node.name}":"${field.name}" -> "${
              getNamedType(field.type).name
            }" [
              id = "${id} => ${typeObjToId(getNamedType(field.type))}"
              label = "${node.name}:${field.name}"
            ]
          `;
      })};
      ${forEachPossibleTypes(
        (id, type) => `
        "${node.name}":"${type.name}" -> "${type.name}" [
          id = "${id} => ${typeObjToId(type)}"
          style = "dashed"
        ]
      `,
      )}
      ${forEachDerivedTypes(
        (id, type) => `
        "${node.name}":"${type.name}" -> "${type.name}" [
          id = "${id} => ${typeObjToId(type)}"
          style = "dotted"
        ]
      `,
      )}
    `;

    function nodeLabel(node: GraphQLNamedType): string {
      const htmlID = HtmlId('TYPE_TITLE::' + node.name);
      const kindLabel = isObjectType(node)
        ? ''
        : '&lt;&lt;' + typeToKind(node).toLowerCase() + '&gt;&gt;';

      return `
        <<TABLE ALIGN="LEFT" BORDER="0" CELLBORDER="1" CELLSPACING="0" CELLPADDING="5">
          <TR>
            <TD CELLPADDING="4" ${htmlID}><FONT POINT-SIZE="18">${
              node.name
            }</FONT><BR/>${kindLabel}</TD>
          </TR>
          ${nodeFields()}
          ${possibleTypes()}
          ${derivedTypes()}
        </TABLE>>
      `;
    }

    function isNode(type: GraphQLNamedType): boolean {
      return typeGraph.nodes.has(type.name);
    }

    function nodeFields() {
      return forEachField((id, field) => {
        const namedType = getNamedType(field.type);
        if (typeGraph.showLeafFields !== true && !isNode(namedType)) {
          return null;
        }

        const parts = stringifyTypeWrappers(field.type).map(TEXT);
        const relayIcon = field.extensions.isRelayField ? TEXT('{R}') : '';
        const deprecatedIcon =
          field.deprecationReason != null ? TEXT('{D}') : '';
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
      });
    }

    function possibleTypes() {
      const possibleTypes = forEachPossibleTypes(
        (id, { name }) => `
        <TR>
          <TD ${HtmlId(id)} ALIGN="LEFT" PORT="${name}">${name}</TD>
        </TR>
      `,
      );

      if (possibleTypes === '') {
        return '';
      }

      return `
        <TR>
          <TD>possible types</TD>
        </TR>
        ${possibleTypes}
      `;
    }

    function derivedTypes() {
      const implementations = forEachDerivedTypes(
        (id, { name }) => `
          <TR>
            <TD ${HtmlId(id)} ALIGN="LEFT" PORT="${name}">${name}</TD>
          </TR>
        `,
      );

      if (implementations === '') {
        return '';
      }

      return `
        <TR>
          <TD>implementations</TD>
        </TR>
        ${implementations}
      `;
    }

    function forEachField(
      stringify: (id: string, field: GraphQLField<any, any>) => string | null,
    ): string {
      return mapFields(node, stringify).join('\n');
    }

    function forEachPossibleTypes(
      stringify: (id: string, type: GraphQLObjectType) => string | null,
    ): string {
      return mapPossibleTypes(node, stringify).join('\n');
    }

    function forEachDerivedTypes(
      stringify: (id: string, type: GraphQLNamedType) => string | null,
    ) {
      return mapDerivedTypes(schema, node, stringify).join('\n');
    }
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
