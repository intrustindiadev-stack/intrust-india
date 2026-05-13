export function scoreResult(result, query) {
  const q = query.toLowerCase();
  const name = (result.name || '').toLowerCase();
  
  if (name === q) return 4;
  if (name.startsWith(q)) return 3;
  if (name.includes(q)) return 2;
  
  const desc = (result.description || '').toLowerCase();
  if (desc.includes(q)) return 1;
  
  return 0;
}

export function rankAndSort(results, query) {
  const q = query.toLowerCase();
  return results
    .map(result => ({ ...result, _score: scoreResult(result, q) }))
    .filter(result => result._score > 0)
    .sort((a, b) => {
      if (b._score !== a._score) {
        return b._score - a._score;
      }
      return (a.name || '').localeCompare(b.name || '');
    })
    .map(({ _score, ...result }) => result);
}
