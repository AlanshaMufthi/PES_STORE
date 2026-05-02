import Product from "../../models/productModel.js";
import Category from "../../models/categoryModel.js";
import Cart from '../../models/cartModel.js'
import Wishlist from '../../models/wishlistModel.js'


const PAGE_SIZE = 15;

const buildFilter = (query)=>{

    const filter = {isBlocked : false}

    if(query.q?.trim()){
        filter.$or = [
            {productname : {$regex: query.q.trim(), $options: 'i'}},
            {brand: {$regex: query.q.trim(), $options: 'i'}},
            {description: {$regex: query.q.trim(), $options: 'i'}}
        ]
    }

    if(query.category) filter.category = query.category;
    if(query.gender) filter.gender = query.gender
    if(query.collection) filter.collection = query.collection
    if(query.brand){
        const brands = Array.isArray(query.brand) ? query.brand : [query.brand]
        filter.brand = {$in: brands}
    }

    if(query.minPrice || query.maxPrice){
        const priceFilter = {}
        if(query.minPrice) priceFilter.$gte = Number(query.minPrice)
        if(query.maxPrice) priceFilter.$lte = Number(query.maxPrice)
            filter['variants.offerPrice'] = priceFilter
    }

    if(query.minDiscount){
        filter['variants.discountPercentage'] = {$gte: Number(query.minDiscount)}
    }

    return filter
}

const buildSort = (sortParam)=>{
    switch (sortParam){
        case 'price_low' : return { 'variants.0.offerPrice' : 1 }
        case 'price_high' : return { 'variants.0.offerPrice' : -1 }
        case 'az' : return { productname : 1 }
        case 'za' : return { productname : -1 }
        default : return { createdAt : -1 } 
    }
}

const applyActiveCategoryFilter = (filter, activeCategoryIds, requestedCategory)=>{
    if(requestedCategory){
        const isRequestedActive = activeCategoryIds.some((id)=> id.toString() === requestedCategory.toString())
        filter.category = isRequestedActive ? requestedCategory : null
        return filter
    }

    filter.category = { $in: activeCategoryIds }
    return filter
}


const loadShop = async(req,res)=>{

    try {
        const userId = req.session?.user
        const page = Math.max(1, parseInt(req.query.page) || 1 )
        const filter = buildFilter(req.query)
        const sort = buildSort(req.query.sort)
        const activeCategories = await Category.find({isBlocked : false}).select('_id name').lean()
        const activeCategoryIds = activeCategories.map((c)=> c._id)
        applyActiveCategoryFilter(filter, activeCategoryIds, req.query.category)

        const [products, total, cart, wishlist] = await Promise.all([
            Product.find(filter)
            .populate('category','name')
            .sort(sort)
            .skip((page-1) * PAGE_SIZE )
            .limit( PAGE_SIZE )
            .lean(),
            Product.countDocuments(filter),
            userId ? Cart.findOne({userId}).lean() : null,
            userId ? Wishlist.findOne({userId}).lean() : null

        ])

        const totalPages = Math.ceil(total/PAGE_SIZE)
        
        const cartCount = cart ? cart.items.length : 0
        const wishlistIds = wishlist ? wishlist.products.map(p=> p.productId.toString()) : []

        return res.render('shop', {
            page: 'shop',
            products, categories: activeCategories, total, totalPages,
            currentPage : page,
            searchQuery : req.query.q || '',
            sort : req.query.sort || '',
            cartCount,
            wishlistIds,
            filter : {
                category : req.query.category || '',
                brand : req.query.brand || [],
                gender : req.query.gender || '',
                collection : req.query.collection || '',
                minPrice : req.query.minprice || '',
                maxPrice : req.query.maxPrice || '',
                minDiscount : req.query.minDiscount || '',
            }

        })
    } catch (error) {
        console.log('loadShop Error : ',error)
        res.redirect('/pageNotFound')
    }
}


const loadShopProducts = async(req,res)=>{
    try {
        const page = Math.max(1,parseInt(req.query.page) || 1 )
        const filter = buildFilter(req.query)
        const sort = buildSort(req.query.sort)
        const activeCategories = await Category.find({isBlocked : false}).select('_id').lean()
        const activeCategoryIds = activeCategories.map((c)=> c._id)
        applyActiveCategoryFilter(filter, activeCategoryIds, req.query.category)

        const [products,total] = await Promise.all([
            Product.find(filter)
            .populate('category', 'name')
            .sort(sort)
            .skip((page-1) * PAGE_SIZE )
            .limit(PAGE_SIZE)
            .lean(),
            Product.countDocuments(filter)
        ])

        return res.json({
            products, total,
            totalpages : Math.ceil(total/PAGE_SIZE),
            currentPage : page
        })
    } catch (error) {
        console.log('loadShopProducts Error : ',error)
        res.status(500).json({error:'Server Error'})
    }
}



export { 

    loadShop,
    loadShopProducts,

       }