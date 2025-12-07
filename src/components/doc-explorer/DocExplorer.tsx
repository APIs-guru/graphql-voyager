import './DocExplorer.css';

import { assertCompositeType, GraphQLNamedType } from 'graphql/type';
import { useCallback, useEffect, useState } from 'react';

import { isNode, TypeGraph } from '../../graph/type-graph.ts';
import {
  extractTypeName,
  typeNameToId,
  typeObjToId,
} from '../../introspection/utils.ts';
import SearchBox from '../utils/SearchBox.tsx';
import type { GraphSelection } from '../Voyager.tsx';
import FocusTypeButton from './FocusTypeButton.tsx';
import OtherSearchResults from './OtherSearchResults.tsx';
import TypeDoc from './TypeDoc.tsx';
import TypeInfoPopover from './TypeInfoPopover.tsx';
import TypeList from './TypeList.tsx';

interface DocExplorerProps {
  typeGraph: TypeGraph | null;
  selectedTypeID: string | null;
  selectedEdgeID: string | null;

  onFocusNode: (id: string) => void;
  onSelect: (selection: GraphSelection) => void;
}

interface NavStackItem {
  title: string;
  type: GraphQLNamedType | null;
  searchValue: string | null;
}

export default function DocExplorer(props: DocExplorerProps) {
  const { typeGraph, selectedTypeID, selectedEdgeID, onFocusNode, onSelect } =
    props;
  const [navStack, setNavStack] = useState<ReadonlyArray<NavStackItem>>([]);
  useEffect(() => {
    setNavStack((prev) => {
      if (typeGraph == null) {
        return [];
      }

      const last = prev.at(-1);
      if (last == null || selectedTypeID == null) {
        return [{ title: 'Type List', type: null, searchValue: null }];
      }

      // FIXME: hack to prevent crash
      const maybeType = typeGraph.nodes.get(extractTypeName(selectedTypeID));
      if (maybeType == null) {
        return [];
      }

      const selectedType = assertCompositeType(maybeType);
      if (selectedType === last.type) {
        return prev;
      }

      return [
        ...prev,
        {
          title: selectedType.name,
          type: selectedType,
          searchValue: null,
        },
      ];
    });
  }, [typeGraph, selectedTypeID]);

  const [typeForInfoPopover, setTypeForInfoPopover] =
    useState<GraphQLNamedType | null>(null);
  useEffect(() => setTypeForInfoPopover(null), [navStack, selectedEdgeID]);

  const handleTypeLink = useCallback(
    (type: GraphQLNamedType) => {
      if (isNode(type)) {
        const id = typeObjToId(type);
        onFocusNode(id);
        onSelect({ typeID: id, edgeID: null });
      } else {
        setTypeForInfoPopover(type);
      }
    },
    [onFocusNode, onSelect],
  );

  const handleFieldLink = useCallback(
    (type: GraphQLNamedType, fieldID: string) => {
      const id = typeObjToId(type);
      onFocusNode(id);
      onSelect({ typeID: id, edgeID: fieldID });
    },
    [onFocusNode, onSelect],
  );

  const handleNavBackClick = useCallback(() => {
    const newSelectedType = navStack.at(-2)?.type;

    setNavStack((prev) => prev.slice(0, -1));
    if (newSelectedType == null) {
      onSelect({ typeID: null, edgeID: null });
    } else {
      const id = typeObjToId(newSelectedType);
      onFocusNode(id);
      onSelect({ typeID: id, edgeID: null });
    }
  }, [navStack, onFocusNode, onSelect]);

  const onSelectEdge = useCallback(
    (edgeID: string) =>
      onSelect({ typeID: typeNameToId(extractTypeName(edgeID)), edgeID }),
    [onSelect],
  );

  const handleSearch = useCallback((value: string) => {
    setNavStack((prev) => {
      const last = prev.at(-1);
      return last == null
        ? prev
        : [...prev.slice(0, -1), { ...last, searchValue: value }];
    });
  }, []);

  const previousNav = navStack.at(-2);
  const currentNav = navStack.at(-1);

  if (typeGraph == null || currentNav == null) {
    return (
      <div className="type-doc" key={0}>
        <span className="loading"> Loading... </span>
      </div>
    );
  }

  const name = currentNav.type ? currentNav.type.name : 'Schema';

  return (
    <div className="type-doc" key={navStack.length}>
      {renderNavigation(previousNav, currentNav)}
      <SearchBox
        placeholder={`Search ${name}...`}
        value={currentNav.searchValue}
        onSearch={handleSearch}
      />
      <div className="scroll-area">
        {renderCurrentNav(typeGraph, currentNav)}
        {currentNav.searchValue && (
          <OtherSearchResults
            typeGraph={typeGraph}
            withinType={currentNav.type}
            searchValue={currentNav.searchValue}
            onTypeLink={handleTypeLink}
            onFieldLink={handleFieldLink}
          />
        )}
      </div>
      {typeForInfoPopover && (
        <TypeInfoPopover
          type={typeForInfoPopover}
          onChange={(type) => setTypeForInfoPopover(type)}
        />
      )}
    </div>
  );

  function renderCurrentNav(typeGraph: TypeGraph, current: NavStackItem) {
    if (current.type) {
      return (
        <TypeDoc
          selectedType={current.type}
          selectedEdgeID={selectedEdgeID}
          typeGraph={typeGraph}
          filter={current.searchValue}
          onTypeLink={handleTypeLink}
          onSelectEdge={onSelectEdge}
        />
      );
    }

    return (
      <TypeList
        typeGraph={typeGraph}
        filter={current.searchValue}
        onTypeLink={handleTypeLink}
        onFocusType={(type) => onFocusNode(typeObjToId(type))}
      />
    );
  }

  function renderNavigation(
    prev: NavStackItem | undefined,
    current: NavStackItem,
  ) {
    const { title, type } = current;

    if (prev == null || type == null) {
      return (
        <div className="doc-navigation">
          <span className="header">{title}</span>
        </div>
      );
    }
    return (
      <div className="doc-navigation">
        <span className="back" onClick={handleNavBackClick}>
          {prev.title}
        </span>
        <span className="active" title={title}>
          {title}
          <FocusTypeButton onClick={() => onFocusNode(typeObjToId(type))} />
        </span>
      </div>
    );
  }
}
