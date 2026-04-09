import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md text-center">
        <h1 className="mb-2 text-4xl font-bold text-gray-900">MISE</h1>
        <p className="mb-8 text-lg text-gray-500">
          Your culinary development engine
        </p>

        <div className="flex flex-col gap-3">
          <Link
            href="/canvas"
            className="block w-full rounded-md bg-gray-900 px-4 py-3 text-sm font-medium text-white shadow-sm hover:bg-gray-800"
          >
            Open the Canvas
          </Link>
          <Link
            href="/library"
            className="block w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Recipe Library
          </Link>
          <Link
            href="/login"
            className="block w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Sign In
          </Link>
        </div>

        <div className="mt-8 flex justify-center gap-4 text-xs text-gray-400">
          <Link href="/brain" className="hover:text-gray-600">Chef Brain</Link>
          <span>·</span>
          <Link href="/pricing" className="hover:text-gray-600">Pricing</Link>
          <span>·</span>
          <Link href="/settings" className="hover:text-gray-600">Settings</Link>
        </div>
      </div>
    </div>
  );
}
