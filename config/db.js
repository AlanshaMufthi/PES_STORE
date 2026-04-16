import dotenv from 'dotenv'
dotenv.config()
import mongoose from 'mongoose'


const connectDB = async()=>{
    try{

        await mongoose.connect(process.env.MONGODB_URI)
        console.log('DB connected')
    }catch(error){
        
       console.log('DB connection error',error.message);
       process.exit(1)    

    }
}

export default  connectDB
