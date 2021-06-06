const mongoose = require("mongoose");
mongoose.connect('mongodb://localhost:27017/PropertyManagementDB',{useNewUrlParser:true, useUnifiedTopology: true},(err)=>{
    if(!err) {console.log('mogodb connection succeeded')}
    else {console.log('err in mongo db connection'+err);}
})
