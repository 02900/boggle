export default function LobbyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">
            🎯 Boggle Game Lobby
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Welcome to the ultimate multiplayer word-finding challenge! Join
            players from around the world in fast-paced Boggle matches.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Game Features */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <span className="mr-3">🌟</span>
              Game Features
            </h2>

            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="bg-blue-100 rounded-full p-2">
                  <span className="text-blue-600">🚀</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">
                    Real-time Multiplayer
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Play with friends and competitors in real-time
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="bg-green-100 rounded-full p-2">
                  <span className="text-green-600">⏱️</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">
                    3-Minute Rounds
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Fast-paced games that keep you engaged
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="bg-purple-100 rounded-full p-2">
                  <span className="text-purple-600">🏆</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Smart Scoring</h3>
                  <p className="text-gray-600 text-sm">
                    Longer words earn more points - strategy matters!
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="bg-orange-100 rounded-full p-2">
                  <span className="text-orange-600">🎮</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">
                    Intuitive Controls
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Click and drag to form words - easy to learn!
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Join Game Section */}
          <div className="flex items-center justify-center">
            <div className="w-full max-w-md">
              <div className="bg-white rounded-xl shadow-lg p-8">
                <div className="text-center mb-6">
                  <div className="text-6xl mb-4">🎯</div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">
                    Join Game
                  </h2>
                  <p className="text-gray-600">
                    Enter your name to start playing!
                  </p>
                </div>

                {/* This would be replaced with actual join form logic */}
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Enter your name"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors">
                    🚀 Join Game
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Game Rules */}
        <div className="mt-12 bg-white rounded-xl shadow-lg p-8 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            📋 How to Play
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                  1
                </span>
                <div>
                  <h3 className="font-semibold">Select Letters</h3>
                  <p className="text-gray-600 text-sm">
                    Click and drag to select adjacent letters on the board
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                  2
                </span>
                <div>
                  <h3 className="font-semibold">Form Words</h3>
                  <p className="text-gray-600 text-sm">
                    Connect letters horizontally, vertically, or diagonally
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                  3
                </span>
                <div>
                  <h3 className="font-semibold">Score Points</h3>
                  <p className="text-gray-600 text-sm">
                    Longer words earn more points (3+ letters minimum)
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                  4
                </span>
                <div>
                  <h3 className="font-semibold">Win the Round</h3>
                  <p className="text-gray-600 text-sm">
                    Find the most words before time runs out!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
