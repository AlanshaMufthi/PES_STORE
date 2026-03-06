import express from 'express';
const app = express();
import dotenv from 'dotenv';
dotenv.config()
import connectDB from './config/db.js'
connectDB()




app.listen(process.env.PORT,()=>{
    console.log(`server runnning on http://localhost:${process.env.PORT}`)
})

