import React, { useState, useEffect } from 'react';
import { productAPI, orderAPI } from '../api/api';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import './Products.css';
import { useNavigate, Link } from 'react-router-dom';
import { FaSeedling, FaMapMarkerAlt, FaUser, FaPhone, FaBoxOpen, FaShoppingCart, FaComments } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import noImage from '../assets/Images/no-image.png';
import GoLiveChatModal from '../components/GoLiveChatModal';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [orderQuantity, setOrderQuantity] = useState({});
  const [orderMessage, setOrderMessage] = useState({ text: '', type: '' });
  const [showGoLive, setShowGoLive] = useState(false);
  const BASE_URL = 'https://krishilink.shamir.com.np';
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await productAPI.getAllProducts();

      // Log the full response data for debugging
      console.log("Products API response:", response.data);

      let productsArray = [];
      if (Array.isArray(response.data)) {
        productsArray = response.data;
      } else if (response.data && Array.isArray(response.data.data)) {
        productsArray = response.data.data;
      } else {
        setError('Unexpected API response format.');
        setLoading(false);
        return;
      }

      // Map the products to include the image URL
      const productsWithImages = productsArray.map(product => ({
        ...product,
        imageUrl: product.imageCode ? `${BASE_URL}/api/Product/getProductImage/${product.imageCode}` : null
      }));
      setProducts(productsWithImages);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError(err.message || 'Failed to load products. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleImageError = (e) => {
    e.target.src = noImage;
  };

  const handleSeeDetails = (productId) => {
    navigate(`/products/${productId}`);
  };

  const handleQuantityChange = (productId, value) => {
    setOrderQuantity(prev => ({
      ...prev,
      [productId]: value
    }));
  };

  const handlePlaceOrder = async (product) => {
    if (!user) {
      setOrderMessage({ text: 'Please login to place an order', type: 'error' });
      return;
    }

    if (user.role !== 'buyer') {
      setOrderMessage({ text: 'Only buyers can place orders', type: 'error' });
      return;
    }
    

    const quantity = orderQuantity[product.productId];
    if (!quantity || quantity <= 0) {
      setOrderMessage({ text: 'Please enter a valid quantity', type: 'error' });
      return;
    }

    if (quantity > product.availableQuantity) {
      setOrderMessage({ text: 'Order quantity exceeds available quantity', type: 'error' });
      return;
    }

    try {
      const orderData = {
        productId: product.productId,
        quantity: parseInt(quantity),
        buyerId: user.id,
        farmerId: product.farmerId,
        totalAmount: product.rate * quantity
      };

      const response = await orderAPI.addOrder(orderData);

      setOrderMessage({ text: 'Order placed successfully!', type: 'success' });
      // Clear the quantity input for this product
      setOrderQuantity(prev => ({
        ...prev,
        [product.productId]: ''
      }));
      // Refresh products to update available quantity
      fetchProducts();
    } catch (err) {
      console.error('Error placing order:', err);
      setOrderMessage({ text: err.response?.data?.message || 'Failed to place order', type: 'error' });
    }
  };

  const handleLiveChat = (product) => {
    if (!user) {
      navigate('/login');
    } else {
      alert(`Open live chat for product: ${product.productName}`);
    }
  };

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading products...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (error && (error.toLowerCase().includes('not found') || error === 'Unexpected API response format.')) {
    // Try to extract a message from the error or API response
    let apiMessage = error === 'Unexpected API response format.' ? 'No products found.' : error;
    return (
      <div>
        <Navbar />
        <div className="products-container">
          <h1>Our Products</h1>
          <div className="no-products-message">
            <h2>{apiMessage}</h2>
            <p>
              Please <Link to="/add-product" className="add-product-link">add your first product!</Link>
            </p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Navbar />
        <div className="error-container">
          <p>{error}</p>
          <button onClick={fetchProducts} className="retry-button">
            Retry
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div>
      <Navbar />
      <div className="products-container">
        <h1>Our Products</h1>
        {orderMessage.text && (
          <div className={`order-message ${orderMessage.type}`}>
            {orderMessage.text}
          </div>
        )}
        {products.length === 0 ? (
          <div className="no-products-message">
            <h2>{(error && (error.toLowerCase().includes('not found') || error === 'Unexpected API response format.')) ? (error === 'Unexpected API response format.' ? 'No products found.' : error) : 'No products found.'}</h2>
            <p>
              Please <Link to="/add-product" className="add-product-link">add your first product!</Link>
            </p>
          </div>
        ) : (
          <div className="products-grid">
            {products.map((product) => (
              <motion.div
                key={product.productId}
                className="product-card"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <div className="product-image">
                  <img 
                    src={product.imageUrl || noImage} 
                    alt={product.productName}
                    onError={handleImageError}
                  />
                </div>
                <div className="product-info">
                  <h3>{product.productName}</h3>
                  <p className="price">₹{product.rate} per kg</p>
                  <p className="description">{product.description}</p>
                  <div className="seller-info">
                    <p><FaUser /> {product.farmerName}</p>
                    <p><FaMapMarkerAlt /> {product.city}</p>
                  </div>
                  {/* Remove standalone Live Chat Button */}
                  <div className="product-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button 
                      className="view-details-btn"
                      onClick={() => handleSeeDetails(product.productId)}
                    >
                      View Details
                    </button>
                    <button
                      className="live-chat-btn"
                      onClick={() => setShowGoLive(true)}
                      title="Go Live"
                      type="button"
                    >
                      Go Live
                    </button>
                  </div>
                  {user && user.role === 'buyer' && (
                    <div className="order-section">
                      <input
                        type="number"
                        min="1"
                        max={product.availableQuantity}
                        value={orderQuantity[product.productId] || ''}
                        onChange={(e) => handleQuantityChange(product.productId, e.target.value)}
                        placeholder="Quantity"
                        className="quantity-input"
                      />
                      <button
                        className="order-btn"
                        onClick={() => handlePlaceOrder(product)}
                      >
                        <FaShoppingCart /> Order
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
      <Footer />
      <GoLiveChatModal open={showGoLive} onClose={() => setShowGoLive(false)} />
    </div>
  );
};

export default Products;