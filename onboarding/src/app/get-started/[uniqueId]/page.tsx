import Link from "next/link";

export default function GetStarted({
  params,
}: {
  params: { uniqueId: string };
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 px-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>

        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to Your Onboarding
        </h1>

        <p className="text-xl text-gray-600 mb-8">
          We're excited to have you on board. This quick onboarding process will
          help us get to know your business better and set you up for success.
        </p>

        <p className="text-gray-500 mb-8">
          The process typically takes about 10-15 minutes to complete.
        </p>

        <Link
          href={`/get-started/${params.uniqueId}/step/1`}
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition text-lg"
        >
          Begin Onboarding
        </Link>

        <p className="text-gray-500 text-sm mt-8">
          Step 1 of 3: Your Information
        </p>
      </div>
    </div>
  );
}
