const dummy = (blogs) => {
    return 1
  }
  
const totalLikes = (blogs) => {
    return blogs.reduce((sum, item) => sum + item.likes, 0);
};

const favoriteBlog = (blogs) => {
    const maxLikes = Math.max(...blogs.map(blog => blog.likes));
    const favoriteBlog = blogs.find(blog => blog.likes === maxLikes);
    return favoriteBlog;
}


module.exports = {
    dummy,
    totalLikes,
    favoriteBlog
  }