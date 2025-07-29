export const GameSettings = ({
  eliminateCommonWords,
  onToggleEliminateCommonWords,
  setShowSettingsModal,
}: {
  eliminateCommonWords: boolean;
  onToggleEliminateCommonWords: (enabled: boolean) => void;
  setShowSettingsModal: (show: boolean) => void;
}) => {
  return (
    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800">Configuración</h2>
        <button
          onClick={() => setShowSettingsModal(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <label
              htmlFor="eliminate-common-words"
              className="text-sm font-medium text-gray-700 cursor-pointer"
            >
              Eliminar palabras comunes
            </label>
            <p className="text-xs text-gray-500 mt-1">
              Al finalizar, se eliminan las palabras encontradas por múltiples
              jugadores
            </p>
          </div>
          <div className="ml-3">
            <input
              id="eliminate-common-words"
              type="checkbox"
              checked={eliminateCommonWords}
              onChange={(e) => onToggleEliminateCommonWords(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
