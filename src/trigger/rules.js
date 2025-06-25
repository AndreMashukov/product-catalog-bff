import {
  cdc, upd as update, job,
} from 'aws-lambda-stream';

import {
  toEvent as toProductEvent,
} from '../models/product';

export default [
  {
    id: 't1',
    flavor: cdc,
    eventType: /product-(created|updated|deleted)/,
    toEvent: toProductEvent,
    queryRelated: true,
  },
  {
    id: 't2',
    flavor: cdc,
    eventType: /product-variant-(created|updated|deleted)/,
    toEvent: toProductEvent,
    queryRelated: true,
  },
  {
    id: 'inventory-check',
    flavor: job,
    eventType: 'inventory-check-scheduled',
    toScanRequest: () => ({
      ExpressionAttributeNames: {
        '#stockQuantity': 'stockQuantity',
        '#status': 'status',
        '#discriminator': 'discriminator',
      },
      ExpressionAttributeValues: {
        ':lowStock': 10,
        ':status': 'active',
        ':discriminator': 'product',
      },
      FilterExpression: '#stockQuantity <= :lowStock AND #status = :status AND #discriminator = :discriminator',
    }),
    toEvent: () => ({ type: 'low-stock-alert' }),
  },
  {
    id: 'price-sync',
    flavor: job,
    eventType: 'price-sync-scheduled',
    toScanRequest: () => ({
      ExpressionAttributeNames: {
        '#status': 'status',
        '#discriminator': 'discriminator',
        '#lastModified': 'timestamp',
      },
      ExpressionAttributeValues: {
        ':status': 'active',
        ':discriminator': 'product',
        ':yesterday': Date.now() - (24 * 60 * 60 * 1000),
      },
      FilterExpression: '#status = :status AND #discriminator = :discriminator AND #lastModified > :yesterday',
    }),
    toEvent: () => ({ type: 'price-changes-detected' }),
  },
];
