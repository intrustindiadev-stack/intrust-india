export function scoreResult(result, query) {
  const q = query.toLowerCase().trim();
  if (!q) return 0;
  
  const name = (result.name || '').toLowerCase();
  const desc = (result.description || '').toLowerCase();
  const cat = (result.category || '').toLowerCase();

  let score = 0;

  // Exact full match
  if (name === q) return 100;
  
  // Starts with query
  if (name.startsWith(q)) score += 50;
  
  // Contains full query phrase
  else if (name.includes(q)) score += 30;

  // Split query into tokens for multi-word queries
  const tokens = q.split(/\s+/).filter(t => t.length > 0);
  if (tokens.length > 1) {
    let matchedTokens = 0;
    for (const token of tokens) {
      if (name.includes(token)) {
        score += 15;
        matchedTokens++;
      } else if (desc.includes(token)) {
        score += 5;
        matchedTokens++;
      }
    }
    // Bonus if all tokens match
    if (matchedTokens >= tokens.length) {
      score += 25;
    }
  }

  // Category matching
  if (cat.includes(q)) {
    score += 10;
  }

  // Description matching
  if (desc.includes(q)) {
    score += 8;
  }

  return score;
}

export function rankAndSort(results, query) {
  const q = query.toLowerCase().trim();
  return results
    .map(result => ({ ...result, _score: scoreResult(result, q) }))
    .filter(result => result._score > 0)
    .sort((a, b) => {
      if (b._score !== a._score) {
        return b._score - a._score;
      }
      return (a.name || '').localeCompare(b.name || '', 'en-IN');
    })
    .map(({ _score, ...result }) => result);
}

