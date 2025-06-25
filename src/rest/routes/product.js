export const queryProducts = (req, res) => req.namespace.models.product
  .query({ ...req.params, ...req.query })
  .then((response) => res.status(200)
    .json(response));

export const getProduct = (req, res) => req.namespace.models.product
  .get(req.params.id)
  .then((data) => res.status(200).json(data));

export const saveProduct = (req, res) => req.namespace.models.product
  .save(req.params.id, req.body)
  .then(() => res.status(200).json({ message: 'Product saved successfully' }));

export const deleteProduct = (req, res) => req.namespace.models.product
  .delete(req.params.id)
  .then(() => res.status(200).json({ message: 'Product deleted successfully' }));

export const updateProductStock = (req, res) => req.namespace.models.product
  .updateStock(req.params.id, req.body.stockChange)
  .then(() => res.status(200).json({ message: 'Product stock updated successfully' }));

export const updateProductPrice = (req, res) => req.namespace.models.product
  .updatePrice(req.params.id, req.body.price)
  .then(() => res.status(200).json({ message: 'Product price updated successfully' }));

// Category-specific queries
export const getProductsByCategory = (req, res) => req.namespace.models.product
  .query({ ...req.params, ...req.query, category: req.params.category })
  .then((response) => res.status(200)
    .json(response)); 