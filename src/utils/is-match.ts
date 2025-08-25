export function isMatch(sourceText: string, searchValue: string | null) {
  if (!searchValue) {
    return true;
  }

  try {
    const escaped = searchValue.replace(/[^_0-9A-Za-z]/g, (ch) => '\\' + ch);
    return sourceText.search(new RegExp(escaped, 'i')) !== -1;
  } catch {
    return sourceText.toLowerCase().includes(searchValue.toLowerCase());
  }
}
