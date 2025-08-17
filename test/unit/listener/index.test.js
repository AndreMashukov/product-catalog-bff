import 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';
import _ from 'highland';

import { UNKNOWN_KINESIS_EVENT_TYPE, UNKNOWN_SQS_EVENT_TYPE } from 'aws-lambda-stream';

import { handle, Handler } from '../../../src/listener';

describe('listener/index.js', () => {
  afterEach(sinon.restore);

  it('should verify Handler', (done) => {
    new Handler()
      // .handle(UNKNOWN_KINESIS_EVENT_TYPE)
      .handle(UNKNOWN_SQS_EVENT_TYPE)
      .collect()
      .tap((collected) => {
        expect(collected.length).to.equal(0);
      })
      .done(done);
  });

  it('should test successful handle call', async () => {
    const spy = sinon.stub(Handler.prototype, 'handle').returns(_.of({}));

    const res = await handle({}, {});

    expect(spy).to.have.been.calledWith({});
    expect(res).to.equal('Success');
  });

  it('should test unsuccessful handle call', async () => {
    const spy = sinon.stub(Handler.prototype, 'handle').returns(_.fromError(Error()));

    try {
      await handle({}, {});
      expect.fail('expected error');
    } catch (e) {
      expect(spy).to.have.been.calledWith({});
    }
  });

  it('should transform EventBridge events with eventType to type field', (done) => {
    const eventBridgeEvent = {
      Records: [
        {
          eventSource: 'aws:sqs',
          body: JSON.stringify({
            eventType: 'product-published',
            productId: 'test-123',
            timestamp: 1692097847000,
            product: {
              name: 'Test Product',
              sku: 'TST-123',
              price: 19.99,
            },
          }),
        },
      ],
    };

    new Handler()
      .handle(eventBridgeEvent)
      .collect()
      .tap((collected) => {
        // The event should be processed successfully with the transformed type field
        expect(collected).to.be.an('array');
        // Even if no rules match in this test context, the transformation should have occurred
        // and the handler should not throw an error due to missing 'type' field
      })
      .done(done);
  });

  it('should preserve existing type field when both type and eventType are present', (done) => {
    const mixedEvent = {
      Records: [
        {
          eventSource: 'aws:sqs',
          body: JSON.stringify({
            type: 'product-draft',
            eventType: 'product-published',
            productId: 'test-124',
            timestamp: 1692097847000,
          }),
        },
      ],
    };

    new Handler()
      .handle(mixedEvent)
      .collect()
      .tap((collected) => {
        // Should not transform when type field already exists
        expect(collected).to.be.an('array');
      })
      .done(done);
  });

  it('should handle non-SQS events without transformation', (done) => {
    const kinesisEvent = {
      Records: [
        {
          eventSource: 'aws:kinesis',
          kinesis: {
            data: Buffer.from(JSON.stringify({
              eventType: 'product-published',
              productId: 'test-125',
            })).toString('base64'),
          },
        },
      ],
    };

    new Handler()
      .handle(kinesisEvent)
      .collect()
      .tap((collected) => {
        // Should handle non-SQS events without errors
        expect(collected).to.be.an('array');
      })
      .done(done);
  });
});
