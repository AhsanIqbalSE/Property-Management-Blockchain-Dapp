const mongoose = require("mongoose");

const reqString={
    type:String,
    required:true,
}

const transactionSchema =new mongoose.Schema({
    timestamp:Number,
    amount:Number,
    ownerName:String,
    size:String,
    plotAddress:String,
    txHash:String
}); 
const chainSchema =new mongoose.Schema({
    height:Number,
    timestamp:Number,
    transactions:[transactionSchema],
    previousHash:String,
    hash:String,
    nonce:Number
});
const mempoolSchema =new mongoose.Schema({
    timestamp:Number,
    amount:Number,
    ownerName:String,
    size:String,
    plotAddress:String,
    txHash:String
}); 

var ChainSchema=mongoose.model('ChainSchema',chainSchema);
var MempoolSchema=mongoose.model('MempoolSchema',mempoolSchema);
module.exports = {MempoolSchema,ChainSchema}