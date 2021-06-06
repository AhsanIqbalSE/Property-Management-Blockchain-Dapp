require('./models/db')

const express=require('express');
const path=require('path');
const exphbs=require('express-handlebars');
const bodyparser = require('body-parser')
var nodePort = process.argv[2]
console.log(nodePort)

 var blockchainController=require('./controller/networkNode');

var app=express();
app.use(bodyparser.urlencoded({
    extended:true
}));
app.use(express.static('public'))

app.use(bodyparser.json());
app.set('views',path.join(__dirname,'/views/'));
app.engine('handlebars',exphbs({defaultLayout: 'mainLayout',layoutsDir:__dirname+'/views/layouts'}))
app.set('view engine','handlebars');


app.listen(nodePort,()=>{
    	console.log('Server Started port listening on '+ nodePort)
})
    
 app.use('/',blockchainController)