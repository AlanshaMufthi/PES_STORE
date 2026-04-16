const getUserId = (req)=>{
    const u = req.session.user || req.session.passport?.user
    return typeof u === 'object' ? (u._id || u.userId) : u
}

export default getUserId