declare module 'stockfish/src/stockfish-17.1-lite-single-03e3232.js' {
  const factory: () => {
    postMessage: (command: string) => void;
    onmessage: ((event: MessageEvent | string) => void) | null;
  };
  export default factory;
}
