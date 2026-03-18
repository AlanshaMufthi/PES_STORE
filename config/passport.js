import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/userModel.js'


passport.use(new GoogleStrategy({
    clientID:process.env.GOOGLE_CLIENT_ID,
    clientSecret:process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:'/auth/google/callback'
},

async(accessToken,refreshToken,Profile,done)=>{
    try {
        let user = await User.findOne({googleId:Profile.id})
        if(user){
            return done(null,user)
        }else{
            user = new User({
                firstName:Profile.displayName,
                email:Profile.emails[0].value,
                googleId:Profile.id,
            })
            await user.save()
            return done(null,user)
        }
    } catch (error) {
        return done(error,null)
    }
}

))

passport.serializeUser((user,done)=>{

done(null,user.id)

})

passport.deserializeUser((id,done)=>{

User.findById(id)
.then(user=>{
    done(null,user)
})
.catch(error=>{
    done(error,null)
})

})

export default passport