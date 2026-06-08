import Order from '../../models/orderModel.js'
import Product from '../../models/productModel.js'
import User from '../../models/userModel.js'
import getUserId from '../../helpers/getUserId.js'
import PDFDocument from 'pdfkit'



const getSidebarUser = async (userId) => {
    try {
        const u = await User.findById(userId).select('firstName lastName name profileImage profileImg').lean()
        return u || {}
    } catch {
        return {}
    }
}


const loadOrders = async(req,res)=>{
    try {
        const userId = getUserId(req)
        const { search = '', status = '', time = '', page = 1 } = req.query
        const limit = 5
        const skip = (Number(page) - 1) * limit

        const filter = { userId }
        const andConditions = []

        if(status){
            const statuses = status.split(',').map(s=> s.trim().toLowerCase())
            filter.orderStatus = { $in: statuses}
        }

        if(time){
            const times = time.split(',').map(t=> t.trim())
            const dateConditions = times.map(t=>{
                if(t === '30days'){
                    const d = new Date()
                    d.setDate(d.getDate() - 30)
                    return { createdAt: { $gte : d } }
                }
                const year = parseInt(t)
                if(!isNaN(year)){
                    return { createdAt:{ $gte: new Date(`${year}-01-01`), $lte: new Date(`${year}-12-31T23:59:59`) } }
                }
                return null
            }).filter(Boolean)
            if(dateConditions.length > 0) andConditions.push({ $or: dateConditions})
        }

        if(search){
            const searchRegex = new RegExp(search, 'i')
            andConditions.push({ $or: [{ orderId: searchRegex },{ 'items.name': searchRegex }] })
        }

        if(andConditions.length > 0) filter.$and = andConditions

        const [orders, total, user] = await Promise.all([
            Order.find(filter).sort({createdAt:-1}).skip(skip).limit(limit).lean(),
            Order.countDocuments(filter),
            getSidebarUser(userId)
        ])

        const totalPages = Math.ceil(total/limit)

        return res.render('myOrders',{
            orders, searchQuery: search,
            currentPage: Number(page), totalPages,
            statusFilter: status, timeFilter: time,
            user
        })
    } catch (error) {
        console.log('loadOrders Error : ', error)
        return res.redirect('/home')
    }
}


const loadOrderDetails = async(req,res)=>{
    try {
        const userId = getUserId(req)
        const [order, user] = await Promise.all([
            Order.findById(req.params.orderId).lean(),
            getSidebarUser(userId)
        ])

        if(!order || order.userId.toString() !== userId.toString()){
            return res.redirect('/orders')
        }

        // FIX: was 'user/orderDetails' which resolved to views/user/user/orderDetails.ejs (crash)
        return res.render('orderDetails', { order, user })
    } catch (error) {
        console.log('loadOrderDetails Error : ', error)
        return res.redirect('/orders')
    }
}


const loadOrderTracking = async(req,res)=>{
    try {
        const userId = getUserId(req)
        const [order, user] = await Promise.all([
            Order.findById(req.params.orderId).lean(),
            getSidebarUser(userId)
        ])

        if(!order || order.userId.toString() !== userId.toString()){
            return res.redirect('/orders')
        }

        const item = order.items.find(i=> i._id.toString() === req.params.itemId)
        if(!item) return res.redirect(`/orders/${req.params.orderId}`)

        return res.render('orderTracking', { order, item, user })
    } catch (error) {
        console.log('loadOrderTracking Error : ', error)
        return res.redirect('/orders')
    }
}


const cancelItem = async(req,res)=>{
    try {
        const userId = getUserId(req)
        const { itemId, reason=''} = req.body;
        const order = await Order.findById(req.params.orderId)
        if(!order || order.userId.toString() !== userId.toString())
            return res.status(404).json({success:false, message:'Order not Found'})

        const item = order.items.id(itemId)
        if(!item) return res.status(404).json({success:false,message:'Item not found'})

        const itemStatus = item.status || order.orderStatus
        if(!['placed', 'processing', 'shipped'].includes(itemStatus.toLowerCase()))
            return res.status(400).json({success:false,message:`Cannot cancel an item that is ${itemStatus}`})

        await restoreStock([item])
        item.status = 'cancelled'
        item.cancellationReason = reason

        const activeItems = order.items.filter(i=> !['cancelled','returned'].includes((i.status||'').toLowerCase()))
        if(activeItems.length === 0){
            order.orderStatus = 'cancelled'
            order.cancellationReason = reason
            order.cancelledAt = new Date()
        } else if(['cancel_requested','cancelled'].includes((order.orderStatus||'').toLowerCase())){
            order.orderStatus = 'processing'
        }

        await order.save()
        return res.json({success:true, message:'Item cancelled successfully'})
    } catch (error) {
        console.log('cancelItem Error : ', error)
        return res.status(500).json({ success: false, message: 'Cancellation failed' })
    }
}


const returnItem = async(req,res)=>{
    try {
        const userId = getUserId(req)
        const { itemId, reason=''} = req.body;
        if(!reason.trim()) return res.status(400).json({success:false, message:'Return reason is required'})

        const order = await Order.findById(req.params.orderId)
        if(!order || order.userId.toString() !== userId.toString())
            return res.status(404).json({success:false, message:'Order not found'})

        const item = order.items.id(itemId)
        if(!item) return res.status(404).json({success:false, message:'Item not found'})

        const itemStatus = (item.status || '').toLowerCase();
        const orderStatus = (order.orderStatus || '').toLowerCase();
        if (itemStatus !== 'delivered' && orderStatus !== 'delivered')
            return res.status(400).json({ success: false, message: 'Only delivered items can be returned' });

        item.returnStatus = 'Requested'
        item.returnReason = reason
        item.status = 'return_requested'
        item.returnRequestedAt = new Date()
        await order.save()
        return res.json({success:true, message:'Return request submitted'})
    } catch (error) {
        console.log('returnItem Error : ', error)
        return res.status(500).json({ success: false, message: 'Return request failed' })
    }
}


const cancelOrder = async(req,res)=>{
    try {
        const userId = getUserId(req)
        const { reason = ''} = req.body;
        const order = await Order.findById(req.params.orderId)
        if(!order || order.userId.toString() !== userId.toString())
            return res.status(404).json({ success:false, message:'Order not found'})

        const cancellableStatuses = ['placed', 'processing', 'shipped']
        if(!cancellableStatuses.includes(order.orderStatus.toLowerCase()))
            return res.status(400).json({success:false,message:`Cannot cancel an order that is ${order.orderStatus}`})

        const cancellableItems = order.items.filter(i=> ['placed','processing','shipped'].includes((i.status||order.orderStatus).toLowerCase()))
        await restoreStock(cancellableItems)

        order.orderStatus = 'cancelled'
        order.cancellationReason = reason
        order.cancelledAt = new Date()
        order.items.forEach(i=>{
            if(['placed','processing','shipped'].includes((i.status||'').toLowerCase())) i.status = 'cancelled'
        })
        await order.save()
        return res.json({success:true, message:'Order cancelled successfully'})
    } catch (error) {
        console.log('cancelOrder Error : ', error)
        return res.status(500).json({ success: false, message: 'Cancellation failed' })
    }
}


const returnOrder = async(req,res)=>{
    try {
        const userId = getUserId(req)
        const { reason = ''} = req.body;
        if(!reason.trim()) return res.status(400).json({success:false,message:'Return reason is required'})

        const order = await Order.findById(req.params.orderId)
        if(!order || order.userId.toString() !== userId.toString())
            return res.status(404).json({success:false,message:'Order not found'})

        if(order.orderStatus.toLowerCase() !== 'delivered')
            return res.status(400).json({success:false,message:'Only delivered orders can be returned'})

        order.orderStatus = 'return_requested'
        order.items.forEach(item => {
            if(['delivered'].includes((item.status||order.orderStatus).toLowerCase())){
                item.returnStatus = 'Requested'
                item.returnReason = reason
                item.status = 'return_requested'
            }
        })
        order.returnReason = reason
        order.returnRequestedAt = new Date()
        await order.save()
        return res.json({success:true, message:'Return request submitted'})
    } catch (error) {
        console.log('returnOrder Error : ', error)
        return res.status(500).json({ success: false, message: 'Return request failed' })
    }
}


const downloadInvoice = async(req,res)=>{
    try {
        const userId = getUserId(req)
        const order = await Order.findById(req.params.orderId).lean()
        if(!order || order.userId.toString() !== userId.toString()) return res.redirect('/orders')

        const doc = new PDFDocument({ margin: 50, size: 'A4' })
        res.setHeader('Content-Type', 'application/pdf')
        res.setHeader('Content-Disposition', `attachment; filename=invoice-${order._id.toString().slice(-8).toUpperCase()}.pdf`)
        doc.pipe(res)
        buildInvoicePDF(doc, order)
        doc.end()
    } catch (error) {
        console.log('downloadInvoice Error : ', error)
        return res.redirect('/orders')
    }
}


const restoreStock = async(items)=>{
    if (!items || items.length === 0) return
    const ops = items.map(item=>
        Product.findOneAndUpdate(
            {_id: item.productId, 'variants._id': item.variantId},
            { $inc: {'variants.$.stock': item.quantity}, $set: {'variants.$.status': 'onStock'} }
        )
    )
    await Promise.all(ops)
}


const buildInvoicePDF = (doc, order)=>{
    const orderId = order.orderId || order._id.toString().slice(-8).toUpperCase()
    const orderDate = new Date(order.createdAt).toLocaleDateString('en-IN',{ day:'2-digit', month:'long', year:'numeric' })
    const BLACK = '#0a0a0a', GRAY = '#666666', W = 495

    doc.fontSize(22).font('Helvetica-Bold').fillColor(BLACK).text('INVOICE', 50, 50)
    doc.fontSize(9).font('Helvetica').fillColor(GRAY)
       .text(`Order # ${orderId}`, 50, 78).text(`Date: ${orderDate}`, 50, 91)
    doc.fontSize(16).font('Helvetica-Bold').fillColor(BLACK).text('PES Store', 50, 50, { align:'right', width:W })
    doc.fontSize(8).font('Helvetica').fillColor(GRAY).text('support@pesstore.com', 50, 72, { align:'right', width:W })
    doc.moveTo(50, 110).lineTo(545, 110).strokeColor('#e0e0e0').lineWidth(1).stroke()

    const addr = order.deliveryAddress || {}
    doc.fontSize(9).font('Helvetica-Bold').fillColor(BLACK).text('SHIP TO', 50, 125)
    doc.fontSize(9).font('Helvetica').fillColor(GRAY)
       .text(addr.name||'', 50, 140).text(addr.place||'', 50, 153)
       .text(`Pincode: ${addr.pincode||''}`, 50, 166).text(`Phone: ${addr.contact||''}`, 50, 179)
    doc.fontSize(9).font('Helvetica-Bold').fillColor(BLACK).text('PAYMENT METHOD', 320, 125)
    doc.fontSize(9).font('Helvetica').fillColor(GRAY).text((order.paymentMethod||'').toUpperCase(), 320, 140)
    doc.fontSize(9).font('Helvetica-Bold').fillColor(BLACK).text('STATUS', 320, 160)
    doc.fontSize(9).font('Helvetica').fillColor(GRAY).text((order.orderStatus||'').toUpperCase(), 320, 175)

    const tableTop = 215
    doc.rect(50, tableTop, W, 22).fill('#0a0a0a')
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff')
       .text('ITEM', 55, tableTop+7, {width:230})
       .text('SIZE', 290, tableTop+7, {width:50, align:'center'})
       .text('QTY', 345, tableTop+7, {width:50, align:'center'})
       .text('PRICE', 400, tableTop+7, {width:65, align:'right'})
       .text('TOTAL', 465, tableTop+7, {width:75, align:'right'})

    let y = tableTop + 22
    order.items.forEach((item, idx) => {
        const rowBg = idx % 2 === 0 ? '#f9f9f9' : '#ffffff'
        doc.rect(50, y, W, 24).fill(rowBg)
        doc.fontSize(8).font('Helvetica').fillColor(BLACK)
           .text(item.productName||item.name||'', 55, y+8, {width:230, ellipsis:true})
           .text(item.size||'', 290, y+8, {width:50, align:'center'})
           .text(String(item.quantity), 345, y+8, {width:50, align:'center'})
           .text(`Rs.${(item.price||0).toLocaleString('en-IN')}`, 400, y+8, {width:65, align:'right'})
           .text(`Rs.${(item.totalPrice||0).toLocaleString('en-IN')}`, 465, y+8, {width:75, align:'right'})
        doc.moveTo(50, y+24).lineTo(545, y+24).strokeColor('#eeeeee').lineWidth(0.5).stroke()
        y += 24
    })

    y += 16
    const totalX = 370
    const drawTotalRow = (label, value, bold=false, color=GRAY) => {
        doc.fontSize(9).font(bold?'Helvetica-Bold':'Helvetica').fillColor(color)
           .text(label, totalX, y, {width:100}).text(value, totalX, y, {width:170, align:'right'})
        y += 16
    }
    drawTotalRow('Subtotal', `Rs.${(order.subtotal||0).toLocaleString('en-IN')}`)
    drawTotalRow('Shipping', (order.deliveryCharge||0)===0 ? 'FREE' : `Rs.${order.deliveryCharge}`)
    doc.moveTo(totalX, y).lineTo(545, y).strokeColor('#cccccc').lineWidth(0.5).stroke()
    y += 8
    drawTotalRow('GRAND TOTAL', `Rs.${(order.total||0).toLocaleString('en-IN')}`, true, BLACK)
    doc.fontSize(8).font('Helvetica').fillColor(GRAY).text('Thank you for shopping with PES Store!', 50, y+30, {align:'center', width:W})
}


export {
    loadOrders, loadOrderDetails, loadOrderTracking,
    cancelItem, returnItem, cancelOrder, returnOrder,
    downloadInvoice, restoreStock
}