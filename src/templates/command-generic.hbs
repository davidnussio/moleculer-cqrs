const validate = require("../../validate");
const { TestGenericEvent } = require("../events");

const schema = {
  state: {
    createdAt: {
      type: "any",
    },
    deletedAt: {
      type: "forbidden",
      messages: { forbidden: "Aggregate is already deleted" },
    },
  },
  command: { payload: { type: "object" } },
};

function genericCommandTest(state, command) {
  validate(state, schema.state);

  return TestGenericEvent(command.payload);
}

module.exports = genericCommandTest;
