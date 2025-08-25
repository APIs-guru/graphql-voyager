import {
  GraphQLType,
  isListType,
  isNamedType,
  isNonNullType,
} from 'graphql/type';

import { unreachable } from './unreachable.ts';

export function stringifyTypeWrappers(type: GraphQLType): [string, string] {
  if (isNamedType(type)) {
    return ['', ''];
  }

  const [left, right] = stringifyTypeWrappers(type.ofType);
  if (isNonNullType(type)) {
    return [left, right + '!'];
  }
  if (isListType(type)) {
    return ['[' + left, right + ']'];
  }
  unreachable(type);
}
