import User from '../../models/userModel.js'
import getUserId from "../../helpers/getUserId.js"

const loadAbout = async (req, res) => {
    try {
        const userId = getUserId(req)
        const user = userId ? await User.findById(userId) : null

        const stats = {
            monthlySales: '33k',
            activeCustomers: '45.5k',
            annualSales: '25k'
        }

        res.render('about', { stats, user })
    } catch (error) {
        console.log('loadAbout error: ', error)
        res.redirect('/pageNotFound')
    }
}

export {
    loadAbout,
}