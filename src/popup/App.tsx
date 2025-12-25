import { useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0);
  return (
    <div className="p-4 w-64">
      <h1 className="text-xl font-bold mb-4">Easy Extension</h1>
      <button
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        onClick={() => setCount(c => c + 1)}
      >
        Count: {count}
      </button>
    </div>
  );
}
