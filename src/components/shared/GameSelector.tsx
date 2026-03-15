import Link from "next/link";

const games = [
  {
    name: "Boggle",
    href: "/boggle",
    description: "Encuentra palabras en un tablero 4x4. Multijugador en tiempo real.",
    details: "3 minutos por ronda",
    color: "from-blue-600 to-blue-800",
    hoverColor: "hover:from-blue-500 hover:to-blue-700",
  },
  {
    name: "Scrabble",
    href: "/scrabble",
    description: "Coloca fichas para formar palabras. Por turnos, multijugador.",
    details: "2 minutos por turno",
    color: "from-green-600 to-green-800",
    hoverColor: "hover:from-green-500 hover:to-green-700",
  },
];

export function GameSelector() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 p-4">
      <div className="w-full max-w-2xl">
        <h1 className="text-4xl font-bold text-white text-center mb-2">
          Juegos de Palabras
        </h1>
        <p className="text-gray-400 text-center mb-8">
          Elige un juego para comenzar
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {games.map((game) => (
            <Link
              key={game.name}
              href={game.href}
              className={`block rounded-xl bg-gradient-to-br ${game.color} ${game.hoverColor} p-6 text-white transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105`}
            >
              <h2 className="text-2xl font-bold mb-2">{game.name}</h2>
              <p className="text-sm opacity-80 mb-3">{game.description}</p>
              <span className="inline-block text-xs bg-white/20 rounded-full px-3 py-1">
                {game.details}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
