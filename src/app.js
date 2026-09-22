const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

// Import the notes router
const notesRouter = require('./routes/notes');
const { initDB } = require('./db');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// On Vercel, the DB schema is created lazily on first request rather than
// at module load (see src/db.js) so a bad/missing DATABASE_URL can't crash
// the whole function on cold start — it surfaces as a normal 500 instead.
if (process.env.VERCEL) {
  app.use(async (req, res, next) => {
    try {
      await initDB();
      next();
    } catch (err) {
      next(err);
    }
  });
}

// Serve the frontend (index.html, style.css, app.js)
app.use(express.static(path.join(__dirname, 'public')));

// Mount Routes
app.use('/api/notes', notesRouter);

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// 404 Handler
app.use((req, res, next) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

// Local server listener
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Local development server running at http://localhost:${PORT}`);
  });
}

module.exports = app;