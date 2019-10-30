const validate = require("../validate");
const { TestCreatedEvent } = require("../events");

const schema = {
  state: {
    createdAt: {
      type: "forbidden",
      messages: { forbidden: "Aggregate is already created" },
    },
    deletedAt: {
      type: "forbidden",
      messages: { forbidden: "Aggregate is already deleted" },
    },
  },
  command: { payload: { type: "object" } },
};

function createTests(state, command) {
  validate(state, schema.state);
  validate(command, schema.command);

  return TestCreatedEvent({ ...command.payload, createdAt: Date.now() });
}

module.exports = createTests;
