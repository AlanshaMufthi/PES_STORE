import dotenv from 'dotenv';
dotenv.config()
import express from 'express';
const app = express();
import connectDB from './config/db.js'
connectDB()
import path from 'path'
import { fileURLToPath } from 'url'
import userRoutes from './routes/userRoutes.js'
import adminRoutes from './routes/adminRoutes.js'
import session from 'express-session'
import passport from './config/passport.js'


app.use(session({
    secret:process.env.SESSION_SECRET,
    resave:false,
    saveUninitialized:true,
    cookie:{
        secure:false,
        httpOnly:true,
        maxAge:72*60*60*1000
    }
}))
app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.set('view engine','ejs')
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
app.set('views',[path.join(__dirname,'views/user'),path.join(__dirname,'views/admin')])

app.use(express.static(path.join(__dirname,'public')))

app.use('/',userRoutes);
app.use('/admin',adminRoutes);
app.use(passport.initialize())
app.use(passport.session())

app.listen(process.env.PORT,()=>{
    console.log(`server runnning on http://localhost:${process.env.PORT}`)
})

