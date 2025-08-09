import { useBoggleGameMainStore } from '@/components/BoggleGameMain/boogle-game-main.store';

const HIGHLIGHT_DURATION = 400;

export type HighlightType = 'success' | 'error' | 'skip';

export const useHighlightManager = () => {
  const {
    setHighlightedPath,
    setHighlightedErrorPath,
    setHighlightedSkipPath,
  } = useBoggleGameMainStore();

  const showHighlight = (path: [number, number][], type: HighlightType) => {
    if (path.length === 0) return;

    // Limpiar highlights anteriores
    clearAllHighlights();

    // Mostrar el highlight apropiado
    switch (type) {
      case 'success':
        setHighlightedPath(path);
        break;
      case 'error':
        setHighlightedErrorPath(path);
        break;
      case 'skip':
        setHighlightedSkipPath(path);
        break;
    }

    // Limpiar después del tiempo especificado
    setTimeout(() => {
      clearAllHighlights();
    }, HIGHLIGHT_DURATION);
  };

  const clearAllHighlights = () => {
    setHighlightedPath([]);
    setHighlightedErrorPath([]);
    setHighlightedSkipPath([]);
  };

  return {
    showHighlight,
    clearAllHighlights,
  };
};
