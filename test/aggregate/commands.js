const { schemas, validate } = require("./validate");
const {
  TestCreatedEvent,
  TestDeletedEvent,
  TestGenericEvent,
} = require("./events");

function createTest(state, command) {
  validate(state, schemas.createTest.state);
  validate(command, schemas.createTest.command);

  return TestCreatedEvent({ ...command.payload, createdAt: Date.now() });
}

function deleteTest(state, command) {
  validate(state, schemas.deleteTest.state);

  return TestDeletedEvent({ ...command.payload, deletedAt: Date.now() });
}

function genericCommandTest(state, command) {
  validate(state, schemas.genericCommand.state);

  return TestGenericEvent(command.payload);
}

module.exports = {
  createTest,
  deleteTest,
  genericCommandTest,
};
