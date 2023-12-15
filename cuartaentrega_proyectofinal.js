const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors'); 
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const port = 8080;

mongoose.connect('mongodb+srv://<usuario>:<contraseña>@<cluster>/<base_de_datos>?retryWrites=true&w=majority', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'Error de conexión a MongoDB:'));
db.once('open', () => {
  console.log('Conexión exitosa a MongoDB');
});
db.on('error', (err) => console.error('Error de conexión a MongoDB:', err)); 
const Product = require('./dao/models/productModel');
const Cart = require('./dao/models/cartModel');
const Message = require('./dao/models/messageModel');

app.use(cors()); 
app.use(express.json());

const { query } = require('express');

app.get('/api/products', async (req, res) => {
  try {
    const { limit = 10, page = 1, sort, query: searchQuery } = req.query;
    const skip = (page - 1) * limit;
    const filter = searchQuery ? { $or: [{ category: searchQuery }, { availability: searchQuery }] } : {};
    const sortOrder = sort === 'desc' ? -1 : 1;

    const totalProducts = await Product.countDocuments(filter);
    const totalPages = Math.ceil(totalProducts / limit);

    const products = await Product.find(filter)
      .sort({ price: sortOrder })
      .skip(skip)
      .limit(parseInt(limit));

    const result = {
      status: 'success',
      payload: products,
      totalPages,
      prevPage: page > 1 ? page - 1 : null,
      nextPage: page < totalPages ? page + 1 : null,
      page: parseInt(page),
      hasPrevPage: page > 1,
      hasNextPage: page < totalPages,
      prevLink: page > 1 ? `/api/products?limit=${limit}&page=${page - 1}&sort=${sort}&query=${searchQuery}` : null,
      nextLink: page < totalPages ? `/api/products?limit=${limit}&page=${page + 1}&sort=${sort}&query=${searchQuery}` : null,
    };

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
});

const cartsController = require('./controllers/cartsController')(Cart, Product);

app.delete('/api/carts/:cid/products/:pid', cartsController.deleteProductFromCart);
app.put('/api/carts/:cid', cartsController.updateCart);
app.put('/api/carts/:cid/products/:pid', cartsController.updateProductQuantity);
app.delete('/api/carts/:cid', cartsController.deleteAllProductsFromCart);

const cartSchema = new mongoose.Schema({
  
  products: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
  }],
});

const Cart = mongoose.model('Cart', cartSchema);

app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));

io.on('connection', (socket) => {
 
});

server.listen(port, () => {
  console.log(`Servidor escuchando en el puerto ${port}`);
});
