import './TypeList.css';

import { GraphQLNamedType } from 'graphql/type';

import { TypeGraph } from '../../graph/type-graph.ts';
import { isMatch } from '../../utils/is-match.ts';
import Description from './Description.tsx';
import FocusTypeButton from './FocusTypeButton.tsx';
import TypeLink from './TypeLink.tsx';

interface TypeListProps {
  typeGraph: TypeGraph;
  filter: string | null;
  onFocusType: (type: GraphQLNamedType) => void;
  onTypeLink: (type: GraphQLNamedType) => void;
}

export default function TypeList(props: TypeListProps) {
  const { typeGraph, filter, onFocusType, onTypeLink } = props;

  const types = Array.from(typeGraph.nodes.values()).filter((type) =>
    isMatch(type.name, filter),
  );

  // sort alphabetically but root is always be first
  types.sort((a, b) => (isRoot(b) ? 1 : a.name.localeCompare(b.name)));

  return (
    <div className="doc-explorer-type-list">
      {types.map((type) => {
        const className = isRoot(type)
          ? 'typelist-item -root'
          : 'typelist-item';

        return (
          <div key={type.name} className={className}>
            <TypeLink type={type} onClick={onTypeLink} filter={filter} />
            <FocusTypeButton onClick={() => onFocusType(type)} />
            <Description className="-doc-type" text={type.description} />
          </div>
        );
      })}
    </div>
  );

  function isRoot(type: GraphQLNamedType) {
    return type === typeGraph.rootType;
  }
}
