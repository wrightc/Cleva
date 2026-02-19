interface WordChainProps {
  chain: string[];
}

export function WordChain({ chain }: WordChainProps) {
  if (chain.length <= 1) return null;

  // Show all words except the current one (last in chain)
  const history = chain.slice(0, -1);

  return (
    <div className="word-chain" aria-label="Word history">
      {history.map((word, i) => (
        <span key={i} className="word-chain__item">
          <span className="word-chain__word">{word}</span>
          <span className="word-chain__arrow" aria-hidden="true">→</span>
        </span>
      ))}
    </div>
  );
}
