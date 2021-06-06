var sha256 = require('sha256')
var uuid = require('uuid');
var url = process.argv[3]

function Blockchain(){
	this.chain = [];
	this.memPool = [];
	this.generateGenesis(); /// Creates Genesis Block only once
	this.currentNodeURL = url
	this.networkNodes = [];
	this.nodeAddress = uuid.v4().split('-').join('')
}

Blockchain.prototype.generateGenesis = function(){
	var block = {
		'height': 0,
		'timestamp':'1610783475068',
		'transactions':[],
		'previousHash':'0',
		'hash':'0',
		'nonce':'100'
	}
	this.chain.push(block)
	this.memPool = [];
	console.log('Genesis Block Created ')
	return block;	
}

Blockchain.prototype.createNewBlock = function(height,pHash,chainLength,memData) {
	if(chainLength == 0){
		previousHash = null
	}else{
		previousHash = pHash;
	}
	var nonce = this.proofOfWork(previousHash,memData)
	var hash = this.blockHashing(previousHash,memData,nonce)
	var block = {
		'height': height+1,
		'timestamp':Date.now(),
		'transactions':memData,
		'previousHash':previousHash,
		'hash':hash,
		'nonce':nonce
	}
	this.chain.push(block)
	this.memPool = [];
	console.log('New Block Added with block height '+block.height)
	return block;
};

Blockchain.prototype.blockHashing = function(previousHash,blockData,nonce){
	blockString = previousHash + JSON.stringify(blockData) + nonce;
	return sha256(blockString);
}

Blockchain.prototype.proofOfWork = function(previousHash,blockData){
		console.log("proof of work run")
	var nonce = 0;
	var hash = this.blockHashing(previousHash,blockData,nonce);
	while(hash.substring(0,4) != '0000'){
		nonce++
		hash = this.blockHashing(previousHash,blockData,nonce);
		//console.log(hash)
	}
	return nonce;
}

Blockchain.prototype.verifyBlock = function(height){
	var block = this.chain[height];
	var hash = this.blockHashing(block.previousHash,block.transactions,block.nonce);
	if(hash == block.hash){
		return true
	}else{
		return false;
	}
}

Blockchain.prototype.getLastBlock = function (){
	var index = this.chain.length
	return this.chain[index-1];
}
//traction hash from input
Blockchain.prototype.transactionHashing =function (amount,ownerName,size,plotAddress){
	blockString = amount +ownerName+ JSON.stringify(plotAddress) + size;
	return sha256(blockString);
}

Blockchain.prototype.createNewTx = function(amount,ownerName,size,plotAddress){
	var txHash=this.transactionHashing(amount,ownerName,size,plotAddress)
	var tx = {
		'timestamp':Date.now(),
		'amount':amount,
		'ownerName':ownerName,
		'size':size,
		'plotAddress':plotAddress,
		'txHash':txHash
	}
	return tx;
}

Blockchain.prototype.addTxToMemPool = function(txData){
	this.memPool.push(txData);
	return 'tx Added';
}

Blockchain.prototype.getTxsOfBlock = function(height) {
	var block = this.chain[height]
	if(block){
		return block.transactions;
	}else{
		return 'Block Not Found';
	}
	
};

Blockchain.prototype.chainIsValid = function(blockchain){
	var validChain = true;
	for (var i = 1; i < blockchain.length; i++) {
		if(blockchain[i].height != i) validChain = false;
		if(blockchain[i-1].hash != blockchain[i].previousHash) validChain = false;
		if(this.blockHashing(blockchain[i].previousHash,blockchain[i].transactions,blockchain[i].nonce) != blockchain[i].hash) validChain = false;
	}
	if(blockchain[0].hash != '0' || blockchain[0].previousHash != '0' || blockchain[0].nonce != '100'){
		validChain = false;
	}
	return validChain
}
module.exports = Blockchain;