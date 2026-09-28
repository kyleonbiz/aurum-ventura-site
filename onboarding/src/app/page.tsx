import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 px-4">
      <div className="text-center max-w-2xl">
        <h1 className="text-4xl font-bold text-gray-900 mb-6">
          Aurum Ventura Onboarding
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Streamline your client onboarding process with a simple, intuitive
          tool.
        </p>
        <div className="space-x-4">
          <Link
            href="/dashboard"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition"
          >
            Business Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
