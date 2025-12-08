import { Fragment } from 'react';

export function highlightTerm(content: string, term: string) {
  if (term === '') {
    return content;
  }

  const re = new RegExp('(' + escapeRegExp(term) + ')', 'gi');
  return content.split(re).map(
    // Apply highlight to all odd elements
    (value, index) => (
      <Fragment key={index}>
        {index % 2 === 1 ? <mark>{value}</mark> : value}
      </Fragment>
    ),
  );
}

// http://ecma-international.org/ecma-262/7.0/#sec-patterns).
const reRegExpChar = /[\\^$.*+?()[\]{}|]/g;
function escapeRegExp(string: string) {
  return string.replace(reRegExpChar, '\\$&');
}
