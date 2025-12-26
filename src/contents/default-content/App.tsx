import { Switch } from '@/components/Input';
import MacWindowShell from '@/components/MacWindowShell';
import { useState } from 'react';

export default function App() {
  const [enabled, setEnabled] = useState(true);

  return (
    <MacWindowShell title="Extension Content UI" storageKey="extension-content-ui-shell">
      <p className="text-sm text-gray-700">
        This UI is rendered by the content script using a Shadow DOM host. Tailwind utilities are
        bundled into the content script and do not leak to the page.
      </p>
      <div className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700 flex items-center gap-2 mt-4">
        <Switch enabled={enabled} onChange={setEnabled} />
        Status: {enabled ? 'Enabled' : 'Disabled'}
      </div>
    </MacWindowShell>
  );
}
