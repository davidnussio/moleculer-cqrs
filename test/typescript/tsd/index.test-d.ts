import { expectType } from "tsd";

import { CQRSFixture } from "../../..";

function TestEvent() {
  return { x: 1, y: 2 };
}

function command_1(state: any, payload: any) {}

// Initialize
const fixture = new CQRSFixture({});

// Check fixture.givenEvents
expectType<CQRSFixture>(fixture.givenEvents());
expectType<CQRSFixture>(fixture.givenEvents([]));
expectType<CQRSFixture>(fixture.givenEvents([TestEvent()]));

// Check fixture.when()
expectType<CQRSFixture>(fixture.givenEvents([TestEvent()]).when(command_1));
expectType<CQRSFixture>(fixture.givenEvents([TestEvent()]).when({}));
expectType<CQRSFixture>(fixture.givenEvents([TestEvent()]).when("command_1"));

// Check fixture.whenThrow()
expectType<jest.Expect>(
  fixture.givenEvents([TestEvent()]).whenThrow(command_1)
);
expectType<jest.Expect>(fixture.givenEvents([TestEvent()]).whenThrow({}));
expectType<jest.Expect>(
  fixture.givenEvents([TestEvent()]).whenThrow("command_1")
);

// Check fixture.expectEvent()
expectType<CQRSFixture>(
  fixture
    .givenEvents([TestEvent()])
    .when(command_1)
    .expectEvent(TestEvent())
);
expectType<CQRSFixture>(fixture.givenEvents([TestEvent()]).when({}));
expectType<CQRSFixture>(
  fixture
    .givenEvents([TestEvent()])
    .when("command_1")
    .expectEvent(TestEvent())
);

// Check fixture.when()
expectType<CQRSFixture>(
  fixture
    .givenEvents([TestEvent()])
    .when(command_1)
    .expectEvent(TestEvent())
    .inspectState((state: any) => {})
);
expectType<CQRSFixture>(
  fixture
    .givenEvents([TestEvent()])
    .when({})
    .inspectState((state: any) => {})
    .expectEvent(TestEvent())
);
expectType<CQRSFixture>(
  fixture
    .givenEvents([TestEvent()])
    .when("command_1")
    .expectEvent(TestEvent())
    .inspectState((state: any) => {})
);
