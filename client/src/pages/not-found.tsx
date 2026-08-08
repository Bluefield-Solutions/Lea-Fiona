export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md mx-4 rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="pt-6 p-6">
          <div className="flex items-center gap-3">
            <span aria-hidden className="text-2xl text-red-500">⚠️</span>
            <h1 className="text-2xl font-bold text-gray-900">404 — Seite nicht gefunden</h1>
          </div>
          <p className="mt-4 text-sm text-gray-600">
            Diese Seite gibt es nicht. Zurück zum Spiel über die Startseite.
          </p>
        </div>
      </div>
    </div>
  );
}
