import express from "express";
import { createServer as createViteServer } from "vite";
import path from 'path';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API routes FIRST
  app.use(express.json()); // Enable JSON body parsing

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Placeholder for price management API routes
  interface PriceData {
    defaultPrice: number;
    franchisePrices: Record<string, number>;
  }

  const priceData: PriceData = {
    defaultPrice: 100,
    franchisePrices: {
      "salem": 110,
      "trichy": 95,
    },
  };

  // Admin sets default price
  app.post("/api/admin/prices/default", (req, res) => {
    const { defaultPrice } = req.body;
    if (typeof defaultPrice !== 'number' || defaultPrice < 0) {
      return res.status(400).json({ message: "Invalid default price." });
    }
    priceData.defaultPrice = defaultPrice;
    res.json({ message: "Default price updated successfully.", defaultPrice: priceData.defaultPrice });
  });

  // Franchise gets their specific price
  app.get("/api/franchise/prices/:franchiseId", (req, res) => {
    const { franchiseId } = req.params;
    const price = priceData.franchisePrices[franchiseId] || priceData.defaultPrice;
    res.json({ franchiseId, price });
  });

  // Franchise updates their specific price
  app.post("/api/franchise/prices/:franchiseId", (req, res) => {
    const { franchiseId } = req.params;
    const { price } = req.body;
    if (typeof price !== 'number' || price < 0) {
      return res.status(400).json({ message: "Invalid price." });
    }
    priceData.franchisePrices[franchiseId] = price;
    res.json({ message: `Price for ${franchiseId} updated successfully.`, franchiseId, price });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
