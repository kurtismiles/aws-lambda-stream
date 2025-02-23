import {
  printStartPipeline, printEndPipeline,
  faulty, faultyAsyncStream, faultify,
  queryDynamoDB, batchGetDynamoDB,
  sendToSqs,
} from '../utils';

import { filterOnEventType, filterOnContent, outLatched } from '../filters';

export const sendMessages = (rule) => (s) => s // eslint-disable-line import/prefer-default-export
  .filter(outLatched)

  .filter(onEventType(rule))
  .tap(printStartPipeline)

  .filter(onContent(rule))

  .map(toQueryRequest(rule))
  .through(queryDynamoDB(rule))

  .map(toGetRequest(rule))
  .through(batchGetDynamoDB(rule))

  .map(toMessage(rule))
  .parallel(rule.parallel || Number(process.env.PARALLEL) || 4)

  .through(sendToSqs(rule))

  .tap(printEndPipeline);

const onEventType = (rule) => faulty((uow) => filterOnEventType(rule, uow));
const onContent = (rule) => faulty((uow) => filterOnContent(rule, uow));

const toQueryRequest = (rule) => faulty((uow) => ({
  ...uow,
  queryRequest:
    rule.toQueryRequest
      ? /* istanbul ignore next */ rule.toQueryRequest(uow, rule)
      : undefined,
}));

const toGetRequest = (rule) => faulty((uow) => ({
  ...uow,
  batchGetRequest:
    rule.toGetRequest
      ? /* istanbul ignore next */ rule.toGetRequest(uow, rule)
      : undefined,
}));

const toMessage = (rule) => faultyAsyncStream(async (uow) => ({
  ...uow,
  message: await faultify(rule.toMessage)(uow, rule),
}));
