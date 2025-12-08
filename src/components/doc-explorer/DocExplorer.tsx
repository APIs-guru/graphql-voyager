import './DocExplorer.css';

import { type GraphQLNamedType } from 'graphql/type';
import { useCallback, useEffect, useState } from 'react';

import SearchBox from '../utils/SearchBox.tsx';
import { type NavStack } from '../Voyager.tsx';
import FocusTypeButton from './FocusTypeButton.tsx';
import OtherSearchResults from './OtherSearchResults.tsx';
import TypeDoc from './TypeDoc.tsx';
import TypeInfoPopover from './TypeInfoPopover.tsx';
import TypeList from './TypeList.tsx';

interface DocExplorerProps {
  navStack: NavStack | null;
  onNavigationBack: () => void;
  onSearch: (searchValue: string) => void;
  onFocusNode: (type: GraphQLNamedType) => void;
  onSelectNode: (type: GraphQLNamedType | null) => void;
  onSelectEdge: (
    edgeID: string,
    fromType: GraphQLNamedType,
    toType: GraphQLNamedType,
  ) => void;
}

const TYPE_LIST = 'Type List';

export default function DocExplorer(props: DocExplorerProps) {
  const {
    navStack,
    onNavigationBack,
    onSearch,
    onFocusNode,
    onSelectNode,
    onSelectEdge,
  } = props;

  const [typeForInfoPopover, setTypeForInfoPopover] =
    useState<GraphQLNamedType | null>(null);
  useEffect(() => setTypeForInfoPopover(null), [navStack]);

  const handleTypeLink = useCallback(
    (type: GraphQLNamedType) => {
      if (navStack?.typeGraph.nodes.has(type.name)) {
        onFocusNode(type);
        onSelectNode(type);
      } else {
        setTypeForInfoPopover(type);
      }
    },
    [navStack, onFocusNode, onSelectNode, setTypeForInfoPopover],
  );

  const handleSelectEdge = useCallback(
    (fieldID: string, fromType: GraphQLNamedType, toType: GraphQLNamedType) => {
      if (fromType !== navStack?.type) {
        onFocusNode(fromType);
      }
      onSelectEdge(fieldID, fromType, toType);
    },
    [navStack, onFocusNode, onSelectEdge],
  );

  const handleNavBack = useCallback(() => {
    const previousType = navStack?.prev?.type;
    if (previousType != null) {
      onFocusNode(previousType);
    }
    onNavigationBack();
  }, [navStack, onNavigationBack, onFocusNode]);

  if (navStack == null) {
    return (
      <div className="type-doc" key={0}>
        <span className="loading"> Loading... </span>
      </div>
    );
  }

  return (
    <div className="type-doc">
      {navStack.prev == null ? (
        <div className="doc-navigation">
          <span className="header">{TYPE_LIST}</span>
        </div>
      ) : (
        <div className="doc-navigation">
          <span className="back" onClick={handleNavBack}>
            {navStack.prev.type?.name ?? TYPE_LIST}
          </span>
          <span className="active" title={navStack.type.name}>
            {navStack.type.name}
            <FocusTypeButton onClick={() => onFocusNode(navStack.type)} />
          </span>
        </div>
      )}
      <SearchBox
        placeholder={`Search ${navStack.type?.name ?? 'Schema'}...`}
        value={navStack.searchValue}
        onSearch={onSearch}
      />
      <div className="scroll-area">
        {navStack.type == null ? (
          <TypeList
            typeGraph={navStack.typeGraph}
            filter={navStack.searchValue}
            onTypeLink={handleTypeLink}
            onFocusType={onFocusNode}
          />
        ) : (
          <TypeDoc
            selectedType={navStack.type}
            selectedEdgeID={navStack.selectedEdgeID}
            typeGraph={navStack.typeGraph}
            filter={navStack.searchValue}
            onTypeLink={handleTypeLink}
            onSelectEdge={handleSelectEdge}
          />
        )}
        <OtherSearchResults
          typeGraph={navStack.typeGraph}
          withinType={navStack.type}
          searchValue={navStack.searchValue}
          onTypeLink={handleTypeLink}
          onFieldLink={handleSelectEdge}
        />
      </div>
      {typeForInfoPopover && (
        <TypeInfoPopover
          type={typeForInfoPopover}
          onChange={setTypeForInfoPopover}
        />
      )}
    </div>
  );
}
