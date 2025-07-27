import React from 'react';

export const GameInstructions: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="text-xl font-bold mb-3 flex items-center">
        <span className="mr-2">📋</span>
        How to Play
      </h3>
      
      <div className="space-y-3 text-sm text-gray-600">
        <div className="flex items-start space-x-2">
          <span className="text-blue-500 font-bold">1.</span>
          <div>
            <strong>Select Letters:</strong> Click and drag to select letters on the board
          </div>
        </div>
        
        <div className="flex items-start space-x-2">
          <span className="text-blue-500 font-bold">2.</span>
          <div>
            <strong>Form Words:</strong> Connect adjacent letters (including diagonally)
          </div>
        </div>
        
        <div className="flex items-start space-x-2">
          <span className="text-blue-500 font-bold">3.</span>
          <div>
            <strong>Minimum Length:</strong> Words must be at least 3 letters long
          </div>
        </div>
        
        <div className="flex items-start space-x-2">
          <span className="text-blue-500 font-bold">4.</span>
          <div>
            <strong>Scoring:</strong> Longer words score more points
            <div className="ml-4 mt-1 text-xs bg-gray-50 p-2 rounded">
              <div>3-4 letters: <span className="font-semibold">1 point</span></div>
              <div>5 letters: <span className="font-semibold">2 points</span></div>
              <div>6 letters: <span className="font-semibold">3 points</span></div>
              <div>7 letters: <span className="font-semibold">5 points</span></div>
              <div>8+ letters: <span className="font-semibold">11 points</span></div>
            </div>
          </div>
        </div>
        
        <div className="flex items-start space-x-2">
          <span className="text-blue-500 font-bold">5.</span>
          <div>
            <strong>Time Limit:</strong> Find as many words as you can in 3 minutes!
          </div>
        </div>
      </div>
      
      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <div className="text-sm text-blue-700">
          <strong>💡 Tip:</strong> Look for common word patterns and prefixes/suffixes to maximize your score!
        </div>
      </div>
    </div>
  );
};
