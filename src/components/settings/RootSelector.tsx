import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import { GraphQLNamedType } from 'graphql/type';

import { isNode, TypeGraph } from '../../graph/type-graph.ts';

interface RootSelectorProps {
  typeGraph: TypeGraph;
  onChange: (rootType: string) => void;
}

export default function RootSelector(props: RootSelectorProps) {
  const { typeGraph, onChange } = props;
  const { schema } = typeGraph;
  const rootType = typeGraph.rootType.name;

  const types = Object.values(schema.getTypeMap())
    .filter((type) => isNode(type) && !isOperationRootType(type))
    .sort((a, b) => a.name.localeCompare(b.name));

  const subscriptionRoot = schema.getSubscriptionType();
  if (subscriptionRoot) {
    types.unshift(subscriptionRoot);
  }

  const mutationRoot = schema.getMutationType();
  if (mutationRoot) {
    types.unshift(mutationRoot);
  }

  const queryRoot = schema.getQueryType();
  if (queryRoot) {
    types.unshift(queryRoot);
  }

  return (
    <Select
      fullWidth
      variant="standard"
      onChange={({ target }) => onChange(target.value)}
      value={rootType}
    >
      {types.map((type) => (
        <MenuItem value={type.name} key={type.name}>
          {isOperationRootType(type) ? <strong>{type.name}</strong> : type.name}
        </MenuItem>
      ))}
    </Select>
  );

  function isOperationRootType(type: GraphQLNamedType) {
    return (
      type === schema.getQueryType() ||
      type === schema.getMutationType() ||
      type === schema.getSubscriptionType()
    );
  }
}
