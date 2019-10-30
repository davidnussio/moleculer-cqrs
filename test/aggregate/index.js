const events = require("./events");
const projection = require("./projection");
const commands = require("./commands");

/**
 * test aggregate
 */

module.exports = {
  name: "test",
  commands,
  projection,
  events,
  invariantHash: null,
  serializeState: state => JSON.stringify(state),
  deserializeState: serializedState => JSON.parse(serializedState),
};
