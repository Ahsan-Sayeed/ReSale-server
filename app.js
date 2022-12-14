const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require("stripe")(process.env.SK_KEY);

//connect to database
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { VerifyToken } = require('./middleware/VerifyToken');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.36zkm2g.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


//middlewares
app.use(cors());
app.use(express.json());

//test route
app.get('/',(req,res)=>{
    res.status(200).send('hello word...');
})

async function run() {
    try {
      const database = client.db("BuySell");
      //collections
      const Products = database.collection("Products");
      const Users = database.collection("Users");
      const Booked = database.collection("Booked");
      const Payment = database.collection("Payment");
      const Report = database.collection("Report");

    //  routes
      //create users
        app.post('/createaccount',async(req,res)=>{
          try{
            const exist = await Users.findOne({uid:req.body.uid});
            if(exist===null){
              const result = await Users.insertOne(req.body);
              res.status(200).send(result);
            }
            else{
              res.status(200).send({acknowledged:true});
            }
          }
          catch(err){
            console.log(err);
          }
        })
        //get a user
        app.get('/users/:uid',async(req,res)=>{
          try{
            const result = await Users.find({uid:req.params.uid}).toArray();
            res.status(200).send(result[0]);
          }
          catch(err){
            console.log(err);
          }
        })
    //admin panel
        // get all buyers and sellers
        app.get('/admin/:key',VerifyToken,async(req,res)=>{
          try{
          const result = await Users.find({role:req.params.key}).toArray();
          res.status(200).send(result);
          }
          catch(err){
            console.log(err);
          }
        })
        // delete a buyer
        app.delete('/admin/buyer/:id',VerifyToken,async(req,res)=>{
          try{

            const result = await Users.deleteOne({_id:ObjectId(req.params.id)});
            res.status(200).send(result);
          }
          catch(err){
            console.log(err);
          }
        })
        //delete a seller 
        app.delete('/admin/seller/:id',VerifyToken,async(req,res)=>{
          try{

            const result = await Users.deleteOne({_id:ObjectId(req.params.id)});
            res.status(200).send(result);
          }
          catch(err){
            console.log(err);
          }
        })
        //update a seller
        app.put('/admin/seller/:id',VerifyToken,async(req,res)=>{
          try{
          const result = await Users.updateOne(
            {
              _id:ObjectId(req.params.id)
            },
            {
                $set:{
                  verified:true
                } 
          },
          {
            upsert: true
          });
          res.status(200).send(result);
        }
        catch(err){
          console.log(err);
        }
        })
// end of admin panel

//seller
        app.post('/seller/products',VerifyToken,async(req,res)=>{
          try{

            const result = await Products.insertOne({...req.body,Time:Date.now()});
            res.status(200).send(result);
          }
          catch(err){
            console.log(err);
          }
        })
        app.get('/seller/products/:uid',VerifyToken,async(req,res)=>{
          try{

            const result = await Products.find({sellerUID:req.params.uid}).toArray();
            res.status(200).send(result);
          }
          catch(err){
            console.log(err);
          }
        })
        app.delete('/seller/products/:id',VerifyToken,async(req,res)=>{
          try{

            const result = await Products.deleteOne({_id:ObjectId(req.params.id)});
            res.status(200).send(result);
          }
          catch(err){
            console.log(err);
          }
        })
        app.put('/seller/products/:id',VerifyToken,async(req,res)=>{
          try{
          const result = await Products.updateOne(
            {
              _id:ObjectId(req.params.id)
            },
            {
                $set:{
                  advertise:req.body.advertise
                } 
          },
          {
            upsert: true
          })
          res.status(200).send(result);
        }
        catch(err){
          console.log(err);
        }
        })
//sellers end

//buyers
        app.post('/book',VerifyToken,async(req,res)=>{
          try{
            const result = await Booked.insertOne(req.body);
            res.status(200).send(result); 
          }
          catch(err){
            console.log(err);
          }
        })
        app.get('/book/:uid',VerifyToken,async(req,res)=>{
          try{
          const result = await Booked.find({userUID:req.params.uid}).toArray();
          const payed = await Payment.find({userUID:req.params.uid}).toArray();

          result.forEach(data=>{
            payed.forEach(v=>{
              if(v.productID===data.productID){
                data.payed=true;
              }
            })
          })
          res.status(200).send(result);
        }
        catch(err){
          console.log(err);
        }
        })

//end of buyers

// open to all
        app.get('/ads',async(req,res)=>{
          try{
          let result = await Products.find({advertise:true}).toArray();
          res.status(200).send(result);
          }
          catch(err){
            console.log(err);
          }
        })

        app.get('/category',async(req,res)=>{
          try{
          const result = await Products.find({}).project({category:1,_id:1}).toArray();
          const finalResult=[...new Set(result.map(v=>v.category))].map(v=>result.find(d=>d.category===v));
          res.status(200).send(finalResult);
          }
          catch(err){
            console.log(err);
          }
        })
    //error:

        app.get('/products/:id',VerifyToken,async(req,res)=>{
          try{
          const result = await Products.findOne({_id:ObjectId(req.params.id)});
          const findOutAll= await Products.find({category:result.category}).toArray();
          const booked = await Booked.find({$and:[{category:{$eq:result.category}},{userUID:{$eq:req.query.uid}}]}).toArray();

          findOutAll.forEach(value=>{
            const x = booked.filter(book=>book.productID === (value._id).toString() )
            // console.log(x.length);
            if(x.length!==0){
              if(x[0].productID===(value._id).toString()){
                value.booked=true;
              }
            }         
          })
          // console.log(findOutAll.length);
          res.status(200).send(findOutAll);
        }
        catch(err){
          console.log(err);
        }
        })
//end of open to all


// payment 
        app.post("/create-payment-intent",VerifyToken,async (req, res) => {
          try{
          const price = req.body.price;
          const amount = price*100;
          // Create a PaymentIntent with the order amount and currency
          const paymentIntent = await stripe.paymentIntents.create({
            amount: amount,
            currency: "usd",
            "payment_method_types": [
              "card"
            ]
          });
        
          res.send({
            clientSecret: paymentIntent.client_secret,
          });
        }
        catch(err){
          console.log(err);
        }
        });

        app.post('/payment',VerifyToken,async(req,res)=>{
          try{
          const {productID} = req.body;
          const result = await Payment.insertOne(req.body);

          const updateData = await Booked.updateOne({
            productID:productID
          },
          {
            $set:{
              payed:true
            }
          },
          {
            upsert:true
          })
          const sold = await Products.updateOne(
            {
              _id:ObjectId(productID)
            },
            {
              $set:{
                sold:true
              }
            },
            {upsert:true}
            )

          res.status(200).send(result);
          }
          catch(err){
            console.log(err);
          }
        })

//others
        app.get('/isverified/:uid',VerifyToken,async(req,res)=>{
          try{
          const result = await Users.find({uid:req.params.uid}).project({verified:1}).toArray();
          res.status(200).send(result[0]);
          }
          catch(err){
            console.log(err);
          }
        })
//report
        app.post('/report',VerifyToken,async(req,res)=>{
          try{
            const result = await Report.insertOne(req.body);
            res.status(200).send(result);
          }
          catch(err){
            console.log(err);
          }
        })
        app.get('/report',VerifyToken,async(req,res)=>{
          try{
          const result = await Report.find({}).toArray();
          res.status(200).send(result);
          }
          catch(err){
            console.log(err);
          }
        })
        app.post('/reportitem',VerifyToken,async(req,res)=>{
          try{
          const result = await Report.insertOne(req.body);
          res.status(200).send(result);
          }
          catch(err){
            console.log(err);
          }
        })
        app.get('/reportitem',VerifyToken,async(req,res)=>{
          try{
          const result = await Report.find({role:'items'}).toArray();
          res.status(200).send(result);
          }
          catch(err){
            console.log(err);
          }
        })
        app.delete('/report/:id',VerifyToken,async(req,res)=>{
          try{
          const result = await Report.updateOne({productID:req.params.id},{$set:{workDone:true}},{upsert:true});
          const productDelete = await Products.deleteOne({_id:ObjectId(req.params.id)});
          const bookingDelete = await Booked.deleteOne({productID:req.params.id});
          res.status(200).send(result);
          }
          catch(err){
            console.log(err);
          }
        })

//jsonweb token
    app.get('/jwt', async (req, res) => {
      try{
      const email = req.query.email;
      const query = { email: email };
      const user = await Users.findOne(query);
      if (user) {
          const token = jwt.sign({ email }, process.env.ACCESS_TOKEN)
          return res.send({ accessToken: token });
      }
      res.status(403).send({ accessToken: '' })
    }
    catch(err){
      console.log(err)
    }
  });

    } finally {}
  }
  run().catch(console.dir);


module.exports = app;