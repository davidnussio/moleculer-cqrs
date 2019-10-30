const { CQRSFixture } = require("../../..");

const aggregate = require("..");

const {
  commands: { createTest, deleteTest },
  events: { TestCreatedEvent, TestDeletedEvent },
} = aggregate;

jest
  .spyOn(global.Date, "now")
  .mockImplementation(() => new Date("2019-10-01T11:01:58.135Z").valueOf());

const payload = {
  title: "Test document title",
  userId: "user-id-1",
  text: "Asperiores nam tempora qui et provident temporibus illo et fugit.",
};

describe("Testing aggregate commands in isolation", () => {
  test("should commands with empty payload throw error", () => {
    expect(() => createTest({}, {})).toThrow("Aggregate validation error");
  });

  test("should createTest command return an TestsCreatedEvent", () => {
    expect(
      createTest(
        {},
        {
          payload,
        }
      )
    ).toMatchSnapshot();
  });
});

describe("Testing aggregate with cqrs fixture", () => {
  let fixture;

  beforeEach(() => {
    fixture = new CQRSFixture(aggregate);
  });

  test("should call raw command", () => {
    fixture
      .givenEvents([])
      .when({
        aggregateId: "aggregate-uuid-1",
        type: "createTest",
        payload,
      })
      .expectEvent(TestCreatedEvent({ ...payload, createdAt: Date.now() }));
  });

  test("should createTest return an TestCreatedEvent event", () => {
    fixture
      .givenEvents()
      .when(createTest, { aggregateId: "aggregate-uuid-1", payload })
      .expectEvent(TestCreatedEvent({ ...payload, createdAt: Date.now() }));
  });

  test("should reject all next commands when aggregate is already deleted", () => {
    const initialEventStream = [
      TestCreatedEvent({ payload, createdAt: Date.now() }),
      TestDeletedEvent({ deletedAt: Date.now() }),
    ];
    fixture
      .givenEvents(initialEventStream)
      .whenThrow(deleteTest, {})
      .toThrow("Aggregate is already deleted");
  });

  test("should created order accepts delete command", () => {
    const aggregateId = "aggregate-uuid-1";
    const initialEventStream = [
      TestCreatedEvent({ payload, createdAt: Date.now() }),
    ];
    fixture
      .givenEvents(initialEventStream, aggregateId)
      .when(deleteTest, { aggregateId, payload: {} })
      .expectEvent(TestDeletedEvent({ deletedAt: Date.now() }));
  });
});
