// Store global síncrono para lastSubmittedRef
// Esto evita race conditions con actualizaciones asíncronas de estado

let lastSubmittedRefGlobal = {
  path: [] as [number, number][],
  word: ""
};

export const setLastSubmittedRefGlobal = (data: { path: [number, number][], word: string }) => {
  lastSubmittedRefGlobal = { path: [...data.path], word: data.word };
};

export const getLastSubmittedRefGlobal = () => {
  return lastSubmittedRefGlobal;
};
