import React, { useEffect, useState } from 'react';
import { Heart, Trash2, Edit, PlusCircle, LogOut, User, Lock, ArrowLeft, Save } from 'lucide-react';
import noteService from './services/blogs';
import authService from './services/auth';
import './App.css'

const App = () => {
  const [blogs, setBlogs] = useState([]);
  const [newBlog, setNewBlog] = useState({
    title: '',
    author: '',
    content: '',
    likes: 0,
    image: ''
  });
  const [notification, setNotification] = useState(null);
  const [isWriting, setIsWriting] = useState(false);
  const [editingBlog, setEditingBlog] = useState(null);
  const [imageSource, setImageSource] = useState('url');
  const [selectedBlog, setSelectedBlog] = useState(null);
  
  // Authentication states
  const [user, setUser] = useState(null);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [registerData, setRegisterData] = useState({
    username: '',
    name: '',
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    // Check if user is already logged in
    const loggedUserJSON = window.localStorage.getItem('loggedBlogUser');
    if (loggedUserJSON) {
      const user = JSON.parse(loggedUserJSON);
      setUser(user);
      noteService.setToken(user.token);
    }
  }, []);

  useEffect(() => {
    if (user) {
      noteService
        .getAll()
        .then((Blogs) => {
          setBlogs(Blogs);
        })
        .catch((error) => {
          console.error('Failed to fetch blogs:', error);
          if (error.response?.status === 401) {
            handleLogout();
          }
        });
    }
  }, [user]);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    
    try {
      const user = await authService.login(loginData);
      
      window.localStorage.setItem('loggedBlogUser', JSON.stringify(user));
      noteService.setToken(user.token);
      setUser(user);
      setLoginData({ username: '', password: '' });
      setShowLoginForm(false);
      showNotification(`Welcome back, ${user.name}!`);
    } catch (error) {
      console.error('Login failed:', error);
      showNotification('Invalid username or password', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  const handleRegister = async (event) => {
    event.preventDefault();
    
    if (registerData.password !== registerData.confirmPassword) {
      showNotification('Passwords do not match', 'error');
      return;
    }

    if (registerData.password.length < 3) {
      showNotification('Password must be at least 3 characters long', 'error');
      return;
    }

    try {
      await authService.register({
        username: registerData.username,
        name: registerData.name,
        password: registerData.password
      });
      
      showNotification('Registration successful! Please log in.');
      setRegisterData({ username: '', name: '', password: '', confirmPassword: '' });
      setShowRegisterForm(false);
      setShowLoginForm(true);
    } catch (error) {
      console.error('Registration failed:', error);
      if (error.response?.data?.error) {
        showNotification(error.response.data.error, 'error');
      } else {
        showNotification('Registration failed. Please try again.', 'error');
      }
    }
  };

  const handleLogout = () => {
    window.localStorage.removeItem('loggedBlogUser');
    noteService.setToken(null);
    setUser(null);
    setBlogs([]);
    setIsWriting(false);
    setEditingBlog(null);
    setSelectedBlog(null);
    showNotification('Logged out successfully');
  };

  // Check if the current user is the owner of the blog
  const isOwner = (blog) => {
    return blog.user && user && (blog.user.id === user.id || blog.user === user.id);
  };

  const deleteInfo = (event, id) => {
    event.preventDefault();
    const blogToDelete = blogs.find(blog => blog.id === id);
    
    // Only allow deletion if user is the owner
    if (!isOwner(blogToDelete)) {
      showNotification('You can only delete your own blogs', 'error');
      return;
    }

    if (window.confirm('Are you sure you want to delete this blog?')) {
      noteService
        .deleteBlog(id)
        .then(() => {
          setBlogs(blogs.filter((blog) => blog.id !== id));
          setSelectedBlog(null);
          showNotification('Blog deleted successfully');
        })
        .catch((error) => {
          console.error('Failed to delete blog:', error);
          if (error.response?.status === 401) {
            handleLogout();
          } else if (error.response?.status === 403) {
            showNotification('You can only delete your own blogs', 'error');
          } else {
            showNotification('Failed to delete blog', 'error');
          }
        });
    }
  };

  const saveBlog = () => {
    if (!newBlog.title.trim()) {
      showNotification('Title is required', 'error');
      return;
    }

    if (!newBlog.content.trim()) {
      showNotification('Content is required', 'error');
      return;
    }
    
    const blogToCreate = {
      ...newBlog,
      author: newBlog.author || user.name // Use logged in user's name if no author specified
    };
    
    if (editingBlog) {
      // Update existing blog
      noteService
        .update(editingBlog.id, blogToCreate)
        .then((returned) => {
          setBlogs(blogs.map(blog => blog.id === editingBlog.id ? returned : blog));
          setNewBlog({
            title: '',
            author: '',
            content: '',
            likes: 0,
            image: ''
          });
          setIsWriting(false);
          setEditingBlog(null);
          showNotification('Blog updated successfully');
        })
        .catch((error) => {
          console.error('Failed to update blog:', error);
          if (error.response?.status === 401) {
            handleLogout();
          } else {
            showNotification('Failed to update blog', 'error');
          }
        });
    } else {
      // Create new blog
      noteService
        .create(blogToCreate)
        .then((returned) => {
          setBlogs(blogs.concat(returned));
          setNewBlog({
            title: '',
            author: '',
            content: '',
            likes: 0,
            image: ''
          });
          setIsWriting(false);
          showNotification('New blog published successfully');
        })
        .catch((error) => {
          console.error('Failed to add blog:', error);
          if (error.response?.status === 401) {
            handleLogout();
          } else {
            showNotification('Failed to publish blog', 'error');
          }
        });
    }
  };

  const startWriting = () => {
    setIsWriting(true);
    setEditingBlog(null);
    setNewBlog({
      title: '',
      author: '',
      content: '',
      likes: 0,
      image: ''
    });
    setSelectedBlog(null);
  };

  const editBlog = (blog) => {
    if (!isOwner(blog)) {
      showNotification('You can only edit your own blogs', 'error');
      return;
    }

    setEditingBlog(blog);
    setNewBlog({
      title: blog.title,
      author: blog.author,
      content: blog.content,
      likes: blog.likes,
      image: blog.image || ''
    });
    setIsWriting(true);
    setSelectedBlog(null);
  };

  const handleBlogChange = (event) => {
    const { name, value } = event.target;
    setNewBlog((prevBlog) => ({
      ...prevBlog,
      [name]: value
    }));
  };

  const handleLoginChange = (event) => {
    const { name, value } = event.target;
    setLoginData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRegisterChange = (event) => {
    const { name, value } = event.target;
    setRegisterData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewBlog((prevBlog) => ({
          ...prevBlog,
          image: reader.result,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const updateLikes = (id, currentLikes) => {
    const blogToUpdate = blogs.find(blog => blog.id === id);
    
    // Prevent users from liking their own blogs
    if (isOwner(blogToUpdate)) {
      showNotification('You cannot like your own blog', 'error');
      return;
    }

    const updatedBlog = { likes: currentLikes + 1 };

    noteService
      .update(id, updatedBlog)
      .then((returned) => {
        setBlogs(
          blogs.map((blog) => (blog.id === id ? { ...blog, likes: returned.likes } : blog))
        );
        if (selectedBlog && selectedBlog.id === id) {
          setSelectedBlog({ ...selectedBlog, likes: returned.likes });
        }
        showNotification('You liked the blog');
      })
      .catch((error) => {
        console.error('Failed to update likes:', error);
        if (error.response?.status === 401) {
          handleLogout();
        } else if (error.response?.status === 403) {
          showNotification('You cannot like your own blog', 'error');
        } else {
          showNotification('Failed to update likes', 'error');
        }
      });
  };

  const viewBlog = (blog) => {
    setSelectedBlog(blog);
    setIsWriting(false);
  };

  const goBackToHome = () => {
    setSelectedBlog(null);
    setIsWriting(false);
    setEditingBlog(null);
  };

  // If user is not logged in, show login/register interface
  if (!user) {
    return (
      <div className="app-container">
        {/* Navbar for unauthenticated users */}
        <nav className="navbar">
          <h1 className="navbar-title">Blog-O-Matic</h1>
          <div className="nav-buttons">
            <button 
              onClick={() => {
                setShowLoginForm(true);
                setShowRegisterForm(false);
              }}
              className="nav-button login-button"
            >
              <User className="nav-icon" /> Login
            </button>
            <button 
              onClick={() => {
                setShowRegisterForm(true);
                setShowLoginForm(false);
              }}
              className="nav-button register-button"
            >
              Register
            </button>
          </div>
        </nav>

        {/* Notification */}
        {notification && (
          <div className={`notification ${notification.type === 'error' ? 'notification-error' : 'notification-success'}`}>
            {notification.message}
          </div>
        )}

        {/* Welcome Section */}
        <div className="welcome-section">
          <h2 className="welcome-title">Welcome to Blog-O-Matic</h2>
          <p className="welcome-description">Discover amazing blogs and share your own stories. Please log in or register to continue.</p>
        </div>

        {/* Login Form */}
        {showLoginForm && (
          <div className="modal-overlay" onClick={() => setShowLoginForm(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="auth-form">
                <h2 className="form-title"><Lock className="form-icon" /> Login</h2>
                <input
                  name="username"
                  value={loginData.username}
                  onChange={handleLoginChange}
                  placeholder="Username"
                  className="form-input"
                  required
                />
                <input
                  name="password"
                  type="password"
                  value={loginData.password}
                  onChange={handleLoginChange}
                  placeholder="Password"
                  className="form-input"
                  required
                />
                <button onClick={handleLogin} className="submit-button" disabled={loading}>
                  {loading ? 'Logging in...' : 'Login'}
                </button>
                <p className="form-switch">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setShowLoginForm(false);
                      setShowRegisterForm(true);
                    }}
                    className="link-button"
                  >
                    Register here
                  </button>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Register Form */}
        {showRegisterForm && (
          <div className="modal-overlay" onClick={() => setShowRegisterForm(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <form onSubmit={handleRegister} className="auth-form">
                <h2 className="form-title"><User className="form-icon" /> Register</h2>
                <input
                  name="username"
                  value={registerData.username}
                  onChange={handleRegisterChange}
                  placeholder="Username"
                  className="form-input"
                  required
                />
                <input
                  name="name"
                  value={registerData.name}
                  onChange={handleRegisterChange}
                  placeholder="Full Name"
                  className="form-input"
                  required
                />
                <input
                  name="password"
                  type="password"
                  value={registerData.password}
                  onChange={handleRegisterChange}
                  placeholder="Password"
                  className="form-input"
                  required
                />
                <input
                  name="confirmPassword"
                  type="password"
                  value={registerData.confirmPassword}
                  onChange={handleRegisterChange}
                  placeholder="Confirm Password"
                  className="form-input"
                  required
                />
                <button type="submit" className="submit-button">
                  Register
                </button>
                <p className="form-switch">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setShowRegisterForm(false);
                      setShowLoginForm(true);
                    }}
                    className="link-button"
                  >
                    Login here
                  </button>
                </p>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Writing/Editing Interface
  if (isWriting) {
    return (
      <div className="app-container">
        {/* Writing Navbar */}
        <nav className="navbar writing-navbar">
          <div className="nav-left">
            <button onClick={goBackToHome} className="back-button">
              <ArrowLeft className="nav-icon" /> Back
            </button>
            <h1 className="navbar-title">
              {editingBlog ? 'Edit Blog' : 'Write New Blog'}
            </h1>
          </div>
          <div className="nav-right">
            <span className="user-greeting">Welcome, {user.name}!</span>
            <button onClick={saveBlog} className="save-button">
              <Save className="nav-icon" /> {editingBlog ? 'Update' : 'Publish'}
            </button>
            <button onClick={handleLogout} className="nav-button logout-button">
              <LogOut className="nav-icon" /> Logout
            </button>
          </div>
        </nav>

        {/* Notification */}
        {notification && (
          <div className={`notification ${notification.type === 'error' ? 'notification-error' : 'notification-success'}`}>
            {notification.message}
          </div>
        )}

        {/* Writing Interface */}
        <div className="writing-container">
          <div className="writing-form">
            {/* Image Section */}
            <div className="image-section">
              <div className="image-options">
                <label className="radio-label">
                  <input 
                    type="radio" 
                    value="url"
                    checked={imageSource === 'url'}
                    onChange={() => setImageSource('url')}
                  />
                  Image URL
                </label>
                <label className="radio-label">
                  <input 
                    type="radio" 
                    value="upload"
                    checked={imageSource === 'upload'}
                    onChange={() => setImageSource('upload')}
                  />
                  Upload Image
                </label>
              </div>

              {imageSource === 'url' ? (
                <input
                  name="image"
                  value={newBlog.image || ''}
                  onChange={handleBlogChange}
                  placeholder="Paste image URL here..."
                  className="image-input"
                />
              ) : (
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="file-input"
                />
              )}

              {newBlog.image && (
                <div className="image-preview">
                  <img 
                    src={newBlog.image} 
                    alt="Preview" 
                    className="preview-image"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>

            {/* Title Input */}
            <input
              name="title"
              value={newBlog.title}
              onChange={handleBlogChange}
              placeholder="Title"
              className="title-input"
              required
            />

            {/* Author Input */}
            <input
              name="author"
              value={newBlog.author}
              onChange={handleBlogChange}
              placeholder={`Author Name (default: ${user.name})`}
              className="author-input"
            />

            {/* Content Textarea */}
            <textarea
              name="content"
              value={newBlog.content}
              onChange={handleBlogChange}
              placeholder="Tell your story..."
              className="content-textarea"
              required
            />
          </div>
        </div>
      </div>
    );
  }

  // Blog Detail View
  if (selectedBlog) {
    return (
      <div className="app-container">
        {/* Detail Navbar */}
        <nav className="navbar">
          <div className="nav-left">
            <button onClick={goBackToHome} className="back-button">
              <ArrowLeft className="nav-icon" /> Back
            </button>
          </div>
          <div className="nav-right">
            <span className="user-greeting">Welcome, {user.name}!</span>
            <button onClick={startWriting} className="nav-button write-button">
              <PlusCircle className="nav-icon" /> Write
            </button>
            <button onClick={handleLogout} className="nav-button logout-button">
              <LogOut className="nav-icon" /> Logout
            </button>
          </div>
        </nav>

        {/* Notification */}
        {notification && (
          <div className={`notification ${notification.type === 'error' ? 'notification-error' : 'notification-success'}`}>
            {notification.message}
          </div>
        )}

        {/* Blog Detail */}
        <div className="blog-detail">
          <article className="blog-article">
            {selectedBlog.image && (
              <div className="article-image-container">
                <img 
                  src={selectedBlog.image} 
                  alt={selectedBlog.title} 
                  className="article-image"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
            )}
            
            <div className="article-content">
              <h1 className="article-title">{selectedBlog.title}</h1>
              
              <div className="article-meta">
                <span className="article-author">By {selectedBlog.author}</span>
                {isOwner(selectedBlog) && <span className="owner-badge">Your Blog</span>}
              </div>

              <div className="article-text">
                {selectedBlog.content.split('\n').map((paragraph, index) => (
                  <p key={index} className="article-paragraph">{paragraph}</p>
                ))}
              </div>

              <div className="article-actions">
                {!isOwner(selectedBlog) ? (
                  <button 
                    className="like-button" 
                    onClick={() => updateLikes(selectedBlog.id, selectedBlog.likes)}
                  >
                    <Heart className="heart-icon" /> {selectedBlog.likes} Likes
                  </button>
                ) : (
                  <div className="like-display">
                    <Heart className="heart-icon-disabled" /> {selectedBlog.likes} Likes
                  </div>
                )}
                
                {isOwner(selectedBlog) && (
                  <div className="owner-actions">
                    <button 
                      onClick={() => editBlog(selectedBlog)}
                      className="edit-button"
                    >
                      <Edit className="edit-icon" /> Edit
                    </button>
                    <button 
                      onClick={(event) => deleteInfo(event, selectedBlog.id)}
                      className="delete-button"
                    >
                      <Trash2 className="delete-icon" /> Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          </article>
        </div>
      </div>
    );
  }

  // Main Dashboard View
  const featuredBlogs = [...blogs]
    .sort((a, b) => b.likes - a.likes)
    .slice(0, 3);

  const recentBlogs = [...blogs]
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 6);

  return (
    <div className="app-container">
      {/* Main Navbar */}
      <nav className="navbar">
        <h1 className="navbar-title">Blog-O-Matic</h1>
        <div className="nav-user-section">
          <span className="user-greeting">Welcome, {user.name}!</span>
          <button onClick={startWriting} className="nav-button write-button">
            <PlusCircle className="nav-icon" /> Write
          </button>
          <button onClick={handleLogout} className="nav-button logout-button">
            <LogOut className="nav-icon" /> Logout
          </button>
        </div>
      </nav>

      {/* Notification */}
      {notification && (
        <div className={`notification ${notification.type === 'error' ? 'notification-error' : 'notification-success'}`}>
          {notification.message}
        </div>
      )}

      {/* Main Dashboard Content */}
      <div className="dashboard-content">
        {/* Featured Blogs Section */}
        {featuredBlogs.length > 0 && (
          <section className="featured-section">
            <h2 className="section-title">Top Liked Blogs</h2>
            <div className="featured-grid">
              {featuredBlogs.map((blog) => (
                <div key={blog.id} className="featured-card" onClick={() => viewBlog(blog)}>
                  {blog.image && (
                    <div className="card-image-container">
                      <img 
                        src={blog.image} 
                        alt={blog.title} 
                        className="card-image"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  <div className="card-content">
                    <h3 className="card-title">{blog.title}</h3>
                    <p className="card-author">By {blog.author}</p>
                    <p className="card-excerpt">
                      {(blog.content.length || '' )> 100 
                        ? blog.content.substring(0, 100) + '...' 
                        : blog.content}
                    </p>
                    <div className="card-meta">
                      <span className="card-likes">{blog.likes} likes</span>
                      {isOwner(blog) && <span className="owner-badge">Your Blog</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* All Blogs Section */}
        <section className="all-blogs-section">
          <h2 className="section-title">All Stories</h2>
          <div className="blogs-grid">
            {blogs.map((blog) => (
              <div key={blog.id} className="blog-card" onClick={() => viewBlog(blog)}>
                {blog.image && (
                  <div className="card-image-container">
                    <img 
                      src={blog.image}
                      alt={blog.title} 
                      className="card-image"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                )}
                <div className="card-content">
                  <h3 className="card-title">{blog.title}</h3>
                  <p className="card-author">By {blog.author}</p>
                  <p className="card-excerpt">
                    {(blog.content.length || '' )> 150 
                      ? blog.content.substring(0, 150) + '...' 
                      : blog.content}
                  </p>
                  <div className="card-footer">
                    <div className="card-meta">
                      <span className="card-likes">
                        <Heart className="heart-icon-small" /> {blog.likes}
                      </span>
                      {isOwner(blog) && <span className="owner-badge">Your Blog</span>}
                    </div>
                    
                    {isOwner(blog) && (
                      <div className="card-actions" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={() => editBlog(blog)}
                          className="action-button edit-action"
                          title="Edit blog"
                        >
                          <Edit className="action-icon" />
                        </button>
                        <button 
                          onClick={(event) => deleteInfo(event, blog.id)}
                          className="action-button delete-action"
                          title="Delete blog"
                        >
                          <Trash2 className="action-icon" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default App