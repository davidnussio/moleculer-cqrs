const Validator = require("fastest-validator");

class CommandValidationError extends Error {
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

  throw new CommandValidationError(
    `Aggregate validation error 😭\n🔥  ${messages}`,
    result
  );
}

module.exports = validate;
