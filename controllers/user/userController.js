






const loadLanding = async(req,res)=>{
  
    try{

         return res.render('landing')

    }catch(error){

       console.log('landing page not found')  
       res.status(404).send("not found")

    }



}

const pageNotFound = async(req,res)=>{
  
    try{

         return res.render('page-404')

    }catch(error){

   res.redirect('/pageNotFound')

    }



}

export default {loadLanding,pageNotFound}