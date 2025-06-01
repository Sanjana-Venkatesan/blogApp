const router = require('express').Router();
const Blog = require('../models/blog');
const User = require('../models/user')
const jwt = require('jsonwebtoken')

router.get('/', (request, response) => {
    Blog.find({}).populate('user',{"username":1,"name":1,"id":1})
        .then(blogs => {
            response.json(blogs);
        });
});

const getTokenFrom = request => {
    const authorization = request.get('authorization')
    if (authorization && authorization.startsWith('Bearer ')) {
      return authorization.replace('Bearer ', '')
    }
    return null
  }  

router.post('/', async (request, response,next) => {
    const body = request.body
    const decodedToken = jwt.verify(getTokenFrom(request), process.env.SECRET)
    if (!decodedToken.id) {
    return response.status(401).json({ error: 'token invalid' })
     }  
    const user = await User.findById(decodedToken.id)
    const blog = new Blog({
        title: body.title,
        author: body.author,
        content: body.content,
        likes: body.likes,
        image:body.image,
        user:user.id
    })

    const savedBlog = await blog.save()
    user.blogs = user.blogs.concat(savedBlog.id)
    await user.save()
    response.status(201).json(savedBlog)
});


router.delete('/:id', async (req, res) => {
    try {
        const decodedToken = jwt.verify(getTokenFrom(req), process.env.SECRET);
        if (!decodedToken.id) {
            return res.status(401).json({ error: 'token invalid' });
        }

        const blog = await Blog.findById(req.params.id);
        if (!blog) {
            return res.status(404).json({ error: 'blog not found' });
        }

        if (blog.user.toString() !== decodedToken.id) {
            return res.status(403).json({ error: 'unauthorized action' });
        }

        const user = await User.findById(blog.user);
        if (user) {
            user.blogs = user.blogs.filter(blogId => blogId.toString() !== req.params.id);
            await user.save();
        }

        await Blog.findByIdAndDelete(req.params.id);
        res.status(204).end();
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});


router.put('/:id', (req, res) => {
    const id = req.params.id;

    Blog.findByIdAndUpdate(id, req.body, { new: true }) // Directly use req.body
        .then(result => {
            res.json(result);
        })
        .catch(error => {
            res.status(400).json({ error: error.message });
        });
});

module.exports = router;
