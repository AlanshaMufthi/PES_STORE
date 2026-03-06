import express from 'express';
const app = express();
import dotenv from 'dotenv';
dotenv.config()
import connectDB from './config/db.js'
connectDB()
import path from 'path'
import { fileURLToPath } from 'url'
import userRoutes from './routes/userRoutes.js'
app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.set('view engine','ejs')
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
app.set('views',[path.join(__dirname,'views/user'),path.join(__dirname,'views/admin')])

app.use(express.static(path.join(__dirname,'public')))

app.use('/',userRoutes);

app.listen(process.env.PORT,()=>{
    console.log(`server runnning on http://localhost:${process.env.PORT}`)
})

