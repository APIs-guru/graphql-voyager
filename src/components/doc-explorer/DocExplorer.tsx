import './DocExplorer.css';

import { assertCompositeType, GraphQLNamedType } from 'graphql/type';
import { Component } from 'react';

import { isNode, TypeGraph } from '../../graph/type-graph.ts';
import { extractTypeName, typeObjToId } from '../../introspection/utils.ts';
import SearchBox from '../utils/SearchBox.tsx';
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
  onSelectNode: (id: string | null) => void;
  onSelectEdge: (id: string | null) => void;
}

interface NavStackItem {
  title: string;
  type: GraphQLNamedType | null;
  searchValue: string | null;
}

interface DocExplorerState {
  navStack: ReadonlyArray<NavStackItem>;
  typeForInfoPopover: GraphQLNamedType | null;
}

const initialNav: NavStackItem = {
  title: 'Type List',
  type: null,
  searchValue: null,
};

export default class DocExplorer extends Component<
  DocExplorerProps,
  DocExplorerState
> {
  state: DocExplorerState = {
    navStack: [initialNav],
    typeForInfoPopover: null,
  };

  static getDerivedStateFromProps(
    props: DocExplorerProps,
    state: DocExplorerState,
  ): DocExplorerState | null {
    const { selectedTypeID, typeGraph } = props;

    const { navStack } = state;
    const lastNav = navStack[navStack.length - 1];
    const type =
      selectedTypeID != null && typeGraph != null
        ? assertCompositeType(
            typeGraph.nodes.get(extractTypeName(selectedTypeID)),
          )
        : null;

    if (type !== lastNav.type) {
      if (type == null) {
        return { navStack: [initialNav], typeForInfoPopover: null };
      }

      const newNavStack = [
        ...navStack,
        { title: type.name, type, searchValue: null },
      ];

      return { navStack: newNavStack, typeForInfoPopover: null };
    }

    return null;
  }

  render() {
    const { navStack } = this.state;
    const previousNav = navStack.at(-2);
    const currentNav = navStack.at(-1);

    if (this.props.typeGraph == null || currentNav == null) {
      return (
        <div className="type-doc" key={0}>
          <span className="loading"> Loading... </span>
        </div>
      );
    }

    const { typeGraph, selectedEdgeID, onFocusNode, onSelectEdge } = this.props;

    const name = currentNav.type ? currentNav.type.name : 'Schema';

    const handleTypeLink = (type: GraphQLNamedType) => {
      const { onFocusNode, onSelectNode } = this.props;

      if (isNode(type)) {
        onFocusNode(typeObjToId(type));
        onSelectNode(typeObjToId(type));
      } else {
        this.setState({ typeForInfoPopover: type });
      }
    };

    const handleFieldLink = (type: GraphQLNamedType, fieldID: string) => {
      const { onFocusNode, onSelectNode, onSelectEdge } = this.props;

      onFocusNode(typeObjToId(type));
      onSelectNode(typeObjToId(type));
      // wait for docs panel to rerender with new edges
      setTimeout(() => onSelectEdge(fieldID));
    };

    const handleNavBackClick = () => {
      const { onFocusNode, onSelectNode } = this.props;
      const newNavStack = this.state.navStack.slice(0, -1);
      const newCurrentNode = newNavStack[newNavStack.length - 1];

      this.setState({ navStack: newNavStack, typeForInfoPopover: null });

      if (newCurrentNode.type == null) {
        return onSelectNode(null);
      }

      onFocusNode(typeObjToId(newCurrentNode.type));
      onSelectNode(typeObjToId(newCurrentNode.type));
    };

    return (
      <div className="type-doc" key={navStack.length}>
        {renderNavigation(previousNav, currentNav)}
        <SearchBox
          placeholder={`Search ${name}...`}
          value={currentNav.searchValue}
          onSearch={this.handleSearch}
        />
        <div className="scroll-area">
          {renderCurrentNav(currentNav)}
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
        {this.state.typeForInfoPopover && (
          <TypeInfoPopover
            type={this.state.typeForInfoPopover}
            onChange={(type) => this.setState({ typeForInfoPopover: type })}
          />
        )}
      </div>
    );

    function renderCurrentNav(currentNav: NavStackItem) {
      if (currentNav.type) {
        return (
          <TypeDoc
            selectedType={currentNav.type}
            selectedEdgeID={selectedEdgeID}
            typeGraph={typeGraph}
            filter={currentNav.searchValue}
            onTypeLink={handleTypeLink}
            onSelectEdge={onSelectEdge}
          />
        );
      }

      return (
        <TypeList
          typeGraph={typeGraph}
          filter={currentNav.searchValue}
          onTypeLink={handleTypeLink}
          onFocusType={(type) => onFocusNode(typeObjToId(type))}
        />
      );
    }

    function renderNavigation(
      previousNav: NavStackItem | undefined,
      currentNav: NavStackItem,
    ) {
      const { title, type } = currentNav;

      if (previousNav && type) {
        return (
          <div className="doc-navigation">
            <span className="back" onClick={handleNavBackClick}>
              {previousNav.title}
            </span>
            <span className="active" title={title}>
              {title}
              <FocusTypeButton onClick={() => onFocusNode(typeObjToId(type))} />
            </span>
          </div>
        );
      }

      return (
        <div className="doc-navigation">
          <span className="header">{title}</span>
        </div>
      );
    }
  }

  handleSearch = (value: string) => {
    const navStack = this.state.navStack.slice();
    const currentNav = navStack[navStack.length - 1];
    navStack[navStack.length - 1] = { ...currentNav, searchValue: value };
    this.setState({ navStack });
  };
}
