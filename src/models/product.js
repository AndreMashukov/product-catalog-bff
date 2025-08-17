import { updateExpression, timestampCondition } from 'aws-lambda-stream';
import invert from 'lodash/invert';

import {
  now, ttl, deletedFilter, aggregateMapper, mapper,
} from '../utils';

import * as ProductVariant from './product-variant';

export const DISCRIMINATOR = 'product';

export const MAPPER = mapper();

const AGGREGATE_MAPPER = aggregateMapper({
  aggregate: DISCRIMINATOR,
  cardinality: {
    [ProductVariant.ALIAS]: 999,
  },
  mappers: {
    [DISCRIMINATOR]: MAPPER,
    [ProductVariant.DISCRIMINATOR]: ProductVariant.MAPPER,
  },
});

class Model {
  constructor({
    debug,
    connector,
    claims = { username: 'system' },
  } = {}) {
    this.debug = debug;
    this.connector = connector;
    this.claims = claims;
  }

  query({
    last, limit, category, status, search, sortBy = 'timestamp',
  }) {
    const keyName = category ? 'category' : 'discriminator';
    const keyValue = category || DISCRIMINATOR;

    return this.connector
      .query({
        index: category ? 'gsi2' : 'gsi1',
        keyName,
        keyValue,
        last,
        limit,
        sortBy,
        search,
      })
      .then(async (response) => ({
        ...response,
        data: await Promise.all(response.data
          .filter(deletedFilter)
          .filter((p) => !status || p.status === status)
          .map((e) => MAPPER(e))),
      }));
  }

  get(id) {
    return this.connector.get(id)
      .then((data) => AGGREGATE_MAPPER(data));
  }

  save(id, input) {
    const { variants, ...product } = input;
    const timestamp = now();
    const lastModifiedBy = this.claims.username;
    const deleted = null;
    const latched = null;
    const _ttl = ttl(timestamp, 365); // Products live longer than 33 days
    const awsregion = process.env.AWS_REGION;

    // Validate required fields
    if (!product.name || !product.sku || !product.price) {
      throw new Error('Product name, SKU, and price are required');
    }

    return this.connector.batchUpdate([
      {
        key: {
          pk: id,
          sk: DISCRIMINATOR,
        },
        inputParams: {
          ...product,
          discriminator: DISCRIMINATOR,
          timestamp,
          lastModifiedBy,
          deleted,
          latched,
          ttl: _ttl,
          awsregion,
          status: product.status || 'active',
          category: product.category || 'general',
        },
      },
      // variants are optional
      // they can be added/updated here but not deleted
      // they must be deleted individually
      ...(variants || []).map((d) => {
        const { id: variantId, ...variant } = d;

        return {
          key: {
            pk: id.toString(),
            sk: `${ProductVariant.ALIAS}|${variantId}`,
          },
          inputParams: {
            lastModifiedBy,
            timestamp,
            ...variant,
            discriminator: ProductVariant.DISCRIMINATOR,
            deleted,
            latched,
            ttl: _ttl,
            awsregion,
          },
        };
      }),
    ]);
  }

  delete(id) {
    const timestamp = now();
    return this.connector.update(
      {
        pk: id,
        sk: DISCRIMINATOR,
      },
      {
        discriminator: DISCRIMINATOR,
        deleted: true,
        lastModifiedBy: this.claims.username,
        latched: null,
        ttl: ttl(timestamp, 30), // Keep deleted products for 30 days
        timestamp,
        awsregion: process.env.AWS_REGION,
      },
    );
  }

  updateStock(id, stockChange) {
    const timestamp = now();
    return this.connector.update(
      {
        pk: id,
        sk: DISCRIMINATOR,
      },
      {
        stockQuantity: { $add: stockChange },
        lastModifiedBy: this.claims.username,
        timestamp,
        awsregion: process.env.AWS_REGION,
      },
    );
  }

  updatePrice(id, newPrice) {
    const timestamp = now();
    return this.connector.update(
      {
        pk: id,
        sk: DISCRIMINATOR,
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

const STATUS_EVENT_MAP = {
  DRAFT: 'product-draft',
  ACTIVE: 'product-published',
  INACTIVE: 'product-deactivated',
  OUT_OF_STOCK: 'product-out-of-stock',
  DISCONTINUED: 'product-discontinued',
};

const EVENT_STATUS_MAP = invert(STATUS_EVENT_MAP);

export const toUpdateRequest = (uow) => {
  // Handle different event structures:
  // 1. Standard structure: uow.event.product (for product-* events)
  // 2. Legacy structure: uow.event.data (for thing-product events)
  const productData = uow.event.product || uow.event.data || {};
  // For ID resolution, prioritize the event-level productId, then data.pk, then data.id
  const productId = uow.event.productId || productData.pk || productData.id;

  // Convert timestamp to numeric format if it's a string
  let eventTimestamp = uow.event.timestamp;
  if (typeof eventTimestamp === 'string') {
    eventTimestamp = new Date(eventTimestamp).getTime();
  }

  // Determine status from event type or existing status
  let { status } = productData;

  // Get the event type from either 'type' or 'eventType' field
  const eventType = uow.event.type || uow.event.eventType;
  if (uow.event.type === 'thing-product' && uow.event.eventType) {
    // For thing-product events, use eventType to determine status
    status = EVENT_STATUS_MAP[uow.event.eventType] || productData.status;
  } else if (eventType) {
    // For product-* events, use the event type (either from 'type' or 'eventType' field)
    status = EVENT_STATUS_MAP[eventType] || productData.status;
  }

  return {
    Key: {
      pk: productId,
      sk: DISCRIMINATOR,
    },
    ...updateExpression({
      ...productData,
      status,
      discriminator: DISCRIMINATOR,
      lastModifiedBy: productData.lastModifiedBy || 'system',
      timestamp: eventTimestamp,
      deleted: (uow.event.type === 'product-deleted' || uow.event.eventType === 'product-deleted') ? true : null,
      latched: true,
      ttl: ttl(eventTimestamp, 365),
      awsregion: process.env.AWS_REGION || productData.awsregion,
    }),
    ...timestampCondition(),
  };
};

export const toEvent = async (uow) => {
  const data = uow.event.raw.new || /* istanbul ignore next */ uow.event.raw.old;
  const records = uow.queryResponse.map((r) => (r.discriminator === DISCRIMINATOR ? data : r));
  const product = await AGGREGATE_MAPPER(records);
  return {
    type: uow.event.type === 'product-deleted'
      ? /* istanbul ignore next */ uow.event.type
      : STATUS_EVENT_MAP[data.status] || /* istanbul ignore next */ uow.event.type,
    timestamp: data.timestamp || uow.event.timestamp,
    product,
    raw: undefined,
  };
};
