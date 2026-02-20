import { useState, useEffect } from 'react';

interface DefinitionResult {
  definition: string | null;
  loading: boolean;
}

export function useDefinition(word: string): DefinitionResult {
  const [definition, setDefinition] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Single letters don't have useful dictionary definitions
    if (!word || word.length <= 1) {
      setDefinition(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setDefinition(null);

    fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word.toLowerCase()}`, {
      signal: controller.signal,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.[0]?.meanings?.[0]?.definitions?.[0]) {
          setDefinition(null);
          return;
        }
        const meaning = data[0].meanings[0];
        const def = meaning.definitions[0].definition as string;
        setDefinition(`(${meaning.partOfSpeech}) ${def}`);
      })
      .catch(() => setDefinition(null))
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [word]);

  return { definition, loading };
}
