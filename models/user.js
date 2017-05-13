const mongoose=require('mongoose');
const Schema = mongoose.Schema;

//create user Schema and model
const UserSchema=new Schema({
  _id:String,
  //token:String,
  email:String,
  name:String,
  img: String
});

const User = mongoose.model('user',UserSchema);

module.exports=User;
