declare namespace MoleculerCQRS {
  class CQRSFixture {
    constructor(aggregate?: any);
    givenEvents(events?: any[]): CQRSFixture;
    when(command: object | string | Function): CQRSFixture;
    whenThrow(command: object | string | Function): jest.Expect;
    expectEvent(event: any, aggregate?: any): CQRSFixture;
    inspectState(cb: Function): CQRSFixture;
  }
}

export = MoleculerCQRS;
