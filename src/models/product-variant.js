import {
  now, ttl, mapper, sortKeyTransform,
} from '../utils';

export const DISCRIMINATOR = 'product-variant';
export const ALIAS = 'variants';

export const MAPPER = mapper({
  transform: { sk: sortKeyTransform },
  rename: {
    sk: 'id',
  },
});

class Model {
  constructor({
    connector,
    debug,
    claims = { username: 'system' },
  } = {}) {
    this.claims = claims;
    this.debug = debug;
    this.connector = connector;
  }

  save({ id, variantId }, variant) {
    const timestamp = now();

    // Validate required fields for product variant
    if (!variant.sku || !variant.price) {
      throw new Error('Variant SKU and price are required');
    }

    return this.connector.update(
      {
        pk: id,
        sk: `${ALIAS}|${variantId}`,
      },
      {
        timestamp,
        lastModifiedBy: this.claims.username,
        ...variant,
        discriminator: DISCRIMINATOR,
        deleted: null,
        latched: null,
        ttl: ttl(timestamp, 365), // Variants live as long as products
        awsregion: process.env.AWS_REGION,
        status: variant.status || 'active',
        stockQuantity: variant.stockQuantity || 0,
      },
    );
  }

  delete({ id, variantId }) {
    const timestamp = now();
    return this.connector.update(
      {
        pk: id,
        sk: `${ALIAS}|${variantId}`,
      },
      {
        discriminator: DISCRIMINATOR,
        deleted: true,
        lastModifiedBy: this.claims.username,
        latched: null,
        ttl: ttl(timestamp, 30), // Keep deleted variants for 30 days
        timestamp,
        awsregion: process.env.AWS_REGION,
      },
    );
  }

  updateStock({ id, variantId }, stockChange) {
    const timestamp = now();
    return this.connector.update(
      {
        pk: id,
        sk: `${ALIAS}|${variantId}`,
      },
      {
        stockQuantity: { $add: stockChange },
        lastModifiedBy: this.claims.username,
        timestamp,
        awsregion: process.env.AWS_REGION,
      },
    );
  }

  updatePrice({ id, variantId }, newPrice) {
    const timestamp = now();
    return this.connector.update(
      {
        pk: id,
        sk: `${ALIAS}|${variantId}`,
      },
      {
        price: newPrice,
        lastModifiedBy: this.claims.username,
        timestamp,
        awsregion: process.env.AWS_REGION,
      },
    );
  }
}

export default Model;
