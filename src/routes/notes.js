const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// 1. GET ALL NOTES
router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM notes ORDER BY updated_at DESC');
    res.status(200).json(result.rows);
  } catch (err) {
    next(err);
  }
});

// 2. GET A SINGLE NOTE BY ID
router.get('/:id', async (req, res, next) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM notes WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }
    res.status(200).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// 3. CREATE A NEW NOTE
router.post('/', async (req, res, next) => {
  const { title, body } = req.body;
  
  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  try {
    const query = `
      INSERT INTO notes (title, body, created_at, updated_at) 
      VALUES ($1, $2, NOW(), NOW()) 
      RETURNING *;
    `;
    const values = [title, body || ''];
    const result = await pool.query(query, values);
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// 4. UPDATE AN EXISTING NOTE
router.put('/:id', async (req, res, next) => {
  const { id } = req.params;
  const { title, body } = req.body;

  try {
    // First, check if the note exists
    const checkNote = await pool.query('SELECT * FROM notes WHERE id = $1', [id]);
    if (checkNote.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const currentNote = checkNote.rows[0];
    const updatedTitle = title !== undefined ? title : currentNote.title;
    const updatedBody = body !== undefined ? body : currentNote.body;

    const query = `
      UPDATE notes 
      SET title = $1, body = $2, updated_at = NOW() 
      WHERE id = $3 
      RETURNING *;
    `;
    const result = await pool.query(query, [updatedTitle, updatedBody, id]);

    res.status(200).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// 5. DELETE A NOTE
router.delete('/:id', async (req, res, next) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM notes WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }

    res.status(200).json({ message: 'Note deleted successfully', note: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;