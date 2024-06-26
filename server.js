const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const csvParser = require('csv-parser');
const fs = require('fs');
const path = require('path');
const Trade = require('./models/Trade');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
mongoose.connect('mongodb+srv://konix:aLzF9CYPGEQdzq0d@cluster0.utw07xz.mongodb.net/Trade?retryWrites=true&w=majority&appName=Cluster0')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Failed to connect to MongoDB', err));

// Set up Multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Endpoint to handle CSV uploads
app.post('/upload-csv', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded');
  }

  const filePath = path.join(__dirname, req.file.path);

  const trades = [];

  fs.createReadStream(filePath)
    .pipe(csvParser())
    .on('data', (row) => {
      try {
        const user_id = row['User_ID'];
        const utc_time = new Date(row['UTC_Time']);
        const operation = row['Operation'];
        const market = row['Market'];
        const amount = parseFloat(row['Buy/Sell Amount']);
        const price = parseFloat(row['Price']);

        const trade = new Trade({
          user_id,
          utc_time,
          operation,
          market,
          amount,
          price
        });

        trades.push(trade);
      } catch (err) {
        console.error('Error parsing row:', row, err);
      }
    })
    .on('end', async () => {
      try {
        await Trade.insertMany(trades);
        res.status(200).send('CSV file processed successfully');
      } catch (err) {
        console.error('Error saving trades to database:', err);
        res.status(500).send('Failed to save data to database');
      } finally {
        fs.unlinkSync(filePath);
      }
    })
    .on('error', (err) => {
      console.error('Error reading CSV file:', err);
      res.status(500).send('Failed to process CSV file');
    });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
