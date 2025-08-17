import {
  initialize,
  initializeFrom,
  defaultOptions,
  decryptEvent,
  fromSqsEvent,
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

export class Handler {
  constructor(options = OPTIONS) {
    this.options = options;
  }

  handle(event, includeErrors = true) {
    return initialize(PIPELINES, this.options)
      .assemble(
        fromSqsEvent(event)
        // fromKinesis(event)
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

  try {
    // const options = await getSecrets(OPTIONS);

    const result = await new Handler({ ...OPTIONS, ...int })
      .handle(event)
      .through(toPromise);

    debug('Processing completed successfully: %j', result);
    return result;
  } catch (error) {
    console.error('Error processing SQS message:', error);

    // Check if this is a parsing/malformed message error
    if (error.message && (
      error.message.includes('JSON')
      || error.message.includes('parse')
      || error.message.includes('malformed')
      || error.message.includes('invalid')
    )) {
      console.error('Malformed message detected, will be sent to DLQ after max retries');
    }

    // Re-throw the error to trigger SQS retry mechanism
    throw error;
  }
};
