import { useState } from 'react';

export default function App() {
  const [enabled, setEnabled] = useState(true);

  return (
    <div className="fixed bottom-4 right-4 z-50 w-72 rounded-xl bg-white shadow-2xl ring-1 ring-gray-200">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div>
          <p className="text-sm font-semibold text-gray-900">Extension Content UI</p>
          <p className="text-xs text-gray-500">React + Tailwind inside Shadow DOM</p>
        </div>
        <label className="relative inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            className="peer sr-only"
            checked={enabled}
            onChange={event => setEnabled(event.target.checked)}
          />
          <div className="h-5 w-9 rounded-full bg-gray-200 transition peer-checked:bg-blue-500" />
          <div className="absolute left-1 top-1 h-3 w-3 rounded-full bg-white transition peer-checked:translate-x-4" />
        </label>
      </div>

      <div className="px-4 py-3 space-y-2">
        <p className="text-sm text-gray-700">
          This UI is rendered by the content script using a Shadow DOM host. Tailwind utilities are
          bundled into the content script and do not leak to the page.
        </p>
        <div className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
          Status: {enabled ? 'Enabled' : 'Disabled'}
        </div>
      </div>
    </div>
  );
}
