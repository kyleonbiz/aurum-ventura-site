export default function Complete({
  params,
}: {
  params: { uniqueId: string };
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 px-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl text-center">
        <div className="mb-6">
          <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-10 h-10 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>

        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Thank You!
        </h1>

        <p className="text-xl text-gray-600 mb-4">
          Your onboarding is now complete. We've received all your information.
        </p>

        <p className="text-gray-500 mb-8">
          Our team will review your submission and be in touch soon. You can
          expect to hear from us within 1-2 business days.
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
          <p className="text-sm text-blue-700">
            📧 A confirmation email has been sent to your registered email address.
          </p>
        </div>

        <p className="text-gray-400 text-sm">
          Reference ID: <span className="font-mono">{params.uniqueId}</span>
        </p>
      </div>
    </div>
  );
}
