import {
  initialize,
  initializeFrom,
  defaultOptions,
  decryptEvent,
  expired,
  fromDynamodb,
  toPromise,
} from 'aws-lambda-stream';

import CORRELATE_RULES from './correlate-rules';
import EVAL_RULES from './evaluate-rules';

const OPTIONS = { ...defaultOptions };

const PIPELINES = {
  ...initializeFrom(CORRELATE_RULES),
  ...initializeFrom(EVAL_RULES),
  expired,
};

const { debug } = OPTIONS;

export class Handler {
  constructor(options = OPTIONS) {
    this.options = options;
  }

  handle(event, includeErrors = true) {
    return initialize(PIPELINES, this.options)
      .assemble(
        fromDynamodb(event)
          .through(decryptEvent({
            ...this.options,
          })),
        includeErrors,
      );
  }
}

export const handle = async (event, context, int = {}) => {
  debug('event: %j', event);
  debug('context: %j', context);

  return new Handler({ ...OPTIONS, ...int })
    .handle(event)
    .tap(debug)
    .through(toPromise);
};
