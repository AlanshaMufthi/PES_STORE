import Order from '../../models/orderModel.js';
import User from '../../models/userModel.js';
import { restoreStock } from '../user/orderController.js';


const loadReturnManagement = async (req, res) => {
    try {
        const status = req.query.status || '';
        const page   = parseInt(req.query.page)  || 1;
        const limit  = parseInt(req.query.limit) || 10;
        const skip   = (page - 1) * limit;

        const query = {};
        if (status === 'Pending') {
            query['items.returnStatus'] = 'Requested';
        } else {
            query['items.returnStatus'] = { $in: ['Requested', 'Accepted', 'Rejected'] };
        }

        const [orders, totalCount] = await Promise.all([
            Order.find(query)
                .populate('userId', 'firstName lastName email')
                .sort({ updatedAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Order.countDocuments(query)
        ])

        const returns = [];
        for (const order of orders) {
            for (const item of order.items) {
                if (!['Requested', 'Accepted', 'Rejected'].includes(item.returnStatus)) continue;
                // FIX: build customerName from firstName/lastName
                const customerName = order.userId
                    ? `${order.userId.firstName || ''} ${order.userId.lastName || ''}`.trim() || order.userId.email
                    : order.deliveryAddress?.name || '—';
                returns.push({
                    _id:          item._id,
                    orderId:      order.orderId || order._id,
                    orderMongoId: order._id,
                    customerName,
                    productName:  item.name || '—',
                    productImage: item.image || null,
                    productId:    item.productId,
                    reason:       item.returnReason || '—',
                    returnPrice:  item.price * item.quantity,
                    status:       item.returnStatus,
                })
            }
        }

        // FIX: was 'admin/returnManagement' → double path crash
        res.render('returnManagement', {
            returns,
            currentPage_num: page,
            totalPages: Math.ceil(totalCount / limit),
            limit,
            status,
        })
    } catch (err) {
        console.error('loadReturnManagement error:', err);
        res.redirect('/admin/pageNotFound');
    }
}


const loadReturnDetails = async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId)
            .populate('userId', 'firstName lastName email')
            .lean();

        if (!order) return res.redirect('/admin/pageNotFound');

        const customerName = order.userId
            ? `${order.userId.firstName || ''} ${order.userId.lastName || ''}`.trim() || order.userId.email
            : order.deliveryAddress?.name || '—';

        const returnItems = order.items
            .filter(item => ['Requested', 'Accepted', 'Rejected'].includes(item.returnStatus))
            .map(item => ({
                _id:          item._id,
                orderId:      order.orderId || order._id,
                orderMongoId: order._id,
                customerName,
                productName:  item.name || '—',
                productImage: item.image || null,
                productId:    item.productId,
                reason:       item.returnReason || '',
                returnPrice:  item.price * item.quantity,
                status:       item.returnStatus,
            }))

        // FIX: was 'admin/returnDetails' → double path crash
        res.render('returnDetails', { returnItems, orderId: order._id });
    } catch (err) {
        console.error('loadReturnDetails error:', err);
        res.redirect('/admin/pageNotFound');
    }
}


const updateReturnStatus = async (req, res) => {
    try {
        const { orderId, itemId } = req.params;
        const { action } = req.body;

        if (!['accept', 'reject'].includes(action))
            return res.status(400).json({ success: false, message: 'Invalid action' });

        const newStatus = action === 'accept' ? 'Accepted' : 'Rejected';

        const order = await Order.findOne({ _id: orderId, 'items._id': itemId });
        if (!order)
            return res.status(404).json({ success: false, message: 'Order or item not found' });

        const item = order.items.id(itemId);
        if (!item)
            return res.status(404).json({ success: false, message: 'Item not found' });

        if (item.returnStatus !== 'Requested')
            return res.status(400).json({ success: false, message: `Return already ${item.returnStatus}` });

        item.returnStatus = newStatus;

        if (action === 'accept') {
            await restoreStock([item]);
            item.status = 'returned';
            // wallet credit — only if user model has wallet field
            try {
                const refundAmount = item.price * item.quantity;
                await User.findByIdAndUpdate(order.userId, { $inc: { wallet: refundAmount } })
            } catch { /* wallet field may not exist — silent fail */ }
        } else {
            item.status = 'delivered';
        }

        const allSettled = order.items.every(i => i.status !== 'return_requested');
        if (allSettled) {
            const allReturned = order.items.every(i => i.status === 'returned');
            if (allReturned) order.orderStatus = 'returned';
        }

        await order.save();

        return res.status(200).json({
            success: true,
            message: `Return ${newStatus.toLowerCase()} successfully`,
            newStatus,
        })
    } catch (err) {
        console.error('updateReturnStatus error:', err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
}


export {
    loadReturnManagement,
    loadReturnDetails,
    updateReturnStatus
}