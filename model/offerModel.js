const mongoose=require('mongoose')

//schema of model
const offerSchema=new mongoose.Schema({

    
      discount: { 
        type: Number, 
        required: true 
    },
   category:{
    type:String,
    required:true
   },
    
    status:{
      type:String,
      enum: ["active", "inactive"],
      required:true,
    },
    

});

module.exports=mongoose.model('Offer',offerSchema) //can be used anywhere in the project