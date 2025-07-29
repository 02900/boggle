// Store global síncrono para lastSubmittedRef
// Esto evita race conditions con actualizaciones asíncronas de estado

let lastSubmittedRefGlobal = {
  path: [] as [number, number][],
  word: ""
};

export const setLastSubmittedRefGlobal = (data: { path: [number, number][], word: string }) => {
  lastSubmittedRefGlobal = { ...data };
};

export const getLastSubmittedRefGlobal = () => {
  return lastSubmittedRefGlobal;
};
