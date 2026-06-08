import dotenv from 'dotenv/config';
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
import nochache from 'nocache'
import attachCartCount from './middlewares/cartCount.js';

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

app.set('view engine', 'ejs')
app.set('views', [
    path.join(__dirname, 'views'),
    path.join(__dirname, 'views/user'),
    path.join(__dirname, 'views/admin')
])

app.use(express.static(path.join(__dirname, 'public')))


app.use(express.json())
app.use(express.urlencoded({ extended: true }))


app.use(nochache())
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private')
    res.setHeader('Pragma', 'no-cache')
    res.setHeader('Expires', '0')
    next()
})

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: 'auto',
        sameSite: 'lax',
        httpOnly: true,
        maxAge: 72 * 60 * 60 * 1000
    }
}))

app.use(passport.initialize())
app.use(passport.session())
app.use(attachCartCount)
app.use((req, res, next) => {
    res.locals.user = req.session.user || null
    res.locals.admin = req.session.admin || null
    next()
})

app.use('/', userRoutes);
app.use('/admin', adminRoutes);

app.listen(process.env.PORT, () => {
    console.log(`server running on http://localhost:${process.env.PORT}`)
})