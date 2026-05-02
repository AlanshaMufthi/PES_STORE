const getUserId = (req)=>{
    const rawUser = req.session.user || req.user?._id || req.session.passport?.user

    const normalizeId = (value)=>{
        if(!value){
            return null
        }

        if(typeof value === 'string'){
            return value
        }

        if(typeof value === 'object'){
            const nested = value._id || value.userId || value.id
            if(nested){
                return typeof nested === 'string' ? nested : nested.toString()
            }

            if(typeof value.toString === 'function'){
                const asString = value.toString()
                if(asString && asString !== '[object Object]'){
                    return asString
                }
            }
        }

        return null
    }

    return normalizeId(rawUser)
}

export default getUserId