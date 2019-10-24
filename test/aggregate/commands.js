const Validator = require("fastest-validator");

const {
  TestCreatedEvent,
  TestDeletedEvent,
  TestGenericEvent,
} = require("./events");

class ValidationError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = "ValidationError";
    this.cause = cause;
  }
}

const v = new Validator();

function validate(object, schema) {
  const result = v.validate(object, schema);

  if (result === true) {
    return true;
  }

  const messages = result.map(({ message }) => message).join("\n 🔥 ");

  throw new ValidationError(
    `Aggregate validation error 😭\n🔥  ${messages}`,
    result
  );
}

function createTest(state, command) {
  validate(state, { deleted: { type: "forbidden" } });
  validate(command, { payload: { type: "object" } });

  return TestCreatedEvent(command.payload);
}

function deleteTest(state, command) {
  validate(state, {
    deleted: {
      type: "forbidden",
      messages: { forbidden: "Aggregate is already deleted" },
    },
  });

  return TestDeletedEvent(command.payload);
}

function genericCommandTest(state, command) {
  validate(state, {
    deleted: {
      type: "forbidden",
      messages: { forbidden: "Aggregate is already deleted" },
    },
  });

  return TestGenericEvent(command.payload);
}

module.exports = {
  createTest,
  deleteTest,
  genericCommandTest,
};
