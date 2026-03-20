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

  // Email Sending API
  app.post("/api/send-email", async (req, res) => {
    const { senderName, senderEmail, smtpConfig, recipientEmail, subject, body } = req.body;

    if (!recipientEmail || !subject || !body || !smtpConfig) {
      return res.status(400).json({ message: "Missing required fields for sending email." });
    }

    try {
      const nodemailer = await import('nodemailer');
      const transporter = nodemailer.createTransport({
        host: smtpConfig.host,
        port: parseInt(smtpConfig.port),
        secure: smtpConfig.port === '465', // true for 465, false for other ports
        auth: {
          user: smtpConfig.user,
          pass: smtpConfig.pass,
        },
      });

      const info = await transporter.sendMail({
        from: `"${senderName}" <${senderEmail}>`,
        to: recipientEmail,
        subject: subject,
        text: body,
        html: body.replace(/\n/g, '<br>'), // Simple text to html conversion
      });

      console.log("Message sent: %s", info.messageId);
      res.json({ message: "Email sent successfully!", messageId: info.messageId });
    } catch (error: any) {
      console.error("Error sending email:", error);
      res.status(500).json({ message: "Failed to send email.", error: error.message });
    }
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
