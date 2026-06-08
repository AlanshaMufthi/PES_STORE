import Order from '../../models/orderModel.js'
import User from '../../models/userModel.js'
import { restoreStock } from '../user/orderController.js'


const formatDate = (date) =>
    new Date(date).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric'
    })

const capitalize = (str) => str ? str.charAt(0).toUpperCase() + str.slice(1) : ''


const loadOrderManagement = async (req, res) => {
    try {
        const search = req.query.search || ''
        const page = parseInt(req.query.page) || 1
        const limit = parseInt(req.query.limit) || 5
        const statusFilter = req.query.status || ''
        const sortBy = req.query.sortBy || 'newest'
        const skip = (page - 1) * limit

        if (req.query.clear === '1') return res.redirect('/admin/orders')

        const query = {}
        if (statusFilter) query.orderStatus = statusFilter

        const andConditions = []
        if (search) {
            const searchRegex = new RegExp(search, 'i')
            // FIX: search by firstName OR lastName OR email — not 'name' field
            const matchingUsers = await User.find({
                $or: [
                    { firstName: searchRegex },
                    { lastName: searchRegex },
                    { email: searchRegex }
                ]
            }).select('_id')

            andConditions.push({
                $or: [
                    { orderId: searchRegex },
                    { userId: { $in: matchingUsers.map(u => u._id) } },
                    { 'deliveryAddress.name': searchRegex }
                ]
            })
        }

        if (andConditions.length > 0) query.$and = andConditions

        let sortQuery = { createdAt: -1 }
        if (sortBy === 'oldest')      sortQuery = { createdAt: 1 }
        if (sortBy === 'amount_high') sortQuery = { total: -1 }
        if (sortBy === 'amount_low')  sortQuery = { total: 1 }

        const [totalCount, rawOrders] = await Promise.all([
            Order.countDocuments(query),
            Order.find(query)
                .populate('userId', 'firstName lastName email')
                .sort(sortQuery)
                .skip(skip)
                .limit(limit)
        ])

        const totalPages = Math.ceil(totalCount / limit)

        const orders = rawOrders.map((order) => ({
            _id: order._id,
            orderId: order.orderId || String(order._id).slice(-8).toUpperCase(),
            // FIX: build full name from firstName/lastName
            customerName: order.userId
                ? `${order.userId.firstName || ''} ${order.userId.lastName || ''}`.trim() || order.userId.email
                : order.deliveryAddress?.name || 'Unknown',
            address: order.deliveryAddress
                ? `${order.deliveryAddress.place || ''}, ${order.deliveryAddress.pincode || ''}`
                : '—',
            date: formatDate(order.createdAt),
            product: order.items[0]?.name || 'NA',
            itemCount: order.items.length,
            status: capitalize(order.orderStatus),
            price: (order.total || 0).toLocaleString('en-IN')
        }))

        res.render('orderManagement', {
            orders, totalCount, currentPage: page,
            totalPages, limit, search, statusFilter, sortBy
        })
    } catch (error) {
        console.log('loadOrderManagement Error : ', error)
        res.redirect('/admin/pageNotFound')
    }
}


const loadOrderDetails = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('userId', 'firstName lastName email')
            .populate('items.productId', 'productname productImage')

        if (!order) return res.redirect('/admin/orders')

        // FIX: was 'admin/orderDetails' → double path crash
        res.render('orderDetails', { order })
    } catch (error) {
        console.log('loadOrderDetails Error : ', error)
        res.redirect('/admin/pageNotFound')
    }
}


const loadOrderStatus = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('userId', 'firstName lastName email')
            .populate('items.productId', 'productname productImage')

        if (!order) return res.redirect('/admin/orders')

        // FIX: was 'admin/orderStatus' → double path crash
        res.render('orderStatus', { order })
    } catch (error) {
        console.log('loadOrderStatus Error : ', error)
        res.redirect('/admin/pageNotFound')
    }
}


const updateOrderStatus = async (req, res) => {
    try {
        const { status } = req.body
        const order = await Order.findById(req.params.id)
        if (!order) return res.status(404).json({ success: false, message: 'Order not found' })

        const statusLower = status.toLowerCase()
        const validStatuses = ['placed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'returned']
        if (!validStatuses.includes(statusLower))
            return res.status(400).json({ success: false, message: 'Invalid Status Value' })

        const current = (order.orderStatus || '').toLowerCase()
        if (['delivered', 'cancelled', 'returned'].includes(current) && statusLower !== current)
            return res.status(400).json({ success: false, message: `Order is already ${order.orderStatus}` })

        if ((statusLower === 'cancelled' || statusLower === 'returned') && !['cancelled', 'returned'].includes(current)) {
            await restoreStock(order.items.filter(i => !['cancelled', 'returned'].includes((i.status || '').toLowerCase())))
            order.items.forEach(item => {
                if (!['cancelled', 'returned'].includes((item.status || '').toLowerCase()))
                    item.status = statusLower
            })
        }

        order.orderStatus = statusLower

        if (statusLower === 'delivered') {
            order.paymentStatus = 'paid'
            order.items.forEach(item => {
                if (!['cancelled', 'returned'].includes((item.status || '').toLowerCase()))
                    item.status = 'delivered'
            })
        }
        if (statusLower === 'out_for_delivery') {
            order.items.forEach(item => {
                if (['placed', 'processing', 'shipped'].includes((item.status || '').toLowerCase()))
                    item.status = 'out_for_delivery'
            })
        }

        await order.save()
        res.json({ success: true, message: 'Order status updated', status: capitalize(statusLower) })
    } catch (error) {
        console.log('updateOrderStatus Error : ', error)
        res.status(500).json({ success: false, message: 'Server Error' })
    }
}


const exportOrders = async (req, res) => {
    try {
        const orders = await Order.find()
            .populate('userId', 'firstName lastName email')
            .sort({ createdAt: -1 })
            .lean()

        const headers = [
            'Order ID', 'Customer', 'Email', 'Address',
            'Date', 'Items', 'Payment Method', 'Payment Status',
            'Order Status', 'Subtotal', 'Delivery Charge', 'Total'
        ]

        const rows = orders.map((order) => [
            order.orderId || String(order._id).slice(-8).toUpperCase(),
            order.userId ? `${order.userId.firstName || ''} ${order.userId.lastName || ''}`.trim() : 'Unknown',
            order.userId?.email || 'N/A',
            order.deliveryAddress ? `${order.deliveryAddress.place},${order.deliveryAddress.pincode}` : '—',
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