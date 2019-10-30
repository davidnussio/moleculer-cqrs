const CREATED = "aggregate.order.created";
const DELETED = "aggregate.order.deleted";
const GENERIC_EVENT = "aggregate.test.generic_event";

function TestCreatedEvent(payload) {
  return {
    type: CREATED,
    payload,
  };
}

function TestDeletedEvent(payload) {
  return {
    type: DELETED,
    payload,
  };
}

function TestGenericEvent(payload) {
  return {
    type: GENERIC_EVENT,
    payload,
  };
}

module.exports = {
  types: { CREATED, DELETED, GENERIC_EVENT },
  TestCreatedEvent,
  TestDeletedEvent,
  TestGenericEvent,
};
