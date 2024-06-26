const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const csvParser = require('csv-parser');
const fs = require('fs');
const path = require('path');
const Trade = require('./models/Trade');
const bodyParser = require('body-parser');

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
        const [base_coin, quote_coin] = market.split('/');
        const amount = parseFloat(row['Buy/Sell Amount']);
        const price = parseFloat(row['Price']);

        const trade = new Trade({
          user_id,
          utc_time,
          operation,
          market,
          base_coin,
          quote_coin,
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

app.use(bodyParser.json());

// TASK - 2
app.post('/balance', async (req, res) => {
  const { timestamp } = req.body;
  if (!timestamp) {
    return res.status(400).send('Timestamp is required');
  }

  let queryTimestamp;
  try {
    queryTimestamp = new Date(timestamp);
    if (isNaN(queryTimestamp)) throw new Error();
  } catch (err) {
    return res.status(400).send('Invalid timestamp format');
  }

  try {
    // Query trades up to the given timestamp
    const trades = await Trade.find({ utc_time: { $lte: queryTimestamp } });

    const balances = {};

    trades.forEach(trade => {
      const { base_coin, amount, operation } = trade;
      const multiplier = operation.toLowerCase() === 'buy' ? 1 : -1;

      if (!balances[base_coin]) {
        balances[base_coin] = 0;
      }

      balances[base_coin] += amount * multiplier;
    });

    // Filter out assets with zero balance
    for (const asset in balances) {
      if (balances[asset] === 0) {
        delete balances[asset];
      }
    }
    
    console.log("balances : ",balances);


    res.status(200).json(balances);
  } catch (err) {
    console.error('Error calculating balances:', err);
    res.status(500).send('Internal server error');
  }
});



// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
