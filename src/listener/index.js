import {
  initialize,
  initializeFrom,
  defaultOptions,
  decryptEvent,
  fromKinesis,
  fromSqsEvent,
  getSecrets,
  prefilterOnEventTypes,
  toPromise,
} from 'aws-lambda-stream';

import RULES from './rules';

const OPTIONS = {
  ...defaultOptions,
  // ...process.env,
};

const PIPELINES = {
  ...initializeFrom(RULES),
};

const { debug } = OPTIONS;

// Transform EventBridge events with 'eventType' field to use 'type' field
const transformEventBridgeEvent = (event) => {
  if (event.Records) {
    return {
      ...event,
      Records: event.Records.map((record) => {
        if (record.eventSource === 'aws:sqs' && record.body) {
          try {
            const body = typeof record.body === 'string' ? JSON.parse(record.body) : record.body;

            // If the event has eventType but no type, transform it
            if (body.eventType && !body.type) {
              const transformedBody = {
                ...body,
                type: body.eventType,
              };

              debug('Transforming EventBridge event: eventType "%s" -> type "%s"', body.eventType, transformedBody.type);

              return {
                ...record,
                body: JSON.stringify(transformedBody),
              };
            }
          } catch (error) {
            debug('Error parsing record body during transformation: %j', error);
          }
        }
        return record;
      }),
    };
  }
  return event;
};

export class Handler {
  constructor(options = OPTIONS) {
    this.options = options;
  }

  handle(event, includeErrors = true) {
    // Transform EventBridge events before processing
    const transformedEvent = transformEventBridgeEvent(event);

    return initialize(PIPELINES, this.options)
      .assemble(
        fromSqsEvent(transformedEvent)
        // fromKinesis(transformedEvent)
          .through(decryptEvent({
            ...this.options,
            prefilter: prefilterOnEventTypes(RULES),
          })),
        includeErrors,
      );
  }
}

export const handle = async (event, context, int = {}) => {
  debug('event: %j', event);
  debug('context: %j', context);

  // const options = await getSecrets(OPTIONS);

  return new Handler({ ...OPTIONS, ...int })
    .handle(event)
    .through(toPromise);
};
