import multer from 'multer';


const upload = multer({
    storage : multer.memoryStorage(),
    limits : {fileSize : 5 * 1024 * 1024},
    fileFilter : (_req,file,cb)=>{
        if(/image\/(jpeg|jpg|png|webp)/.test(file.mimetype)) cb(null,true)
            else cb(new Error ('Only jpg,jpeg,png and webp images are allowed'), false)
    }
})

export default upload