require('../models/db')//db connection

var express = require('express')
var bodyParser  = require('body-parser')
var morgan = require('morgan')
var Blockchain = require('./blockchain')
var request = require('request');
var fetch = require('node-fetch');
const path=require('path');
const exphbs=require('express-handlebars');

var {ChainSchema}=require('../models/blockchain1.model');//db schema
var {MempoolSchema}=require('../models/blockchain1.model');//db schema

var nodePort = process.argv[2]
console.log(nodePort)

var app  = express();
var router  = express.Router();
app.use(morgan('dev'))
app.use(bodyParser.json())
//for template engine

var blockchain = new Blockchain();
//send blockchain in mongo
function addGenesisToMongo(){
	ChainSchema.countDocuments({height:'0'}, function(err, c) {
		console.log('Count is ' + c);
		if(c == 0){
			new ChainSchema(blockchain.chain[0]).save((err,doc)=>{
				if(!err)
				console.log("data sent")
				else{
					console.log('error during genesis block insertion : '+err);
				}
			})
		}
	})
}
addGenesisToMongo()
// MempoolSchema.find({},(err,data)=>{
// 	console.log(data)
// })



//Fetch Complete Blockchain
app.get('/blockchain',(req,res)=>{
	  res.json(blockchain)
	 
	//  res.sendFile('index.html', { root: __dirname });
})

//Broadcast new Transaction

app.post('/txAndBroadcast',(req,res)=>{
	// if clauses
	
	var txData = blockchain.createNewTx(req.body.amount,req.body.ownerName,req.body.size,req.body.plotAddress)
	blockchain.addTxToMemPool(txData)
	var promises = [];
	blockchain.networkNodes.forEach((nodeurl)=>{
		var apiRequest2 = {
			method:'POST',
			uri:nodeurl+'/addTx',
			body:{txData:txData},
			json:true
		}
		promises.push(request(apiRequest2))
	})
	Promise.all(promises).then((data)=>{
		console.log({"msg":"Txs Broadcast Successfully"})
		new MempoolSchema(txData).save((err,doc)=>{
			if(!err){
			console.log("data sent to mempool")
			res.redirect("allMempool")
			}
			else{
				console.log('error during mempool insertion : '+err);
			}
		})
	})
})

app.post('/addTx',(req,res)=>{
	var txData = req.body.txData
	blockchain.addTxToMemPool(txData)
	console.log("New Transaction Received")
	res.json({"msg":"New Transaction Received"})

})


app.get('/mineAndBroadcast',async(req,res)=>{
	var height;
	var pHash;
	var chainLength;
	//find lenght of chain
	await ChainSchema.find({},(arr,data)=>{
		chainLength=data
	}).count('height') 
    //find previous block hash and height
	await ChainSchema.find({},(arr,data)=>{
		height=data[0].height
		pHash=data[0].hash
	}).sort({height: "desc"}).limit(1)

	//find all mempool transaction
	var memData;
	await MempoolSchema.find({},(arr,data)=>{
		memData=data
	})
	var block = blockchain.createNewBlock(height,pHash,chainLength,memData);
	var reward = blockchain.createNewTx(12,blockchain.nodeAddress,"00000","0")
	blockchain.addTxToMemPool(reward)
	var promises = [];
	blockchain.networkNodes.forEach((nodeurl)=>{
		var apiRequest2 = {
			method:'POST',
			uri:nodeurl+'/receive-new-block',
			body:{blockData:block},
			json:true
		}
		promises.push(request(apiRequest2))
	})
	Promise.all(promises).then((data)=>{
		var promises2 = [];
		blockchain.networkNodes.forEach((nodeurl)=>{
			var apiRequest2 = {
				method:'POST',
				uri:nodeurl+'/addTx',
				body:{txData:reward},
				json:true
			}
			promises2.push(request(apiRequest2))
		})
		Promise.all(promises2).then((data)=>{
			console.log({"msg":"Block Mined and Broadcast Successfully"})
		})
	})
	console.log({'success':true,'msg':'Block Mined Successfully','block':block})

	//remove all tx of mempool after mine
	MempoolSchema.deleteMany({},()=>{console.log('mempool remove successful');})

	//block post to database
	new ChainSchema(block).save((err,doc)=>{
		if(!err){
		res.redirect("blocks");
		console.log("block sent")
	}
		else{
			console.log('error during block insertion : '+err);
		}
	})
	//reward send to mempool
	new MempoolSchema(reward).save((err,doc)=>{
		if(!err)
		console.log("reward sent to mempool")
		else{
			console.log('error during reward insertion : '+err);
		}
	})
})

app.post('/receive-new-block',(req,res)=>{
	var block = req.body.blockData;
	var index = blockchain.chain.length;
	var latest = blockchain.chain[index-1];
	if(latest.hash == block.previousHash && index == block.height ){
		blockchain.chain.push(block)
		blockchain.memPool = []
		res.json({"msg":"New Block Received"})
	}else{
		res.json({"msg":"Block Rejected"})
	}
})

app.post('/register-node',(req,res)=>{
	var newNetworkNode = req.body.newNodeUrl
	if(blockchain.networkNodes.indexOf(newNetworkNode) == -1 && newNetworkNode != blockchain.currentNodeURL){
		blockchain.networkNodes.push(newNetworkNode)
		res.json({"msg":"Node Registered Successfully"});
	}else{
		res.json({"msg":"Registeration Failed"})
	}
})

app.post('/register-node-bulk',(req,res)=>{
	var bulkNodes = req.body.bulkNodes;
	bulkNodes.forEach((nodeUrl,index)=>{
		if(blockchain.networkNodes.indexOf(nodeUrl) == -1 && nodeUrl != blockchain.currentNodeURL){
			blockchain.networkNodes.push(nodeUrl)
		}
	})
	res.json({"msg":"Bulk Registration Done!"})
})

app.post('/register-and-broadcast',(req,res)=>{
	var newNodeURL = req.body.newNodeurl;
	if(blockchain.networkNodes.indexOf(newNodeURL) == -1 && newNodeURL != blockchain.currentNodeURL){
		blockchain.networkNodes.push(newNodeURL)
		var promises = [];
		blockchain.networkNodes.forEach((nodeurl)=>{
			var apiRequest2 = {
				method:'POST',
				url:nodeurl+'/register-node-bulk',
				body:{bulkNodes:[...blockchain.networkNodes,blockchain.currentNodeURL]},
				json:true
			}
			promises.push(request(apiRequest2))
		})
		Promise.all(promises).then((data)=>{
			res.json({"msg":"Nodes Broadcast Successfully"})
		})

	}else{
		res.json({"msg":"Registeration Failed"})
	}

})

app.post('/consensus', (req,res)=>{
	var promises = [];
	blockchain.networkNodes.forEach(nodeurl =>{
		var fetch1 = fetch(nodeurl+'/blockchain').then(data=>data.json())
		promises.push(fetch1)
 	})
	Promise.all(promises).then((blockchains) =>{
		var currentLongestChainLength = blockchain.chain.length;
		var currentMempool = blockchain.mempool;
		var longestChain = null
		var updatedMempool = null
		blockchains.forEach((item)=>{
			if(item.chain.length > currentLongestChainLength){
				if(blockchain.chainIsValid(item.chain)){
					longestChain = item.chain;
					updatedMempool = item.mempool;
					currentLongestChainLength = item.chain.length
				}
			}
		})
		if(longestChain){
			blockchain.chain = longestChain
			blockchain.memPool = updatedMempool
			res.json({"msg":"Blockchain Updated Successfully"})
 		}
 		else{
 			res.json({"msg":"Your Blockchain is already upto date!!"})
 		}
	})
});

app.get('/blocks',(req,res)=>{
	ChainSchema.find((err,docs)=>{
        if(!err){
            res.render("blockchain/blocksTable", {
                list: docs
            });
        }else{
            console.log('Error in retriving employee list :'+err);
        }
    }).lean()
	// ChainSchema.find({},(arr,data)=>{res.json(data)})
})

app.get('/dashboard',(req,res)=>{
	Promise.all([ChainSchema.find({}).limit(6).lean(), MempoolSchema.find({}).limit(6).lean(),ChainSchema.find({}).lean()])
	.then(result => {
        const [blocks, mempool,blocksize] = result;
		console.log(blocks);
		res.render("blockchain/dashboard", {
			block: blocks,
			mempool:mempool,
			blocksize:blocksize
		});
        })
    .catch(err => {
        // handle error. 
        console.log(err);
    })
})

app.get('/allMempool',(req,res)=>{
	MempoolSchema.find((err,docs)=>{
        if(!err){
            res.render("blockchain/mempool-table", {
                mempool: docs
            });
        }else{
            console.log('Error in retriving employee list :'+err);
        }
    }).lean()
	// MempoolSchema.find({},(arr,data)=>{res.json(data)})
})

app.post('/blockByHeight',(req,res)=>{
	// var result=blockchain.chain[req.params.height] || "block does not exist at height"+req.params.height;
	 
	//  ChainSchema.find({ 'height': req.params.height }, function (err, docs) {
	// 	 if(docs.length>0){
	// 		  res.json(docs);	
	// 	 }else {
	// 		 res.json("document doesnt exist at this height");
	// 	 }
		 
	//   });
	ChainSchema.find({'height':req.body.search},(err,data)=>{
		if(err){
			console.log(err);
			res.render('blockchain/search',{msg:"data not found"});
		}else{
			res.render('blockchain/search',{data:data,msg:"data not found"});
		}
	}).lean()	
})

app.post('/blockByHash',(req,res)=>{
	// var result=blockchain.chain.find((x) => x.hash == req.params.hash ) || "block does not exist at hash "+req.params.hash;
	// res.json(result)
	// ChainSchema.find({ 'hash': req.params.hash }, function (err, docs) {
	// 	if(docs.length>0){
	// 		 res.json(docs);	
	// 	}else {
	// 		res.json("document doesnt exist at this hash:"+req.params.hash);
	// 	}
	// });
	ChainSchema.find({'hash':req.body.search},(err,data)=>{
		if(err){
			console.log(err);
			res.render('blockchain/search',{msg:"data not found"});
		}else{
			res.render('blockchain/search',{data:data,msg:"data not found"});
		}
	}).lean()	
})

//validate property
app.post('/validateProp',(req,res)=>{
	var txdata=blockchain.transactionHashing(req.body.amount,req.body.ownerName,req.body.size,req.body.plotAddress)
	console.log(txdata);
	console.log(txdata)
	ChainSchema.find({'transactions.txHash':txdata},(err,data)=>{
		if(data.length>0){
			console.log("validate")
			console.log(data)
			res.render('blockchain/popertyData',{msgMe:"This Property is Varified"});
		}else{
			res.render('blockchain/popertyData',{msgError:"No Data Found"});

						// console.log(err);
			// res.render('blockchain/search',{msg:"data not found"});
			// res.render('blockchain/search',{data:data,msg:"data not found"});
		}
	}).lean()	
})
// find transactions by sender and reciver
app.post('/trOwnerName/',(req,res)=>{
	// ChainSchema.find( { $or: [ { "transactions.receiver": req.params.address }, { "transactions.sender": req.params.address} ] },(err, docs)=>{
	// 	var tx=[];
	// 	if(docs.length>0){
	// 		for(i=0;i<docs.length;i++){
	// 			tx.push(docs[i].transactions.filter((y)=>y.sender==req.params.address || y.receiver==req.params.address)) 
	// 		}   
	// 		res.json(tx);	
	//    }else {
	// 	   res.json("transaction doesn't exist at"+req.params.address);
	//    }
	// })
	
	

		ChainSchema.find({ "transactions.ownerName": req.body.search},(err, docs)=>{
		var tx=[];
		if(docs.length>0){
			for(i=0;i<docs.length;i++){
				tx.push(docs[i].transactions.filter((y)=>y.ownerName==req.body.search)) 
			}   
			res.render('blockchain/search',{transaction:tx,msgMe:"Address not found"});
			console.log(docs)
	   }else {
		res.render('blockchain/search',{msgMe:"Address not found"});
	}
	}).lean()

})
//transaction by height
app.post('/tractionByHeight',(req,res)=>{
	// var result=blockchain.chain[req.params.height] || "block does not exist at height"+req.params.height;
	 
	//  ChainSchema.find({ 'height': req.params.height }, function (err, docs) {
	// 	 if(docs.length>0){
	// 		  res.json(docs);	
	// 	 }else {
	// 		 res.json("document doesnt exist at this height");
	// 	 }
		 
	//   });
	ChainSchema.find({'height':req.body.search},(err,blockTr)=>{
		if(err){
			console.log(err);
			res.render('blockchain/search',{msg:"data not found"});
		}else{
			res.render('blockchain/search',{blockTr:blockTr[0].transactions,msgTr:"Block transaction doesn't exist"});
		}
		
	}).lean()	
})
//search transaction by transaction hash
app.get('/tx/:txhash',(req,res)=>{
	ChainSchema.find({"transactions.txHash": req.params.txhash }, function (err, docs) {
		if(docs.length>0){
			var txObject=docs[0].transactions.find(n=>n.txHash==req.params.txhash)
			res.json(txObject);
		}else {
			res.json("document doesnt exist at this hash:"+req.params.txhash);
		}
	});
})

app.get('/propertyDirectory',(req,res)=>{
	Promise.all([ChainSchema.find({}).lean()])
	.then(result => {
        const [blocks] = result;
		// console.log("prop");
		// var dates=[];
		// for(var i=0;i<blocks.length;i++){
		// 	var date = new Date(blocks[i].timestamp);
		// 	dates.push(date.toString())  
		// }
		// console.log(dates);
        // 
		// console.log(blocks);
		res.render("blockchain/propertyDir", {
			block: blocks
		});
        })
    .catch(err => {
        // handle error. 
        console.log(err);
    })
})

module.exports=app;
// app.listen(nodePort,()=>{
// 	console.log('Server Started port listening on '+ nodePort)
// })
