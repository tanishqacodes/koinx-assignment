const mongoose = require('mongoose');

const tradeSchema = new mongoose.Schema({
    user_id:{
        type : Number,
        required :true
    },
    utc_time: { 
        type: Date,
        required: true 
    },
    operation: { 
        type: String, 
        required: true 
    },
    market: { 
        type: String,
        required: true 
    },
    amount: { 
        type: Number, 
        required: true 
    },
    price: { 
        type: Number, 
        required: true 
    }
});

const Trade = mongoose.model('Trade', tradeSchema);

module.exports = Trade;
