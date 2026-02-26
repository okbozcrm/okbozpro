import React, { useState, useEffect } from 'react';

const FranchiseDashboard: React.FC = () => {
  const [franchiseId, setFranchiseId] = useState<string>('salem'); // Default to 'salem' for demonstration
  const [price, setPrice] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const fetchFranchisePrice = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/franchise/prices/${id}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch price.');
      }
      setPrice(data.price);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFranchisePrice(franchiseId);
  }, [franchiseId]);

  const handleUpdatePrice = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/franchise/prices/${franchiseId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update price.');
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
      <h1 className="text-2xl font-bold mb-4">Franchise Dashboard - Edit Price</h1>
      <div className="mb-4">
        <label htmlFor="franchiseSelect" className="block text-sm font-medium text-gray-700">Select Franchise:</label>
        <select
          id="franchiseSelect"
          value={franchiseId}
          onChange={(e) => setFranchiseId(e.target.value)}
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
        >
          <option value="salem">Salem</option>
          <option value="trichy">Trichy</option>
          <option value="chennai">Chennai</option>
        </select>
      </div>
      <div className="flex items-center space-x-4">
        <input
          type="number"
          value={price}
          onChange={(e) => setPrice(Number(e.target.value))}
          className="border p-2 rounded-md"
          placeholder="Edit price"
        />
        <button
          onClick={handleUpdatePrice}
          className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
          disabled={loading}
        >
          {loading ? 'Updating...' : 'Update Price'}
        </button>
      </div>
      {message && <p className="mt-2 text-green-600">{message}</p>}
      {error && <p className="mt-2 text-red-600">Error: {error}</p>}
    </div>
  );
};

export default FranchiseDashboard;
