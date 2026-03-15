import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="max-w-3xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-3">Word Games</h1>
          <p className="text-slate-400 text-lg">
            Choose a game to play with friends
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Boggle Card */}
          <Link
            href="/boggle"
            className="group block bg-slate-800 border border-slate-700 rounded-2xl p-8 hover:border-blue-500 hover:bg-slate-750 transition-all duration-200"
          >
            <div className="text-center">
              <div className="text-5xl mb-4">🎲</div>
              <h2 className="text-2xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
                Boggle
              </h2>
              <p className="text-slate-400 mb-4">
                Find words on a 4x4 letter grid by tracing adjacent cells
              </p>
              <div className="flex flex-col gap-1 text-sm text-slate-500">
                <span>Real-time multiplayer</span>
                <span>3-minute rounds</span>
                <span>Spanish dictionary</span>
              </div>
              <div className="mt-6 inline-block px-6 py-2 bg-blue-600 text-white rounded-lg font-medium group-hover:bg-blue-500 transition-colors">
                Play Boggle
              </div>
            </div>
          </Link>

          {/* Scrabble Card */}
          <Link
            href="/scrabble"
            className="group block bg-slate-800 border border-slate-700 rounded-2xl p-8 hover:border-amber-500 hover:bg-slate-750 transition-all duration-200"
          >
            <div className="text-center">
              <div className="text-5xl mb-4">📝</div>
              <h2 className="text-2xl font-bold text-white mb-2 group-hover:text-amber-400 transition-colors">
                Scrabble
              </h2>
              <p className="text-slate-400 mb-4">
                Place tiles from your rack to build words on the board
              </p>
              <div className="flex flex-col gap-1 text-sm text-slate-500">
                <span>Turn-based multiplayer</span>
                <span>Resumable sessions</span>
                <span>Spanish dictionary</span>
              </div>
              <div className="mt-6 inline-block px-6 py-2 bg-amber-600 text-white rounded-lg font-medium group-hover:bg-amber-500 transition-colors">
                Play Scrabble
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
