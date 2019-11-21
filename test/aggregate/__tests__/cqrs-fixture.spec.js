const { CQRSFixture } = require("../../..");

const aggregate = require("..");

const {
  commands: { createTest, deleteTest },
  events: { TestCreatedEvent, TestDeletedEvent },
} = aggregate;

const aggregateId = "aggregate-uuid-1";

jest
  .spyOn(global.Date, "now")
  .mockImplementation(() => new Date("2019-10-01T11:01:58.135Z").valueOf());

const payload = {
  title: "Test document title",
  userId: "user-id-1",
  text: "Asperiores nam tempora qui et provident temporibus illo et fugit.",
};

describe("CQRS fixture", () => {
  let fixture;

  beforeEach(() => {
    fixture = new CQRSFixture(aggregate);
  });

  describe("CQRS fixture api", () => {
    test("should able to inspect state the new state", () => {
      fixture
        .givenEvents()
        .when({
          aggregateId,
          type: "createTest",
          payload,
        })
        .inspectState(state =>
          expect(state.title).toEqual("Test document title")
        );
    });

    test("should throw error when try to deleted an already deleted aggregate", () => {
      expect(() =>
        fixture.givenEvents([TestCreatedEvent(), TestDeletedEvent()]).when({
          aggregateId,
          type: "deleteTest",
        })
      ).toThrow(/Aggregate validation/);
    });

    test("should throw error when try to deleted an already deleted aggregate", () => {
      fixture
        .givenEvents()
        .when(createTest, { aggregateId, payload })
        .expectEvent(TestCreatedEvent);
    });
  });

  describe("should throw an error", () => {
    test("when state is not initialized with dispatchEvents", () => {
      expect(() =>
        fixture.when({
          aggregateId,
          type: "createTest",
          payload,
        })
      ).toThrow("State is not an object. Did you call givenEvents method?");
    });

    test("when command does not have aggregate id", () => {
      expect(() =>
        fixture.givenEvents().when(deleteTest, { payload: {} })
      ).toThrow(
        "Validation command error, command does not have an aggregateId"
      );
    });

    test("when no command has been specified", () => {
      expect(() =>
        fixture.givenEvents().when("createTest", { payload: {} })
      ).toThrow(
        "Validation command error, command does not have an aggregateId"
      );
    });

    test("when no command has been specified", () => {
      expect(() =>
        fixture.givenEvents().when({}, { aggregateId, payload: {} })
      ).toThrow("Command dispatch error, aggregate command not found");
    });
  });
});
