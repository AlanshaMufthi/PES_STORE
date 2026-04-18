import Product from "../../models/productModel.js";
import Category from "../../models/categoryModel.js";
import Cart from '../../models/cartModel.js'
import Wishlist from '../../models/wishlistModel.js'


const PAGE_SIZE = 12;

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
        case 'price_low' : return { 'variant.0.offerPrice' : 1 }
        case 'price_high' : return { 'variant.0.offerPrice' : -1 }
        case 'az' : return { productname : 1 }
        case 'za' : return { productname : -1 }
        default : return { createdAt : -1 } 
    }
}


const loadShop = async(req,res)=>{

    try {
        const page = Math.max(1, parseInt(req.query.page) || 1 )
        const filter = buildFilter(req.query)
        const sort = buildSort(req.query.sort)

        const [products, total, categories] = await Promise.all([
            Product.find(filter)
            .populate('category','name')
            .sort(sort)
            .skip((page-1) * PAGE_SIZE )
            .limit( PAGE_SIZE )
            .lean(),
            Product.countDocuments(filter),
            Category.find({isBlocked : false}).lean()
        ])

        const totalPages = Math.ceil(total/PAGE_SIZE)
        const cartCount = req.session?.cart ? req.session.cart.length : 0

        return res.render('shop', {
            page: 'shop',
            products, categories, total, totalPages,
            currentPage : page,
            searchQuery : req.query.q || '',
            sort : req.query.sort || '',
            cartCount,
            filter : {
                category : req.query.category || '',
                brand : req.query.brand || [],
                gender : req.query.gender || '',
                collection : req.query.collection || '',
                minPrice : req.query.minprice || '',
                maxprice : req.query.maxPrice || '',
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

        const [products,total] = await Promise.all([
            Product.find(filter)
            .populate('category', 'name')
            .sort(sort)
            .skip((page-1) * PAGE_SIZE )
            .limit(PAGE_SIZE)
            .lean(),
            Products.countDocuments(filter)
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