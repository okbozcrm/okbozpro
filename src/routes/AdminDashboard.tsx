import React, { useState, useEffect } from 'react';

const AdminDashboard: React.FC = () => {
  const [defaultPrice, setDefaultPrice] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    // In a real app, you'd fetch the current default price here.
    // For this demo, we'll assume it's already set or will be set by the admin.
    setDefaultPrice(100); // Initial dummy value
    setLoading(false);
  }, []);

  const handleSetDefaultPrice = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch('/api/admin/prices/default', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaultPrice }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to set default price.');
      }
      setMessage(data.message);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-4 text-center">Loading...</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard - Set Default Price</h1>
      <div className="flex items-center space-x-4">
        <input
          type="number"
          value={defaultPrice}
          onChange={(e) => setDefaultPrice(Number(e.target.value))}
          className="border p-2 rounded-md"
          placeholder="Set default price"
        />
        <button
          onClick={handleSetDefaultPrice}
          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
          disabled={loading}
        >
          {loading ? 'Setting...' : 'Set Default Price'}
        </button>
      </div>
      {message && <p className="mt-2 text-green-600">{message}</p>}
      {error && <p className="mt-2 text-red-600">Error: {error}</p>}
    </div>
  );
};

export default AdminDashboard;
