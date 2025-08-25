import { GraphQLNamedType } from 'graphql/type';

import { TypeGraph } from '../../graph/type-graph.ts';
import { mapFields } from '../../introspection/utils.ts';
import { highlightTerm } from '../../utils/highlight.tsx';
import { isMatch } from '../../utils/is-match.ts';

interface OtherSearchResultsProps {
  typeGraph: TypeGraph;
  withinType: GraphQLNamedType | null;
  searchValue: string;
  onTypeLink: (type: GraphQLNamedType) => void;
  onFieldLink: (type: GraphQLNamedType, fieldID: string) => void;
}

export default function OtherSearchResults(props: OtherSearchResultsProps) {
  const { typeGraph, withinType, searchValue, onTypeLink, onFieldLink } = props;

  const types = Array.from(typeGraph.nodes.values()).filter(
    (type) => type !== withinType,
  );

  const matchedTypes = [];
  if (withinType != null) {
    for (const type of types) {
      if (isMatch(type.name, searchValue)) {
        matchedTypes.push(
          <div
            className="item"
            key={type.name}
            onClick={() => onTypeLink(type)}
          >
            <span className="type-name">
              {highlightTerm(type.name, searchValue)}
            </span>
          </div>,
        );
      }
    }
  }

  const matchedFields = [];
  for (const type of types) {
    if (matchedFields.length >= 100) {
      break;
    }

    matchedFields.push(
      ...mapFields(type, (fieldID, field) => {
        const matchingArgs = Object.values(field.args).filter((arg) =>
          isMatch(arg.name, searchValue),
        );

        if (!isMatch(field.name, searchValue) && matchingArgs.length === 0) {
          return null;
        }

        return (
          <div
            className="item"
            key={fieldID}
            onClick={() => onFieldLink(type, fieldID)}
          >
            <span className="type-name">{type.name}</span>
            <span className="field-name">
              {highlightTerm(field.name, searchValue)}
            </span>
            {matchingArgs.length > 0 && (
              <span className="args args-wrap">
                {matchingArgs.map((arg) => (
                  <span key={arg.name} className="arg-wrap">
                    <span className="arg arg-name">
                      {highlightTerm(arg.name, searchValue)}
                    </span>
                  </span>
                ))}
              </span>
            )}
          </div>
        );
      }),
    );
  }

  return (
    <div className="other-search-results doc-category">
      <div className="title">other results</div>
      {matchedTypes.length + matchedFields.length === 0 ? (
        <div className="doc-alert-text -search">No results found.</div>
      ) : (
        <>
          {matchedTypes}
          {matchedFields}
        </>
      )}
    </div>
  );
}
