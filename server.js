const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

db.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err);
  } else {
    console.log('✅ Connected to database');
    
    // Create expenses table if it doesn't exist
    db.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        description VARCHAR(255) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        category VARCHAR(100),
        date DATE DEFAULT (CURRENT_DATE),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) console.error('Error creating table:', err);
      else console.log('✅ Expenses table ready');
    });
  }
});

// API Routes

// GET all expenses
app.get('/api/expenses', (req, res) => {
  db.query('SELECT * FROM expenses ORDER BY date DESC', (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(results);
    }
  });
});

// POST new expense
app.post('/api/expenses', (req, res) => {
  const { amount, category, subcategory, date } = req.body;
  db.query(
    'INSERT INTO expenses (amount, category, subcategory, date) VALUES (?, ?, ?, ?)',
    [amount, category, subcategory || null, date || new Date()],
    (err, result) => {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.status(201).json({ 
          id: result.insertId, 
          amount, 
          category,
          subcategory: subcategory || null,
          date
        });
      }
    }
  );
});

// DELETE expense
app.delete('/api/expenses/:id', (req, res) => {
  const id = req.params.id;
  db.query('DELETE FROM expenses WHERE id = ?', [id], (err, result) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (result.affectedRows === 0) {
      res.status(404).json({ message: 'Expense not found' });
    } else {
      res.json({ message: 'Expense deleted successfully' });
    }
  });
});

// GET total spent
app.get('/api/expenses/total', (req, res) => {
  db.query('SELECT SUM(amount) as total FROM expenses', (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({ total: results[0].total || 0 });
    }
  });
});

// ===== BUDGET ROUTES =====

// GET current budget
app.get('/api/budget', (req, res) => {
    // First, make sure the budget table exists
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS budget (
            id INT PRIMARY KEY DEFAULT 1,
            amount DECIMAL(10,2) NOT NULL DEFAULT 2500,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;
    
    db.query(createTableQuery, (err) => {
        if (err) {
            console.error('Error creating budget table:', err);
            return res.status(500).json({ error: err.message });
        }
        
        // Now get the budget
        db.query('SELECT amount FROM budget WHERE id = 1', (err, results) => {
            if (err) {
                res.status(500).json({ error: err.message });
            } else if (results.length === 0) {
                // No budget exists - insert default
                db.query('INSERT INTO budget (id, amount) VALUES (1, 2500)', (err) => {
                    if (err) {
                        res.status(500).json({ error: err.message });
                    } else {
                        res.json({ amount: 2500 });
                    }
                });
            } else {
                res.json({ amount: results[0].amount });
            }
        });
    });
});

// UPDATE budget
app.put('/api/budget', (req, res) => {
    const { budget } = req.body;
    
    if (!budget || isNaN(budget)) {
        return res.status(400).json({ error: 'Invalid budget amount' });
    }
    
    db.query(
        'UPDATE budget SET amount = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1',
        [budget],
        (err, result) => {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                res.json({ amount: budget });
            }
        }
    );
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});