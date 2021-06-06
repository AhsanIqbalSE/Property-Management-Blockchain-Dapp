var Blockchain = require('./blockchain.js')

var bitcoin = new Blockchain();


var chain = {
"chain": [
{
"height": 0,
"timestamp": "1610783475068",
"transactions": [],
"previousHash": "0",
"hash": "0",
"nonce": "101"
}
],
"memPool": [],
"currentNodeURL": "http://localhost:3001",
"networkNodes": [],
"nodeAddress": "9e9ec47b6a07484fb82b866080df75a4"
};
console.log(bitcoin.chainIsValid(chain.chain))