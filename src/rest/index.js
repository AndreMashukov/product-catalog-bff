import Connector from '../connectors/dynamodb';
import ProductModel from '../models/product';
import ProductVariantModel from '../models/product-variant';
import {
  queryProducts, getProduct, saveProduct, deleteProduct,
  updateProductStock, updateProductPrice, getProductsByCategory,
} from './routes/product';
import {
  saveProductVariant, deleteProductVariant,
  updateVariantStock, updateVariantPrice,
} from './routes/product-variant';
import {
  debug,
  cors,
  getClaims/* , forRole */,
  errorHandler,
  // serializer,
} from '../utils';

const api = require('lambda-api')({
  // isBase64: true,
  // headers: {
  //   'content-encoding': ['gzip'],
  // },
  // serializer: (body) => serializer(body),
  logger: {
    level: 'trace',
    access: true,
    detail: true,
    stack: true,
  },
});

const models = (req, res, next) => {
  const claims = getClaims(req.requestContext);
  const connector = new Connector(
    req.namespace.debug,
    process.env.ENTITY_TABLE_NAME,
  );

  api.app({
    debug: req.namespace.debug,
    models: {
      product: new ProductModel({
        debug: req.namespace.debug,
        connector,
        claims,
      }),
      productVariant: new ProductVariantModel({
        debug: req.namespace.debug,
        connector,
        claims,
      }),
    },
  });

  return next();
};

api.use(cors);
api.use(debug(api));
api.use(errorHandler);
api.use(models);

['', `/api-${process.env.PROJECT}`]
  .forEach((prefix) => api.register((api) => { // eslint-disable-line no-shadow
    // Product routes
    api.get('/products', queryProducts);
    api.get('/products/category/:category', getProductsByCategory);
    api.get('/products/:id', getProduct);
    api.put('/products/:id', /* forRole('manager'), */ saveProduct);
    api.delete('/products/:id', /* forRole('admin'), */ deleteProduct);
    api.patch('/products/:id/stock', /* forRole('manager'), */ updateProductStock);
    api.patch('/products/:id/price', /* forRole('manager'), */ updateProductPrice);

    // Product variant routes
    api.put('/products/:id/variants/:variantId', /* forRole('manager'), */ saveProductVariant);
    api.delete('/products/:id/variants/:variantId', /* forRole('admin'), */ deleteProductVariant);
    api.patch('/products/:id/variants/:variantId/stock', /* forRole('manager'), */ updateVariantStock);
    api.patch('/products/:id/variants/:variantId/price', /* forRole('manager'), */ updateVariantPrice);
  }, { prefix }));

// eslint-disable-next-line import/prefer-default-export
export const handle = async (event, context) => api.run(event, context);
