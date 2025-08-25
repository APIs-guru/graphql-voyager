import './TypeLink.css';

import {
  GraphQLNamedType,
  isInputObjectType,
  isScalarType,
  isSpecifiedScalarType,
} from 'graphql/type';

import { highlightTerm } from '../../utils/highlight.tsx';

interface TypeLinkProps {
  type: GraphQLNamedType;
  onClick: (type: GraphQLNamedType) => void;
  filter?: string | null;
}

export default function TypeLink(props: TypeLinkProps) {
  const { type, onClick, filter } = props;

  let className: string;
  if (isSpecifiedScalarType(type)) className = '-built-in';
  else if (isScalarType(type)) className = '-scalar';
  else if (isInputObjectType(type)) className = '-input-obj';
  else className = '-object';

  return (
    <a
      className={`type-name ${className}`}
      onClick={(event) => {
        event.stopPropagation();
        onClick(type);
      }}
    >
      {highlightTerm(type.name, filter)}
    </a>
  );
}
