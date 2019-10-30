const validate = require("../validate");
const { TestDeletedEvent } = require("../events");

const schema = {
  state: {
    deletedAt: {
      type: "forbidden",
      messages: { forbidden: "Aggregate is already deleted" },
    },
  },
  command: { payload: { type: "object" } },
};

function deleteTest(state, command) {
  validate(state, schema.state);
  validate(command, schema.command);

  return TestDeletedEvent({ ...command.payload, deletedAt: Date.now() });
}

module.exports = deleteTest;
