import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;
const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET || 'schemind_default_secret';

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:8080',
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : [])
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, k8s probes)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true
}));

// ─── Database ──────────────────────────────────────────────────────────────────
if (MONGO_URI) {
  mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => console.error('❌ DB Connection Error:', err));
} else {
  console.warn('⚠️  MONGO_URI not set. Running without database.');
}

// ─── User Schema ──────────────────────────────────────────────────────────────
const UserSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  phoneNumber: { type: String },
  notificationPreferences: {
    enabled: { type: Boolean, default: false },
    time: { type: String },
    message: { type: String }
  },
  currentTopic: { type: String },
  lastStudyDate: { type: Date },
  streak: { type: Number, default: 0 }
});

const User = mongoose.model('User', UserSchema);

// ─── Routes ───────────────────────────────────────────────────────────────────

// Root health-check route
app.get('/', (req, res) => {
  res.send('Schemind Backend Running Successfully 🚀');
});

// Health check endpoint (used by K8s liveness/readiness probes)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Schemind API is healthy 🟢' });
});

// Signup Route
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ message: '✅ User registered successfully.' });
  } catch (error) {
    console.error('❌ Signup Error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// Login Route
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password.' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(400).json({ message: 'Invalid email or password.' });
    }

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        streak: user.streak
      }
    });
  } catch (error) {
    console.error('❌ Login Error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// ─── Start Server ─────────────────────────────────────────────────────────────
// Bind to 0.0.0.0 so the server is reachable inside Docker/Kubernetes containers
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server running on http://0.0.0.0:${PORT}`));