import { useState, useEffect } from 'react';

interface DefinitionResult {
  definition: string | null;  // null = not found, string = found
  notFound: boolean;          // true when API returned no definition
  loading: boolean;
}

export function useDefinition(word: string): DefinitionResult {
  const [definition, setDefinition] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // 2-letter final words and single letters don't have useful definitions
    if (!word || word.length <= 2) {
      setDefinition(null);
      setNotFound(false);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setDefinition(null);
    setNotFound(false);

    fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word.toLowerCase()}`, {
      signal: controller.signal,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.[0]?.meanings?.[0]?.definitions?.[0]) {
          setDefinition(null);
          setNotFound(true);
          return;
        }
        const meaning = data[0].meanings[0];
        const def = meaning.definitions[0].definition as string;
        setDefinition(`(${meaning.partOfSpeech}) ${def}`);
        setNotFound(false);
      })
      .catch(() => { setDefinition(null); setNotFound(false); })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [word]);

  return { definition, notFound, loading };
}
