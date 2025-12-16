
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// --- Middleware for error logging ---
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!', details: err.message });
});

// --- Routes ---

// 1. Auth Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password, type } = req.body;

  try {
    // For Demo purposes, if database is empty or user not found, 
    // we return a mock success to let you enter the app immediately.
    // In production, remove this mock block.
    const userCount = await prisma.user.count();
    if (userCount === 0) {
        return res.json({
            success: true,
            role: type.toUpperCase(),
            sessionId: 'mock-session-id',
            user: { id: 'mock-id', email, name: 'Demo User' }
        });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { employee: true, corporate: true }
    });

    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Role Validation
    if (type === 'admin' && user.role !== 'ADMIN') return res.status(403).json({ error: 'Not authorized' });
    
    let sessionId = user.id;
    if (user.role === 'EMPLOYEE') sessionId = user.employee?.id;

    res.json({
      success: true,
      role: user.role,
      sessionId: sessionId,
      user: {
        id: user.id,
        email: user.email,
        name: user.employee?.name || user.corporate?.companyName || 'Admin'
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Employees
app.get('/api/employees', async (req, res) => {
  try {
    const employees = await prisma.employee.findMany();
    // If DB is empty, return empty array (frontend handles mocks if empty)
    res.json(employees);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/employees', async (req, res) => {
  const data = req.body;
  try {
    // Create User Login first
    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: data.password || 'user123',
        role: 'EMPLOYEE'
      }
    });

    // Create Employee Profile
    const employee = await prisma.employee.create({
      data: {
        userId: user.id,
        name: data.name,
        role: data.role,
        department: data.department,
        joiningDate: new Date(data.joiningDate),
        salary: data.salary,
        phone: data.phone,
        branch: data.branch
      }
    });
    
    res.json(employee);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Leads
app.get('/api/leads', async (req, res) => {
  try {
    const leads = await prisma.lead.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(leads);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/leads', async (req, res) => {
  try {
    const lead = await prisma.lead.create({ data: req.body });
    res.json(lead);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Backend Server running on http://localhost:${PORT}`);
});
