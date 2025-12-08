import './TypeDoc.css';

import { getNamedType, GraphQLField, GraphQLNamedType } from 'graphql/type';
import React, { Component, ReactElement } from 'react';

import { TypeGraph } from '../../graph/type-graph.ts';
import {
  mapDerivedTypes,
  mapFields,
  mapInterfaces,
  mapPossibleTypes,
} from '../../introspection/utils.ts';
import { highlightTerm } from '../../utils/highlight.tsx';
import { isMatch } from '../../utils/is-match.ts';
import Markdown from '../utils/Markdown.tsx';
import Argument from './Argument.tsx';
import Description from './Description.tsx';
import TypeLink from './TypeLink.tsx';
import WrappedTypeName from './WrappedTypeName.tsx';

interface TypeDocProps {
  selectedType: GraphQLNamedType;
  selectedEdgeID: string | null;
  typeGraph: TypeGraph;
  filter: string;
  onSelectEdge: (
    edgeID: string,
    fromType: GraphQLNamedType,
    toType: GraphQLNamedType,
  ) => void;
  onTypeLink: (type: GraphQLNamedType) => void;
}

export default class TypeDoc extends Component<TypeDocProps> {
  private selectedItemRef = React.createRef<HTMLDivElement>();

  componentDidUpdate(prevProps: TypeDocProps) {
    if (this.props.selectedEdgeID !== prevProps.selectedEdgeID) {
      this.ensureActiveVisible();
    }
  }

  componentDidMount() {
    this.ensureActiveVisible();
  }

  ensureActiveVisible() {
    const itemComponent = this.selectedItemRef.current;
    if (!itemComponent) return;

    itemComponent.scrollIntoView();
  }

  render() {
    const {
      selectedType,
      selectedEdgeID,
      typeGraph,
      filter,
      onSelectEdge,
      onTypeLink,
    } = this.props;
    const { selectedItemRef } = this;

    return (
      <>
        <Description className="-doc-type" text={selectedType.description} />
        {renderDocCategory(
          'possible types',
          mapPossibleTypes(selectedType, renderTypesDef),
        )}
        {renderDocCategory(
          'implementations',
          mapDerivedTypes(typeGraph.schema, selectedType, renderTypesDef),
        )}
        {renderDocCategory(
          'implements',
          mapInterfaces(selectedType, renderTypesDef),
        )}
        {renderDocCategory('fields', mapFields(selectedType, renderField))}
      </>
    );

    function renderDocCategory(title: string, items: Array<ReactElement>) {
      if (items.length === 0) return null;

      return (
        <div className="doc-category">
          <div className="title">{title}</div>
          {items}
        </div>
      );
    }

    function renderTypesDef(id: string, type: GraphQLNamedType) {
      if (!isMatch(type.name, filter)) {
        return null;
      }

      const isSelected = id === selectedEdgeID;
      const className = `item ${isSelected ? '-selected' : ''}`;
      return (
        <div
          key={type.name}
          className={className}
          onClick={() => onSelectEdge(id, selectedType, type)}
          ref={isSelected ? selectedItemRef : undefined}
        >
          <TypeLink type={type} onClick={onTypeLink} filter={filter} />
          <Description text={type.description} className="-linked-type" />
        </div>
      );
    }

    function isMatchingField(field: GraphQLField<any, any>): boolean {
      const matchingArgs = field.args.filter((arg) =>
        isMatch(arg.name, filter),
      );

      return isMatch(field.name, filter) || matchingArgs.length > 0;
    }

    function renderField(fieldID: string, field: GraphQLField<any, any>) {
      if (!isMatchingField(field)) {
        return null;
      }

      const hasArgs = field.args.length !== 0;
      const isSelected = fieldID === selectedEdgeID;

      const className = `item ${isSelected ? '-selected' : ''} ${
        hasArgs ? '-with-args' : ''
      }`;
      return (
        <div
          key={field.name}
          className={className}
          onClick={() =>
            onSelectEdge(fieldID, selectedType, getNamedType(field.type))
          }
          ref={isSelected ? selectedItemRef : undefined}
        >
          <a className="field-name">{highlightTerm(field.name, filter)}</a>
          <span className={`args-wrap ${hasArgs ? '' : '-empty'}`}>
            {hasArgs && (
              <span key="args" className="args">
                {field.args.map((arg) => (
                  <Argument
                    key={arg.name}
                    arg={arg}
                    filter={filter}
                    expanded={isSelected}
                    onTypeLink={onTypeLink}
                  />
                ))}
              </span>
            )}
          </span>
          <WrappedTypeName container={field} onTypeLink={onTypeLink} />
          {field.deprecationReason && (
            <span className="doc-alert-text"> DEPRECATED </span>
          )}
          <Markdown
            text={field.description}
            className="description-box -field"
          />
        </div>
      );
    }
  }
}
