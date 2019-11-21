/* eslint-disable no-param-reassign */

class CQRSFixture {
  constructor(aggregate) {
    this.aggregate = aggregate;
    this.aggregateVersion = 0;
    this.state = undefined;
    this.dipatchedEvent = undefined;
  }

  givenEvents(events = [], aggregateId) {
    this.state = this.aggregate.projection.Init();

    events.forEach((event, aggregateVersion) => {
      const disptchedEvent = {
        aggregateId,
        aggregateVersion: aggregateVersion + 1,
        timestamp: Date.now(),
        ...event,
      };
      this.state = this.aggregate.projection[event.type](
        this.state,
        disptchedEvent
      );
    });

    return this;
  }

  when(command, payload) {
    if (typeof this.state !== "object") {
      throw new Error(
        "State is not an object. Did you call givenEvents method?"
      );
    }

    let commandFn;
    let type;

    if (typeof command === "object") {
      payload = command.payload;
      type = command.type;
      commandFn = this.aggregate.commands[command.type];
    } else if (typeof command === "string") {
      commandFn = this.aggregate.commands[command];
      type = command;
      command = { aggregateId: payload.aggregateId };
      payload = payload.payload;
    } else if (typeof command === "function") {
      commandFn = command;
      command.aggregateId = payload.aggregateId;
      type = command.name;
      payload = payload.payload;
    }

    if (typeof commandFn === "function") {
      if (!command.aggregateId) {
        throw new Error(
          "Validation command error, command does not have an aggregateId"
        );
      }
      const event = {
        aggregateId: command.aggregateId,
        aggregateVersion: this.aggregateVersion + 1,
        timestamp: Date.now(),
        type,
        ...commandFn(this.state, { payload }),
      };
      this.state = this.aggregate.projection[event.type](this.state, event);
      this.dipatchedEvent = event;
    } else {
      throw new Error("Command dispatch error, aggregate command not found");
    }

    return this;
  }

  whenThrow(command, ...payload) {
    return expect(() =>
      this.aggregate.commands[command.name](this.state, { payload })
    );
  }

  expectEvent(event) {
    if (typeof event === "function") {
      expect(event().type).toEqual(this.dipatchedEvent.type);
    } else {
      const { aggregateId, aggregateVersion, timestamp } = this.dipatchedEvent;
      expect(this.dipatchedEvent).toEqual({
        aggregateId,
        aggregateVersion,
        timestamp,
        ...event,
      });
    }
    return this;
  }

  inspectState(cb) {
    cb(this.state);
    return this;
  }
}

module.exports = CQRSFixture;
