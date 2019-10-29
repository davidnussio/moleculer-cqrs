class CQRSFixture {
  constructor(aggregate) {
    this.aggregate = aggregate;
    this.state = undefined;
    this.dipatchedEvent = undefined;
  }

  givenEvents(events = []) {
    this.state = this.aggregate.projection.Init();

    events.forEach(event => {
      this.state = this.aggregate.projection[event.type](this.state, event);
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

    if (typeof command === "object") {
      expect(this.aggregate.name).toEqual(command.aggregateName);
      // eslint-disable-next-line no-param-reassign
      payload = command.payload;
      commandFn = this.aggregate.commands[command.type];
    } else if (typeof command === "string") {
      commandFn = this.aggregate.commands[command];
    } else if (typeof command === "function") {
      commandFn = this.aggregate.commands[command.name];
    }

    if (typeof commandFn === "function") {
      const event = commandFn(this.state, { payload });
      this.state = this.aggregate.projection[event.type](this.state, event);
      this.dipatchedEvent = event;
    } else {
      throw new Error("Aggregate command not found");
    }

    return this;
  }

  whenThrow(command, ...payload) {
    return expect(() =>
      this.aggregate.commands[command.name](this.state, { payload })
    );
  }

  expectEvent(event) {
    expect(this.dipatchedEvent).toEqual(event);
    return this;
  }

  inspectState(cb) {
    cb(this.state);
    return this;
  }
}

module.exports = CQRSFixture;
