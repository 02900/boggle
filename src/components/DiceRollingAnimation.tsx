import React, { useState, useEffect } from 'react';
import { DiceRoll } from '@/interfaces/game';

interface DiceRollingAnimationProps {
  diceRolls: DiceRoll[];
  onAnimationComplete: () => void;
}

export const DiceRollingAnimation: React.FC<DiceRollingAnimationProps> = ({
  diceRolls,
  onAnimationComplete
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [animatingDice, setAnimatingDice] = useState<number[]>([]);
  const [finalResults, setFinalResults] = useState<{ [key: number]: string }>({});

  useEffect(() => {
    if (diceRolls.length === 0) return;

    // Animar dados en grupos de 4 para hacer la animación más emocionante
    const animationSteps = [
      [0, 1, 2, 3],      // Primera fila
      [4, 5, 6, 7],      // Segunda fila  
      [8, 9, 10, 11],    // Tercera fila
      [12, 13, 14, 15]   // Cuarta fila
    ];

    let stepIndex = 0;
    
    const animateNextStep = () => {
      if (stepIndex >= animationSteps.length) {
        // Animación completada
        setTimeout(() => {
          onAnimationComplete();
        }, 1000);
        return;
      }

      const currentDiceIndices = animationSteps[stepIndex];
      setAnimatingDice(currentDiceIndices);
      setCurrentStep(stepIndex);

      // Simular lanzamiento de dados por 1.5 segundos
      setTimeout(() => {
        // Mostrar resultados finales para estos dados
        const newResults = { ...finalResults };
        currentDiceIndices.forEach(diceIndex => {
          newResults[diceIndex] = diceRolls[diceIndex].letter;
        });
        setFinalResults(newResults);
        setAnimatingDice([]);
        
        stepIndex++;
        setTimeout(animateNextStep, 300); // Pausa entre grupos
      }, 1500);
    };

    animateNextStep();
  }, [diceRolls, onAnimationComplete, finalResults]);

  const getDicePosition = (diceIndex: number) => {
    const row = Math.floor(diceIndex / 4);
    const col = diceIndex % 4;
    return { row, col };
  };

  const renderDice = (diceIndex: number) => {
    const dice = diceRolls[diceIndex];
    const isAnimating = animatingDice.includes(diceIndex);
    const finalResult = finalResults[diceIndex];
    const { row, col } = getDicePosition(diceIndex);

    return (
      <div
        key={diceIndex}
        className={`
          relative w-16 h-16 border-2 border-gray-400 rounded-lg flex items-center justify-center
          transition-all duration-300 transform
          ${isAnimating ? 'animate-bounce bg-blue-200 border-blue-400 scale-110' : 'bg-white'}
          ${finalResult ? 'bg-green-100 border-green-400' : ''}
        `}
        style={{
          gridRow: row + 1,
          gridColumn: col + 1,
        }}
      >
        {/* Contenido del dado */}
        <div className="text-lg font-bold text-gray-800">
          {isAnimating ? (
            <div className="animate-spin text-2xl">🎲</div>
          ) : finalResult ? (
            <span className="text-green-800">{finalResult}</span>
          ) : (
            <span className="text-gray-400">?</span>
          )}
        </div>

        {/* Número del dado */}
        <div className="absolute -top-2 -left-2 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
          {diceIndex + 1}
        </div>

        {/* Información del dado (mostrar en hover cuando no está animando) */}
        {!isAnimating && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 hover:opacity-100 transition-opacity duration-200 z-10">
            <div className="bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
              Dado {diceIndex + 1}: [{dice.faces.join(', ')}]
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-8 max-w-2xl w-full mx-4">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            🎲 Lanzando los Dados
          </h2>
          <p className="text-gray-600">
            Generando el tablero de Boggle con dados auténticos...
          </p>
        </div>

        {/* Tablero de dados */}
        <div className="grid grid-cols-4 gap-3 max-w-md mx-auto mb-6">
          {diceRolls.map((_, index) => renderDice(index))}
        </div>

        {/* Progreso */}
        <div className="text-center">
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / 4) * 100}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600">
            Paso {currentStep + 1} de 4 - Lanzando dados...
          </p>
        </div>

        {/* Información adicional */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">ℹ️ Sobre los Dados</h3>
          <p className="text-sm text-blue-700">
            Cada dado tiene 6 caras con diferentes letras. Los dados se lanzan y mezclan 
            aleatoriamente para crear un tablero único en cada partida, igual que en el 
            Boggle tradicional.
          </p>
        </div>
      </div>
    </div>
  );
};
