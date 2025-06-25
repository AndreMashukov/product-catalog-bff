import { materialize } from 'aws-lambda-stream';

import { toUpdateRequest as toProductUpdateRequest } from '../models/product';

export default [
  {
    id: 'm1',
    flavor: materialize,
    eventType: /product-(draft|published|deactivated|out-of-stock|discontinued|deleted)/,
    toUpdateRequest: toProductUpdateRequest,
  },
  {
    id: 'm2',
    flavor: materialize,
    eventType: /product-inventory-updated/,
    toUpdateRequest: toProductUpdateRequest,
  },
  {
    id: 'm3',
    flavor: materialize,
    eventType: /product-price-updated/,
    toUpdateRequest: toProductUpdateRequest,
  },
];
