const bcrypt =require('bcrypt')
const router= require('express').Router()
const User = require('../models/user')

router.post('/', async(req,res)=>{
    const {username,name,password}=req.body
    const passwordHash = await bcrypt.hash(password, 10)

    const user = new User({username,name,passwordHash})
    const savedUser = await user.save()
    res.status(201).json(savedUser)
})

router.get('/', async (request, response) => {
    const users = await User.find({}).populate('blogs',{"title":1,"author":1,"id":1})
    response.json(users)
  })

module.exports = router