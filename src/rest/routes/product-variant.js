export const saveProductVariant = (req, res) => req.namespace.models.productVariant
  .save(req.params, req.body)
  .then(() => res.status(200).json({ message: 'Product variant saved successfully' }));

export const deleteProductVariant = (req, res) => req.namespace.models.productVariant
  .delete(req.params)
  .then(() => res.status(200).json({ message: 'Product variant deleted successfully' }));

export const updateVariantStock = (req, res) => req.namespace.models.productVariant
  .updateStock(req.params, req.body.stockChange)
  .then(() => res.status(200).json({ message: 'Product variant stock updated successfully' }));

export const updateVariantPrice = (req, res) => req.namespace.models.productVariant
  .updatePrice(req.params, req.body.price)
  .then(() => res.status(200).json({ message: 'Product variant price updated successfully' })); 