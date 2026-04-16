import User from '../../models/userModel.js'



const customerInfo = async(req,res)=>{
    try {
        let search ="";
        if(req.query.search){
            search=req.query.search

        }
        let page = 1;
        if(req.query.page){
            page= parseInt(req.query.page)
        }
        const limit = parseInt(req.query.limit) || 5;
         const userData = await User.find({
  isAdmin: false,
  $or: [
    { firstName: { $regex: search, $options: 'i' } },
    { lastName: { $regex: search, $options: 'i' } },
    { email: { $regex: search, $options: 'i' } }
  ]
})
.sort({ createdAt: -1 })                    
.limit(limit)
.skip((page - 1) * limit)
.exec();


        const count = await User.find({
             isAdmin:false,
            $or:[
    { firstName: { $regex:  search, $options: 'i' } },
    { lastName: { $regex:  search, $options: 'i' } },
    { email: { $regex:  search, $options: 'i' } }
            ]
        }).countDocuments();

        res.render('customers',{
            customers:userData,
            totalPages:Math.ceil(count/limit),
            currentPage:page,
            limit,
            search
        })
      
    } catch (error) {

        res.redirect('/admin/pageNotFound')
        console.log('error:', error);
        
    }
}

const customerStatus = async(req,res)=>{
    try {
        const customer = await User.findById(req.params.id);
        //boolean value
        customer.isBlocked = !customer.isBlocked;
        await customer.save();
        res.status(200).json({success:true});
    } catch (error) {
        res.status(500).json({success:false})
    }
}


export {
    customerInfo,
    customerStatus,
   
}