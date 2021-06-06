const mongoose = require("mongoose");
const reqString={
    type:String,
    required:true,
}
const transactionSchema =new mongoose.Schema({
    timestamp:Number,
    amount:Number,
    receiver:String,
    sender:String,
    txHash:String
}); 
const chainSchema =new mongoose.Schema({
    height:Number,
    timestamp:Number,
    transactions:[transactionSchema],
    previousHash:reqString,
    hash:reqString,
    nonce:Number
}); 
const mempoolSchema =new mongoose.Schema({
    timestamp:Number,
    amount:Number,
    receiver:String,
    sender:String,
    txHash:String
}); 
const blockchainSchema=new mongoose.Schema({
    chain:[chainSchema],
    mempool:[mempoolSchema],
    currentNodeURL:reqString,//
    networkNodes:[String],
    nodeAddress:reqString //
});
   
var Blockchain=mongoose.model('Blockchain',blockchainSchema);
module.exports = Blockchain