const CQRSFixture = require("../../../src/cqrs-fixture");

const aggregate = require("..");

const {
  commands: { createTest, deleteTest },
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
      .expectEvents(TestCreatedEvent(payload));
  });

  test("should command function", () => {
    fixture
      .givenEvents()
      .when(createTest, payload)
      .expectEvents(TestCreatedEvent(payload));
  });

  test("should reject upvode command when news already deleted", () => {
    fixture
      .givenEvents([TestCreatedEvent(payload), TestDeletedEvent()])
      .whenThrow(deleteTest, {})
      .toThrow("Aggregate is already deleted");
  });
});
