const CQRSFixture = require("../../../src/cqrs-fixture");

const aggregate = require("..");

const {
  commands: { createTest, deleteTest, genericCommandTest },
  events: { TestCreatedEvent, TestDeletedEvent },
} = aggregate;

const payload = {
  title: "Title test",
  userId: "user-id-1",
  text: "Asperiores nam tempora qui et provident temporibus illo et fugit.",
};

jest
  .spyOn(global.Date, "now")
  .mockImplementation(() => new Date("2019-05-14T11:01:58.135Z").valueOf());

describe("Testing aggregate commands in isolation", () => {
  test("should commands with empty payload throw error", () => {
    expect(() => createTest({}, {})).toThrow("Aggregate validation error");
  });

  test("should createTest command return an TestCreatedEvent", () => {
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

describe("Testing news aggregate with cqrs fixture", () => {
  let fixture;

  beforeEach(() => {
    fixture = new CQRSFixture(aggregate);
  });

  test("should call raw command", () => {
    fixture
      .givenEvents([])
      .when({
        aggregateId: "12345",
        aggregateName: "test",
        type: "createTest",
        payload,
      })
      .expectEvents(TestCreatedEvent({ ...payload, createdAt: Date.now() }));
  });

  test("should command function", () => {
    fixture
      .givenEvents()
      .when(createTest, payload)
      .expectEvents(TestCreatedEvent({ ...payload, createdAt: Date.now() }));
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

    fixture
      .givenEvents(initialEventStream)
      .whenThrow(genericCommandTest, {})
      .toThrow("Aggregate is already deleted");
  });
});
