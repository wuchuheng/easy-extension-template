type HelloInCSUIProps = { name?: string };

export default function HelloInCSUI({ name }: HelloInCSUIProps) {
  return (
    <div className="fixed bottom-4 right-4 w-72 rounded-xl bg-white shadow-2xl ring-1 ring-gray-200">
      <div className="px-4 py-3 border-b border-gray-100">
        <p className="text-sm font-semibold text-gray-900">Content Script Created</p>
        <p className="text-xs text-gray-500">{name ?? 'Unnamed'} is mounted via Shadow DOM.</p>
      </div>
      <div className="px-4 py-3 text-sm text-gray-700">
        This UI is isolated with Tailwind inside the content script Shadow DOM.
      </div>
    </div>
  );
}
