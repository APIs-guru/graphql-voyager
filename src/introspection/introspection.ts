import {
  getNamedType,
  getNullableType,
  GraphQLFieldConfig,
  GraphQLFieldConfigMap,
  GraphQLInputFieldConfig,
  GraphQLInputObjectType,
  GraphQLInterfaceType,
  GraphQLList,
  GraphQLNamedType,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLOutputType,
  GraphQLSchema,
  isInputObjectType,
  isInterfaceType,
  isNonNullType,
  isObjectType,
  lexicographicSortSchema,
} from 'graphql';

import { VoyagerDisplayOptions } from '../components/Voyager.tsx';
import { collectDirectlyReferencedTypes } from '../utils/collect-referenced-types.ts';
import { mapValues } from '../utils/mapValues.ts';
import { transformSchema } from '../utils/transformSchema.ts';

declare module 'graphql' {
  interface GraphQLFieldExtensions<_TSource, _TContext, _TArgs> {
    isRelayField?: boolean;
  }

  interface GraphQLObjectTypeExtensions<_TSource, _TContext> {
    isRelayType?: boolean;
  }

  interface GraphQLInterfaceTypeExtensions {
    isRelayType?: boolean;
  }
}

// https://graphql.org/learn/global-object-identification/
// https://relay.dev/graphql/connections.htm
function removeRelayTypes(schema: GraphQLSchema) {
  const nodeType = getNodeType();
  const pageInfoType = getPageInfoType();
  const relayTypes = new Set<GraphQLNamedType>();
  const relayTypeToNodeMap = new Map<GraphQLObjectType, GraphQLOutputType>();

  if (nodeType != null) {
    relayTypes.add(nodeType);
  }
  if (pageInfoType != null) {
    relayTypes.add(pageInfoType);
  }
  for (const type of Object.values(schema.getTypeMap())) {
    if (isInterfaceType(type) || isObjectType(type)) {
      for (const field of Object.values(type.getFields())) {
        const connectionType = getNamedType(field.type);

        if (
          !isObjectType(connectionType) ||
          !/.Connection$/.test(connectionType.name)
        ) {
          continue;
        }

        const connectionFields = connectionType.getFields();
        const edgeType = getNamedType(connectionFields['edges']?.type);
        if (!isObjectType(edgeType) || connectionFields['pageInfo'] == null) {
          continue;
        }

        const edgeFields = edgeType.getFields();
        const nodeType = edgeFields['node']?.type;
        if (nodeType == null || edgeFields['cursor'] == null) {
          continue;
        }

        relayTypes.add(connectionType);
        relayTypes.add(edgeType);
        relayTypeToNodeMap.set(connectionType, new GraphQLList(nodeType));
        // GitHub uses edge type in mutations
        relayTypeToNodeMap.set(edgeType, getNullableType(nodeType));
      }
    }
  }

  // Dry run changeType and collect all referenced types to eliminate unused Relay types
  const allReferenceTypes = new Set<GraphQLNamedType>();
  for (const oldType of Object.values(schema.getTypeMap())) {
    if (!relayTypes.has(oldType)) {
      const newType = changeType(oldType);
      collectDirectlyReferencedTypes(newType, allReferenceTypes);
    }
  }

  return (type: GraphQLNamedType) => {
    if (relayTypes.has(type) && !allReferenceTypes.has(type)) {
      return null;
    }
    return changeType(type);
  };

  function changeType(type: GraphQLNamedType) {
    if (isInterfaceType(type)) {
      const config = type.toConfig();
      return new GraphQLInterfaceType({
        ...config,
        ...type.toConfig(),
        fields: changeFields(type),
        interfaces: config.interfaces.filter((type) => type !== nodeType),
        extensions: {
          ...config.extensions,
          isRelayType: relayTypes.has(type),
        },
      });
    }
    if (isObjectType(type)) {
      const config = type.toConfig();
      return new GraphQLObjectType({
        ...config,
        fields: changeFields(type),
        interfaces: config.interfaces.filter((type) => type !== nodeType),
        extensions: {
          ...config.extensions,
          isRelayType: relayTypes.has(type),
        },
      });
    }
    return type;
  }

  function changeFields(
    type: GraphQLObjectType | GraphQLInterfaceType,
  ): GraphQLFieldConfigMap<any, any> {
    return mapValues(type.toConfig().fields, (field, fieldName) => {
      if (type === schema.getQueryType()) {
        switch (fieldName) {
          case 'relay':
            if (getNamedType(field.type) === type) {
              return null; // delete field
            }
            break;
          case 'node':
          // falls through since GitHub use `nodes` instead of `node`.
          case 'nodes':
            if (getNamedType(field.type) === nodeType) {
              return null; // delete field
            }
            break;
        }
      }

      const relayConnection = getNullableType(field.type);
      if (isObjectType(relayConnection)) {
        const relayNode = relayTypeToNodeMap.get(relayConnection);
        if (relayNode !== undefined) {
          return {
            ...field,
            type: isNonNullType(field.type)
              ? new GraphQLNonNull(relayNode)
              : relayNode,
            // FIXME: field from toConfig always has args
            args: mapValues(field.args ?? {}, (arg, argName) =>
              isRelayArgumentName(argName) ? null : arg,
            ),
            extensions: {
              ...field.extensions,
              isRelayField: true,
            },
          };
        }
      }

      return {
        ...field,
        extensions: {
          ...field.extensions,
          isRelayField: relayTypes.has(getNamedType(field.type)),
        },
      };
    });
  }

  function isRelayArgumentName(name: string) {
    switch (name) {
      case 'first':
      case 'last':
      case 'before':
      case 'after':
        return true;
      default:
        return false;
    }
  }

  function getNodeType(): GraphQLInterfaceType | null {
    const nodeType = schema.getType('Node');
    return isInterfaceType(nodeType) ? nodeType : null;
  }

  function getPageInfoType() {
    const pageInfo = schema.getType('PageInfo');
    return isObjectType(pageInfo) ? pageInfo : null;
  }
}

function removeDeprecated(type: GraphQLNamedType) {
  // We can't remove types that end up being empty because we cannot be sure that
  // the @deprecated directives where consistently added to the schema we're handling.
  //
  // Entities may have non deprecated fields pointing towards entities which are deprecated.

  if (isObjectType(type)) {
    const config = type.toConfig();
    return new GraphQLObjectType({
      ...config,
      fields: Object.fromEntries(
        Object.entries(config.fields).filter(notDeprecated),
      ),
    });
  }
  if (isInterfaceType(type)) {
    const config = type.toConfig();
    return new GraphQLInterfaceType({
      ...config,
      fields: Object.fromEntries(
        Object.entries(config.fields).filter(notDeprecated),
      ),
    });
  }
  if (isInputObjectType(type)) {
    const config = type.toConfig();
    return new GraphQLInputObjectType({
      ...config,
      fields: Object.fromEntries(
        Object.entries(config.fields).filter(notDeprecated),
      ),
    });
  }

  return type;

  function notDeprecated([, field]: [
    string,
    GraphQLFieldConfig<any, any> | GraphQLInputFieldConfig,
  ]) {
    return field.deprecationReason == null;
  }
}

export function getSchema(
  introspectionSchema: GraphQLSchema,
  displayOptions: VoyagerDisplayOptions,
): GraphQLSchema {
  const { sortByAlphabet, skipRelay, skipDeprecated } = displayOptions;
  let schema = introspectionSchema;

  if (sortByAlphabet) {
    schema = lexicographicSortSchema(schema);
  }

  const typeTransformers = [];
  if (skipRelay === true) {
    typeTransformers.push(removeRelayTypes(schema));
  }
  if (skipDeprecated === true) {
    typeTransformers.push(removeDeprecated);
  }

  return transformSchema(schema, typeTransformers);
}
