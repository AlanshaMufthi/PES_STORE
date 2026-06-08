import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/userModel.js'


passport.use(new GoogleStrategy({
    clientID:process.env.GOOGLE_CLIENT_ID,
    clientSecret:process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback'
},

async(accessToken,refreshToken,Profile,done)=>{
    try {
        const googleEmail = Profile?.emails?.[0]?.value?.toLowerCase()
        if(!googleEmail){
            return done(new Error('Google account email is not available'),null)
        }

        let user = await User.findOne({googleId:Profile.id})
        if(user){
            return done(null,user)
        }else{
            const existingEmailUser = await User.findOne({email: googleEmail})
            if(existingEmailUser){
                // Link existing account with Google if same email is already registered.
                existingEmailUser.googleId = Profile.id
                if(!existingEmailUser.firstName && Profile.displayName){
                    existingEmailUser.firstName = Profile.displayName
                }
                await existingEmailUser.save()
                return done(null,existingEmailUser)
            }

            user =  new User({
                firstName:Profile.displayName || 'Google User',
                email:googleEmail,
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

done(null,user._id)

})

passport.deserializeUser(async(id,done) =>{
    try {
        if(!id) return done(null,false)
            const user = await User.findById(id)
        if(!user) return done(null,false)

            done(null,user)
    } catch (error) {
        done(null,false)
    }
})









export default passport