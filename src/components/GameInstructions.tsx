import React from 'react';

export const GameInstructions: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="text-xl font-bold mb-3 flex items-center">
        <span className="mr-2">📋</span>
        Cómo Jugar
      </h3>
      
      <div className="space-y-3 text-sm text-gray-600">
        <div className="flex items-start space-x-2">
          <span className="text-blue-500 font-bold">1.</span>
          <div>
            <strong>Seleccionar Letras:</strong> Haz clic y arrastra para seleccionar letras en el tablero
          </div>
        </div>
        
        <div className="flex items-start space-x-2">
          <span className="text-blue-500 font-bold">2.</span>
          <div>
            <strong>Formar Palabras:</strong> Conecta letras adyacentes (incluyendo diagonalmente)
          </div>
        </div>
        
        <div className="flex items-start space-x-2">
          <span className="text-blue-500 font-bold">3.</span>
          <div>
            <strong>Longitud Mínima:</strong> Las palabras deben tener al menos 3 letras
          </div>
        </div>
        
        <div className="flex items-start space-x-2">
          <span className="text-blue-500 font-bold">4.</span>
          <div>
            <strong>Puntuación:</strong> Las palabras más largas otorgan más puntos
            <div className="ml-4 mt-1 text-xs bg-gray-50 p-2 rounded">
              <div>3-4 letras: <span className="font-semibold">1 punto</span></div>
              <div>5 letras: <span className="font-semibold">2 puntos</span></div>
              <div>6 letras: <span className="font-semibold">3 puntos</span></div>
              <div>7 letras: <span className="font-semibold">5 puntos</span></div>
              <div>8+ letras: <span className="font-semibold">11 puntos</span></div>
            </div>
          </div>
        </div>
        
        <div className="flex items-start space-x-2">
          <span className="text-blue-500 font-bold">5.</span>
          <div>
            <strong>Límite de Tiempo:</strong> ¡Encuentra tantas palabras como puedas en 3 minutos!
          </div>
        </div>
      </div>
      
      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <div className="text-sm text-blue-700">
          <strong>💡 Consejo:</strong> ¡Busca patrones de palabras comunes y prefijos/sufijos para maximizar tu puntuación!
        </div>
      </div>
    </div>
  );
};
