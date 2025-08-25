import {
  assertNamedType,
  GraphQLDirective,
  GraphQLEnumType,
  GraphQLFieldConfigArgumentMap,
  GraphQLFieldConfigMap,
  GraphQLInputFieldConfigMap,
  GraphQLInputObjectType,
  GraphQLInterfaceType,
  GraphQLList,
  GraphQLNamedType,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLType,
  GraphQLUnionType,
  isEnumType,
  isInputObjectType,
  isInterfaceType,
  isIntrospectionType,
  isListType,
  isNonNullType,
  isObjectType,
  isSpecifiedScalarType,
  isUnionType,
} from 'graphql/type';

import { mapValues } from './mapValues.ts';

// FIXME: Contribute to graphql-js
export type NamedTypeTransformer = (
  type: GraphQLNamedType,
) => GraphQLNamedType | null;

export type DirectiveTransformer = (
  directive: GraphQLDirective,
) => GraphQLDirective | null;

export function transformSchema(
  schema: GraphQLSchema,
  namedTypeTransformers: ReadonlyArray<NamedTypeTransformer>,
  directiveTransformers: ReadonlyArray<DirectiveTransformer> = [],
): GraphQLSchema {
  const schemaConfig = schema.toConfig();

  const typeMap = new Map<string, GraphQLNamedType>();
  for (const oldType of schemaConfig.types) {
    const newType = transformNamedType(oldType);
    if (newType != null) {
      typeMap.set(newType.name, newType);
    }
  }

  const directives = [];
  for (const oldDirective of schemaConfig.directives) {
    const newDirective = transformDirective(oldDirective);
    if (newDirective != null) {
      directives.push(newDirective);
    }
  }

  return new GraphQLSchema({
    ...schemaConfig,
    types: Array.from(typeMap.values()),
    directives,
    query: replaceMaybeType(schemaConfig.query),
    mutation: replaceMaybeType(schemaConfig.mutation),
    subscription: replaceMaybeType(schemaConfig.subscription),
  });

  function transformDirective(
    oldDirective: GraphQLDirective,
  ): GraphQLDirective | null {
    let newDirective = oldDirective;
    for (const fn of directiveTransformers) {
      const resultDirective = fn(newDirective);
      if (resultDirective === null) {
        return null;
      }
      newDirective = resultDirective;
    }

    const config = newDirective.toConfig();
    return new GraphQLDirective({
      ...config,
      args: transformArgs(config.args),
    });
  }

  function transformNamedType(
    oldType: GraphQLNamedType,
  ): GraphQLNamedType | null {
    if (isIntrospectionType(oldType) || isSpecifiedScalarType(oldType)) {
      return oldType;
    }

    let newType = oldType;
    for (const fn of namedTypeTransformers) {
      const resultType = fn(newType);
      if (resultType === null) {
        return null;
      }
      newType = resultType;
    }

    if (isObjectType(newType)) {
      const config = newType.toConfig();
      return new GraphQLObjectType({
        ...config,
        interfaces: () => replaceTypes(config.interfaces),
        fields: () => transformFields(config.fields),
      });
    }
    if (isInterfaceType(newType)) {
      const config = newType.toConfig();
      return new GraphQLInterfaceType({
        ...config,
        interfaces: () => replaceTypes(config.interfaces),
        fields: () => transformFields(config.fields),
      });
    }
    if (isUnionType(newType)) {
      const config = newType.toConfig();
      return new GraphQLUnionType({
        ...config,
        types: () => replaceTypes(config.types),
      });
    }
    if (isEnumType(newType)) {
      const config = newType.toConfig();
      return new GraphQLEnumType({ ...config });
    }
    if (isInputObjectType(newType)) {
      const config = newType.toConfig();
      return new GraphQLInputObjectType({
        ...config,
        fields: () => transformInputFields(config.fields),
      });
    }
    return newType;
  }

  function replaceType<T extends GraphQLType>(type: T): T {
    if (isListType(type)) {
      // @ts-expect-error Type mismatch
      return new GraphQLList(replaceType(type.ofType));
    } else if (isNonNullType(type)) {
      // @ts-expect-error Type mismatch
      return new GraphQLNonNull(replaceType(type.ofType));
    }
    // @ts-expect-error Type mismatch
    return assertNamedType(replaceNamedType(type));
  }

  function replaceMaybeType<T extends GraphQLNamedType>(
    maybeType: T | null | undefined,
  ): T | null | undefined {
    return maybeType && (replaceNamedType(maybeType) as T);
  }

  function replaceTypes<T extends GraphQLNamedType>(
    array: ReadonlyArray<T>,
  ): Array<T> {
    const result = [];

    for (const oldType of array) {
      const newType = replaceNamedType(oldType);
      if (newType != null) {
        result.push(newType);
      }
    }
    return result as Array<T>;
  }

  function replaceNamedType(
    type: GraphQLNamedType,
  ): GraphQLNamedType | undefined {
    return typeMap.get(type.name);
  }

  function transformArgs(args: GraphQLFieldConfigArgumentMap) {
    return mapValues(args, (arg) => ({
      ...arg,
      type: replaceType(arg.type),
    }));
  }

  function transformFields(fieldsMap: GraphQLFieldConfigMap<unknown, unknown>) {
    return mapValues(fieldsMap, (field) => ({
      ...field,
      type: replaceType(field.type),
      args: field.args && transformArgs(field.args),
    }));
  }

  function transformInputFields(fieldsMap: GraphQLInputFieldConfigMap) {
    return mapValues(fieldsMap, (field) => ({
      ...field,
      type: replaceType(field.type),
    }));
  }
}
