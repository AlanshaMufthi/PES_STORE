import Address from "../../models/addressModel.js";
import User from '../../models/userModel.js'
import getUserId from "../../helpers/getUserId.js";



const loadAddressBook  = async(req,res)=>{
    try {
        const userId = getUserId(req)
        const user = await User.findById(userId)
        if(!user){
            return res.redirect('/login')
        }
        const addressDocument = await Address.findOne({userId})
        const addresses = addressDocument ? addressDocument.address : []

        res.render('addressBook',{user,addresses})
    } catch (error) {
        console.log('loadAddressBook error',error)
        res.redirect('/pageNotFound')
    }
}


const loadAddAddress = async(req,res)=>{
    try {
        const userId = getUserId(req)
        const user = await User.findById(userId)
        res.render('Addaddress',{user})
    } catch (error) {
       console.log('loadAddAddress error : ',error)
       res.redirect('/pageNotFound') 
    }
}


const addAddress = async(req,res)=>{
   
    try {
        const userId = getUserId(req)
        console.log('userId:', userId, 'type:', typeof userId)
       const { firstName, lastName, phone, addressLine, town, state, landmark, pincode, addressType } = req.body
           const newAddr = { firstName, lastName, phone, addressLine, town, state, landmark, pincode, addressType: addressType || 'Home' }
        let addressDocument = await Address.findOne({userId})
       

        if(!addressDocument){
            newAddr.isPrimary = true;
            addressDocument  = new Address({userId,address:[newAddr]})
        }else{
            const hasPrimary = addressDocument.address.some(a => a.isPrimary)
            if(!hasPrimary) newAddr.isPrimary = true
            addressDocument.address.push(newAddr)
        }

        await addressDocument.save()
        res.redirect('/addressBook')
    } catch (error) {
        console.log('addAddress error: ',error)
        res.redirect('/pageNotFound')
    }
}


const loadEditAddress = async(req,res)=>{
    try {
        const userId = getUserId(req)
        const user = await User.findById(userId)
        if(!user){
            return res.redirect('/login')
        }

        const addressDocument = await Address.findOne({userId})
        if(!addressDocument){
            return res.redirect('/addressBook')
        }

        const address = addressDocument.address.id(req.params.id)
        if(!address){
            return res.redirect('addressBook')
        }

        res.render('editAddress',{user,address})
    } catch (error) {
        console.log('loadEditAddress error: ',error)
        res.redirect('/pageNotFound')
    }
}


const editAddress = async(req,res)=>{
    try {
        const userId = getUserId(req)
        const {firstName,lastName,phone,addressLine,town,state,landmark,pincode,addressType}=req.body;
        const addressDocument = await Address.findOne({userId})
        if(!addressDocument){
            return res.redirect('/addressBook')
        }
        const address = addressDocument.address.id(req.params.id)
        if(!address){
            return res.redirect('/addressBook')
        } 

        address.firstName = firstName
        address.lastName  = lastName
        address.phone       = phone
        address.addressLine = addressLine
        address.town        = town
        address.state       = state
        address.landmark    = landmark || ''
        address.pincode     = pincode
        address.addressType = addressType || 'Home'

        await addressDocument.save()
        res.redirect('/addressBook')
        
    } catch (error) {
        console.log('editAddress error: ',error)
        res.redirect('/pageNotFound')
    }
}


const deleteAddress = async (req, res) => {
    try {
        const userId = getUserId(req)
        const addressDocument = await Address.findOne({ userId })
        if (!addressDocument) return res.status(404).json({ success: false, message: 'Address not found' })

        const address = addressDocument.address.id(req.params.id)  // ✅ fixed
        if (!address) return res.status(404).json({ success: false, message: 'Address not found' })

        const wasPrimary = address.isPrimary
        addressDocument.address.pull(req.params.id)

        if (wasPrimary && addressDocument.address.length > 0) {
            addressDocument.address[0].isPrimary = true
        }

        await addressDocument.save()
        res.json({ success: true })
    } catch (error) {
        console.log('deleteAddress error: ', error)
        res.status(500).json({ success: false, message: 'Server Error' })
    }
}


const setPrimaryAddress = async(req,res)=>{
    try {
        const userId = getUserId(req)
          
        const addressDocument = await Address.findOne({userId})
       
        if(!addressDocument){
            return res.status(404).json({success:false,message:'Address not found'})
        }

        // const target = addressDocument.address.id(req.params.id)
        const target  = addressDocument.address.find(a=>a._id.toString()=== req.params.id)
        if(!target){
            return res.status(404).json({success:false,message:'Address not found'})
        }
        
        addressDocument.address.forEach(a => {a.isPrimary = false})
        target.isPrimary = true;
        await addressDocument.save()
        res.json({success:true})
    } catch (error) {
        console.log('setPrimaryAddress error : ',error)
        res.status(500).json({success:false,message:'Server Error'})
    }
}

export {
     loadAddressBook,
  loadAddAddress,
  addAddress,
  loadEditAddress,
  editAddress,
  deleteAddress,
  setPrimaryAddress,
}