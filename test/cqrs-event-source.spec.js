/* eslint-disable no-restricted-syntax */
const {
  ServiceBroker,
  Errors: { ValidationError, MoleculerClientError, MoleculerServerError },
} = require("moleculer");
const CQRSEventSource = require("../src/cqrs-event-sourcing");
const aggregate = require("./aggregate");

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const EventSourceStorage = () => {
  let events = [];

  return {
    loadEvents: jest.fn().mockImplementation(async (filter, handler) => {
      for (const event of events) {
        if (filter.finishTime && filter.finishTime < event.timestamp) {
          break;
        }
        // eslint-disable-next-line no-await-in-loop
        await handler(event);
      }
    }),
    saveEvent: jest.fn().mockImplementation(async event => {
      events.push(event);
      return event;
    }),
    dispose: () => {
      events = [];
    },
  };
};

const storage = EventSourceStorage();

const TestAggregateService = {
  name: "test",
  mixins: [CQRSEventSource({ aggregate })],
  storage,
};

const TestInternalsService = {
  name: "internals",
  mixins: [CQRSEventSource({})],
  storage,
};

describe("CQRS event source", () => {
  let numCommands = 0;
  const aggregateId = "uuid-case-1";

  // TODO: Extract service broker, service, and populate logic
  const broker1 = new ServiceBroker({
    transporter: "Fake",
    nodeID: "node-1",
    logger: false,
  });
  const broker2 = new ServiceBroker({
    transporter: "Fake",
    nodeID: "node-2",
    logger: false,
  });
  const mockEventEmitHandler = jest.fn();
  const mockEventBroadcastHandler = jest.fn();

  broker1.createService({ ...TestAggregateService });
  broker1.createService({ ...TestInternalsService });
  broker1.createService({
    name: "test-list",
    metadata: {
      viewModel: true,
    },
    events: {
      [aggregate.events.types.CREATED](event) {
        mockEventEmitHandler(event);
      },
      [aggregate.events.types.DELETED](event) {
        mockEventEmitHandler(event);
      },
      [aggregate.events.types.GENERIC_EVENT](event) {
        mockEventEmitHandler(event);
      },
    },
  });

  broker1.createService({
    name: "view-model-disposable",
    metadata: {
      viewModel: true,
    },
    actions: {
      dispose() {
        return true;
      },
    },
  });

  broker1.createService({
    name: "view-model-no-disposable",
    metadata: {
      viewModel: true,
    },
  });

  broker1.createService({
    name: "view-model-error-disposable",
    metadata: {
      viewModel: true,
    },
    actions: {
      dispose() {
        throw new Error("dispose error");
      },
    },
  });

  const TestBroadcastService = {
    name: "test-broadcast",
    metadata: {
      viewModel: true,
    },
    events: {
      [aggregate.events.types.CREATED](event) {
        mockEventBroadcastHandler(event);
      },
      [aggregate.events.types.DELETED](event) {
        mockEventBroadcastHandler(event);
      },
      [aggregate.events.types.GENERIC_EVENT](event) {
        mockEventBroadcastHandler(event);
      },
    },
  };

  broker1.createService(TestBroadcastService);
  broker2.createService(TestBroadcastService);

  async function populate({
    numCmd = 10,
    createCommand = true,
    deleteCommand = false,
    delayMs = 10,
  }) {
    if (createCommand) {
      await broker1.call("test.command", {
        aggregateId,
        type: "createTest",
        payload: {},
      });
      numCommands++;
      await delay(delayMs);
    }

    for (let i = 0; i < numCmd; i++) {
      // eslint-disable-next-line no-await-in-loop
      await broker1.call("test.command", {
        aggregateId,
        type: "genericCommandTest",
        payload: { i },
      });
      numCommands++;
      // eslint-disable-next-line no-await-in-loop
      await delay(delayMs);
    }

    if (deleteCommand) {
      await broker1.call("test.command", {
        aggregateId,
        type: "deleteTest",
        payload: {},
      });
      numCommands++;
      await delay(delayMs);
    }
  }

  beforeAll(() => Promise.all([broker1.start(), broker2.start()]));
  afterAll(() => Promise.all([broker1.stop(), broker2.stop()]));

  afterEach(async () => {
    numCommands = 0;
    mockEventEmitHandler.mockClear();
    mockEventBroadcastHandler.mockClear();
    storage.dispose();
  });

  test("should invalid aggregate configuration throw and error", async () => {
    expect(() =>
      CQRSEventSource({
        aggregate: {
          name: "abc",
          commands: {},
          projection: {},
          events: { types: {} },
        },
      })
    ).toThrow();
  });

  test("should service instance a default db when adapter is not configurated", () => {
    const broker = new ServiceBroker({ logger: false });
    broker.createService({
      name: "local-service",
      aggregateName: "local-name",
      mixins: [CQRSEventSource({ aggregate })],
    });
    const localService = broker.getLocalService("local-service");
    expect(localService.aggregateName).toEqual("local-name");
  });

  test("should choose a different aggregateName", () => {
    const broker = new ServiceBroker({ logger: false });
    broker.createService({
      name: "local-service",
      mixins: [CQRSEventSource({ aggregate })],
    });
    const localService = broker.getLocalService("local-service");
    expect(localService.storage).toBeDefined();
    const AsyncFunction = (async () => {}).constructor;

    expect(localService.storage.init).toBeInstanceOf(AsyncFunction);
    expect(localService.storage.loadEvents).toBeInstanceOf(AsyncFunction);
    expect(localService.storage.saveEvent).toBeInstanceOf(AsyncFunction);
  });

  describe("Aggregate service", () => {
    test("should valid command to be dispatched", async () => {
      const response = await broker1.call("test.command", {
        aggregateId: "uuid-valid-command-1",
        type: "createTest",
        payload: {},
      });
      expect(response.status).toBe(true);
      expect(response.aggregateId).toBe("uuid-valid-command-1");
    });

    test("should invalid command to be rejected (missing type)", () => {
      return broker1
        .call("test.command", {
          aggregateId: "12345",
          payload: {},
        })
        .catch(err => {
          expect(err).toBeInstanceOf(ValidationError);
          expect(err.message).toEqual("Parameters validation error!");
        });
    });

    test("should invalid command to be rejected (missing aggregateId)", () => {
      return broker1
        .call("test.command", {
          type: "createTest",
          payload: {},
        })
        .catch(err => {
          expect(err).toBeInstanceOf(ValidationError);
          expect(err.message).toEqual("Parameters validation error!");
        });
    });

    test("should valid command to be rejected (interval aggregate validation error)", async () => {
      await broker1
        .call("test.command", {
          aggregateId,
          type: "createTest",
          payload: {},
        })
        .catch(err => {
          expect(err).toBeInstanceOf(MoleculerClientError);
          expect(err.message).toContain("Aggregate validation error");
        });
    });
  });

  describe("CQRS internal service (without aggregate)", () => {
    test("should command handler disabled for service without aggregate configuation", () => {
      return broker1
        .call("internals.command", {
          aggregateId: "12345",
          type: "createTest",
          payload: {},
        })
        .catch(err => {
          expect(err).toBeInstanceOf(MoleculerClientError);
          expect(err.message).toContain("command action is disabled");
        });
    });

    test("should command handler disabled for service without aggregate configuation", () => {
      return broker1
        .call("internals.read-model", {
          aggregateId: "12345",
        })
        .catch(err => {
          expect(err).toBeInstanceOf(MoleculerClientError);
          expect(err.message).toContain(
            "Aggregate is not configurated, read-model action is disabled!"
          );
        });
    });

    test("should command handler disabled for service without aggregate configuation", () => {
      return broker1
        .call("internals.history", {
          aggregateId: "12345",
        })
        .catch(err => {
          expect(err).toBeInstanceOf(MoleculerClientError);
          expect(err.message).toContain(
            "Aggregate is not configurated, read-model action is disabled!"
          );
        });
    });

    test("should replay events, dispatch emit", async () => {
      await populate({ numCmd: 10, createCommand: true, deleteCommand: true });

      await broker1.call("internals.replay", { viewModels: ["test-list"] });

      // Total event = recived events + replayed events → recived events * 2
      expect(mockEventEmitHandler).toHaveBeenCalledTimes(numCommands * 2);
    });

    test("should replay events, dispatch broadcast", async () => {
      await populate({ numCmd: 10, createCommand: true, deleteCommand: true });

      await broker1.call("internals.replay", {
        viewModels: ["test-broadcast"],
        broadcast: true,
      });

      // Total event = recived events + replayed events * 2 service instance
      // → recived events * 4
      expect(mockEventBroadcastHandler).toHaveBeenCalledTimes(numCommands * 4);
    });
  });

  describe("CQRS history", () => {
    test("should replay events", async () => {
      await populate({ numCmd: 10, createCommand: true, deleteCommand: true });
      const result = await broker1.call("test.history", {
        aggregateId,
      });

      // Total event = recived events + replayed events → recived evets * 2
      expect(result.length).toEqual(numCommands);
      expect(result[0].eventType).toEqual(aggregate.events.types.CREATED);
      expect(result[1].eventType).toEqual(aggregate.events.types.GENERIC_EVENT);
      expect(result[result.length - 2].eventType).toEqual(
        aggregate.events.types.GENERIC_EVENT
      );
      expect(result[result.length - 1].eventType).toEqual(
        aggregate.events.types.DELETED
      );
    });
  });

  describe("CQRS read-model", () => {
    test("should regenerate state ", async () => {
      await populate({ numCmd: 10, createCommand: true, deleteCommand: true });

      const history = await broker1.call("test.history", {
        aggregateId,
      });
      // Total event = recived events + replayed events → recived evets * 2
      expect(history.length).toEqual(numCommands);

      let result;
      result = await broker1.call("test.read-model", { aggregateId });
      expect(result.i).toEqual(9);

      result = await broker1.call("test.read-model", {
        aggregateId,
        finishTime: history[0].timestamp,
      });
      expect(result).toEqual({});

      for (let i = 0; i < history.length - 2; i++) {
        // eslint-disable-next-line no-await-in-loop
        result = await broker1.call("test.read-model", {
          aggregateId,
          finishTime: history[i + 1].timestamp,
        });
        expect(result).toEqual({ i });
      }

      result = await broker1.call("test.read-model", {
        aggregateId,
        finishTime: history[history.length - 1].timestamp,
      });
      expect(result).toEqual({ i: history.length - 3, deleted: true });
    });
  });

  describe("View Model dispose", () => {
    test("should ", async () => {
      await populate({ numCmd: 10, createCommand: true, deleteCommand: false });

      await broker1
        .call("internals.replay", {
          viewModels: ["view-model-error-disposable"],
        })
        .catch(e => {
          expect(e).toBeInstanceOf(MoleculerServerError);
        });
    });
  });
});
