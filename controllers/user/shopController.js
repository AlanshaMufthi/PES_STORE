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


const loadShop = async(req,res)=>{
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1)
        const filter = buildFilter(req.query)
        const sort = req.query.sort || ''

        const [allProducts,total,categories] = await Promise.all([
            Product.find(filter).populate('category', 'name').lean(),
            Product.countDocuments(filter),
            Category.find({isBlocked : false}).lean()
        ])
        // display offer price when offer is active. else base price
        const getDisplayPrice = (product)=>{
            const v = product.variants?.[0]
            if(!v) return 0;
            return v.offerActive ? v.offerPrice : v.productPrice
        }

        let sortedProducts = [...allProducts];
        switch (sort){
            case 'price_low' : 
                sortedProducts.sort((a,b)=> getDisplayPrice(a) - getDisplayPrice(b))
                break;
            case 'price_high' :
                sortedProducts.sort((a,b)=> getDisplayPrice(b) - getDisplayPrice(a))
                break;
            case 'az' :
                sortedProducts.sort((a,b)=> a.productname.localeCompare(b.productname))
                break;
            case 'za' :
                sortedProducts.sort((a,b)=> b.productname.localeCompare(a.productname))
                break;
            default :
                sortedProducts.sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt))
                break


        }

        // paginate after sorting
        const paginatedProducts = sortedProducts.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE)
        const totalPages = Math.ceil(total/PAGE_SIZE)
        const cart = await Cart.findOne({userId: req.session.user}).lean()
        const cartCount = req.session?.cart ? req.session.cart.length : 0
        
        let wishlistIds = []
        if(req.session?.user){
            try {
                
                const wishlist = await Wishlist.findOne({userId: req.session.user}).lean()
                if(wishlist){
                    wishlistIds = wishlist.products.map((p)=> 
                    ( p.productId || '' ).toString()
                    )
                }

            } catch (error) {
               console.log('wishlist fetch Error : ',error)  
            }
        }

        return res.render('shop',{
            page:'shop',
            products: paginatedProducts,
            categories,
            total,
            totalPages,
            currentPage : page,
            searchQuery : req.query.q || '',
            sort,
            cartCount,
            wishlistIds,
            filter : {
                category : req.query.category || '',
                brand : req.query.brand || [],
                gender : req.query.gender || '',
                collection : req.query.collection || '',
                minPrice : req.query.minPrice || '',
                maxPrice : req.query.maxPrice || '',
                minDiscount : req.query.minDiscount || ''
            }
        })

    } catch (error) {
       console.log('loadShop Error : ', error)
       res.redirect('/pageNotFound') 
    }
}

export { loadShop }