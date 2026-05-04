import Order from '../../models/orderModel.js'
import User from '../../models/userModel.js'



const formatDate = (date)=>
    new Date(date).toLocaleDateString('en-IN',{
        day: '2-digit', month: 'short', year: 'numeric'
    })

const capitalize = (str)=> str ? str.charAt(0).toUpperCase() + str.slice(1) : ''


const loadOrderManagement = async(req,res)=>{
    try {
        const search = req.query.search || ''
        const page = parseInt(req.query.page ) || 1
        const limit = parseInt(req.query.limit) || 5
        const statusFilter = req.query.status || ''
        const skip = (page-1) * limit

        const query = {}
        if(statusFilter) query.orderStatus = statusFilter

        if(search){
            const matchingUsers = await User.find({
                name:{$regex: new RegExp(search,'i')},
            }).select('_id')
            query.userId = { $in: matchingUsers.map((u)=> u._id)}
        }

        const [totalCount, rawOrders] = await Promise.all([
            Order.countDocuments(query),
            Order.find(query)
            .populate('userId', 'name email')
            .sort({ createdAt: -1})
            .skip(skip)
            .limit(limit)
        ])

        const totalPages = Math.ceil(totalCount/limit)

        const orders = rawOrders.map((order)=>({
            _id: order._id,
            orderId: String(order._id).slice(-5).toUpperCase(),
            customername: order.userId?.name || 'Unknown',
            address: `${order.deliveryAddress.name}, ${order.deliveryAddress.place}, ${order.deliveryAddress.pincode}`,
            date: formatDate(order.createdAt),
            product: order.items[0]?.name || 'NA',
            itemCount: order.items.length,
            status: capitalize(order.orderStatus),
            price: order.total
        }))

        res.render('orderManagement',{
            orders, totalCount, currentPage: page,
            totalPages, limit, search, statusFilter
        })
    } catch (error) {
        console.log('loadOrderManagement Error : ', error)
        res.redirect('/admin/pageNotFound')
    }
}


const loadOrderDetails = async(req,res)=>{
    try {
        const order = await Order.findById(req.params.id)
        .populate('userId', 'name email')
        .populate('items.productId', 'productname productImage')

        if(!order) return res.redirect('/admin/orders')

            res.render('orderDetails', { order })
    } catch (error) {
        console.log('loadOrderDetails Error : ', error)
        res.redirect('/admin/pageNotFound')
    }
}


const loadOrderStatus = async(req,res)=>{
    try {
        const Order = await Order.findById(req.params.id)
        .populate('userId', 'name email')
        .populate('items.productId', 'productname productImage')

        if(!order) return res.redirect('/admin/orders')

            res.render('orderStatus', { order })
    } catch (error) {
        console.log('laodOrderStatus Error : ', error)
        res.redirect('/admin/pageNotFound')
    }
}


const updateOrderStatus = async(req,res)=>{
    try {
        const { status } = req.body;

        const validStatuses = ['Placed', 'Processing', 'Shipped', 'Delivered', 'Cancelled']
        if(!validStatuses.includes(status)){
            return res.status(400).json({success:false,message:'Invalid Status Value'})
        }

        const current = (order.orderStatus || '').toLowerCase()
        if(current === 'Delivered' || current === 'Cancelled'){
            return res.status(400).json({success:false, message: `Cannot update a ${order.orderStatus} order`})
        }

        order.orderStatus = status
        if(status === 'Delivered') order.paymentStatus = 'paid'

        await Order.save({validateModifiedOnly: true})
        res.json({success: true, message: 'Order status updated', status })
    } catch (error) {
        console.log('updateOrderStatus Error : ', error)
        res.status(500).json({success:false, message:'Server Error'})
    }
}


const exportOrders = async(req,res)=>{
    try {
        const Orders = await Order.find()
        .populate('userId', 'name email')
        .sort({createdAt: -1})
        .lean()
        
        const headers = [
            'Order ID', 'Customer', 'Email', 'Address',
            'Date', 'Items', 'Payment Method', 'Payment Status',
            'Order Status', 'Subtotal', 'Delivery Charge', 'Total',
        ]

        const rows = orders.map((order)=>[
            String(order._id).slice(-5).toUpperCase(),
            order.userId?.name || 'Unknown',
            order.userId?.email || 'N/A',
            `${order.deliveryAddress.place},${order.deliveryAddress.pincode},`,
            formatDate(order.createdAt),
            order.items.length,
            order.paymentMethod?.toUpperCase() || 'N/A',
            capitalize(order.paymentStatus),
            capitalize(order.orderStatus),
            order.subtotal,
            order.deliveryCharge,
            order.total
        ])

           const csv = [headers, ...rows]
            .map((row) => row.map((val) => `"${val ?? ''}"`).join(','))
            .join('\n')
 
        res.setHeader('Content-Type', 'text/csv')
        res.setHeader('Content-Disposition', `attachment; filename="orders_${Date.now()}.csv"`)
        res.send(csv)

    } catch (error) {
        console.log('exportOrders Error : ', error)
        res.redirect('/admin/pageNotFound')
    }
}


export { 

    loadOrderManagement,
    loadOrderDetails,
    loadOrderStatus,
    updateOrderStatus,
    exportOrders
}