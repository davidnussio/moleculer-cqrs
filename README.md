![Moleculer logo](http://moleculer.services/images/banner.png)

[![Build Status](https://travis-ci.org/davidnussio/moleculer-cqrs.svg?branch=master)](https://travis-ci.org/davidnussio/moleculer-cqrs)
[![Coverage Status](https://coveralls.io/repos/github/davidnussio/moleculer-cqrs/badge.svg?branch=master)](https://coveralls.io/github/davidnussio/moleculer-cqrs?branch=master)
![Code Climate maintainability](https://img.shields.io/codeclimate/maintainability/davidnussio/moleculer-cqrs)
[![David](https://img.shields.io/david/davidnussio/moleculer-cqrs.svg)](https://david-dm.org/davidnussio/moleculer-cqrs)
[![Known Vulnerabilities](https://snyk.io/test/github/davidnussio/moleculer-cqrs/badge.svg)](https://snyk.io/test/github/davidnussio/moleculer-cqrs)

# moleculer-cqrs [![NPM version](https://img.shields.io/npm/v/moleculer-cqrs.svg)](https://www.npmjs.com/package/moleculer-cqrs)

CQRS and Event sourcing module for moleculerjs

## Getting started

If you want skip next steps and start playing with moleculer & moleculer-cqrs clone [moleculer-cqrs-skeleton](https://github.com/davidnussio/moleculer-cqrs-skeleton) repository

### Create node project

```bash
npx moleculer init project moleculer-cqrs-skeleton
```

### Initialize git repository

```bash
git init
```

### Install dependencies

```bash
npm install --save moleculer-db moleculer-cqrs
```

### Create domain code (aggregate)

```bash
node node_modules/moleculer-cqrs/bin/cqrs-generator.js
  local@notebook~$ cqrs generate
  Aggregate directory: ./aggregates
  Aggregate name: todo
  ? Do you want generate a view model service?  Yes
  Services directory: ./services
  View model name: todo-list
```

Add aggregate path to jest roots

```diff
diff --git a/package.json b/package.json
index 3b31276..c82b69d 100644
--- a/package.json
+++ b/package.json
@@ -37,7 +37,8 @@
     "testEnvironment": "node",
     "rootDir": "./services",
     "roots": [
-      "../test"
+      "../test",
+      "../aggregates"
     ]
   }
 }
```

### Run test

```bash
npm run ci
```

### Install Event Sourcing storage adapter

```bash
mkdir event-sourcing-storage
mkdir data
touch event-sourcing-storage/index.js
npm install --save resolve-storage-lite
```

```javascript
// event-sourcing-storage/index.js

const createEsStorage = require("resolve-storage-lite").default;

const eventStore = createEsStorage({
  databaseFile: "./data/event-store.sqlite",
});

module.exports = eventStore;
```

### Staring up and playing with moleculer services

```bash
npm run dev

# Moleculer repl
mol $

# Dispatch commands
call todo.command '{"aggregateId":"uuid-todo-1", "type":"createTodo", "payload":{"title": "Buy Milk"}}'
call todo.command '{"aggregateId":"uuid-todo-2", "type":"createTodo", "payload":{"title": "Buy Eggs"}}'
call todo.command '{"aggregateId":"uuid-todo-3", "type":"createTodo", "payload":{"title": "Buy a new Google Pixel 4 XL"}}'

# Query view-model todo-list (MoleculerDb service)
call todo-list.list

# Query read-model materialized aggregate on-the-fly from event-sourcing
call todo.read-model '{"aggregateId":"uuid-todo-2"}'

# Dispatch command
call todo.command '{"aggregateId":"uuid-todo-2", "type":"deleteTodo", "payload":{"message": "Alredy bought"}}'

# Query read-model (state after deleted command)
call todo.read-model '{"aggregateId":"uuid-todo-2"}'

# Query view-model (after delete event dipatched by deleted command)
call todo-list.list

# Call MoleculerDb remove, delete data
call todo-list.remove '{"id":"uuid-todo-1"}'
call todo-list.remove '{"id":"uuid-todo-3"}'

# Query view-model after manually deleted data
call todo-list.list

# Regenerate view-model from saved events
call todo.replay '{"viewModels":["todo-list"]}'

# Query view-model after regeneration from events
call todo-list.list

# Query aggregate event history (with or without payload)
call todo.history '{"aggregateId":"uuid-todo-2"}'
call todo.history '{"aggregateId":"uuid-todo-2", "payload": true}'

# Query read-model (using history events timestamp + 1 millis)
# Note: add 1 millis to history timestamp because finishTime in not included
call todo.read-model '{"aggregateId":"uuid-todo-2", "finishTime":1572097057195}'
```

## Aggregate service source code

CQRSEventSourcing service expose four actions but _command_, _read-model_ and _history_ are avaiable only if the mixin recieved and aggregate as parameter.

### Actions:

- command
  - command action needs aggregateId, type and payload parameters
- read-model
  - read-model action needs aggregateId parameter and accept finishTime (timestamp) parameter to load only events untill the specificated datetime
- history
  - history action needs aggregateId parameter and accept payload (boolean) parameter to load payload data as well
- replay
  - replay action needs viewModels (array of view-model name) parameter

### EventSourcingStorage

- `$ npm install --save resolve-storage-lite` - Adapter info: [SQLite](https://github.com/reimagined/resolve/tree/master/packages/adapters/storage-adapters/resolve-storage-lite)
- `$ npm install --save resolve-storage-mongo` - Adapter info: [Mongo DB](https://github.com/reimagined/resolve/tree/master/packages/adapters/storage-adapters/resolve-storage-mongo)
- `$ npm install --save resolve-storage-mysql` - Adapter info: [MySQL](https://github.com/reimagined/resolve/tree/master/packages/adapters/storage-adapters/resolve-storage-mysql)
- `$ npm install --save resolve-storage-postgresql-serverless` - Adapter info: [Postgresql serverless](https://github.com/reimagined/resolve/tree/master/packages/adapters/storage-adapters/resolve-storage-postgresql-serverless)

```javascript
const CQRSEventSourcing = require("moleculer-cqrs");
const EventSourcingStorage = require("../event-sourcing-storage");
const aggregate = require("../aggregates/todo");

module.exports = {
  name: "todo",
  mixins: [CQRSEventSourcing({ aggregate })],
  storage: EventSourcingStorage,
  settings: {},
  dependencies: [],
  actions: {},
  events: {},
  methods: {},
  created() {},
  started() {},
  stopped() {},
};
```

## Generate aggregate source code

Getting started with aggregate and service skeleton generated by command line.

`$ node node_modules/moleculer-cqrs/bin/mol-cqrs-gen.js`

## Testing

moleculer-cqrs provide a simple CQRSFixture module that let to test domain logic without any type of service.

CQRSFixture accept an aggregate and provide some methods:

- `givenEvents([...])` initialize aggregate state
- `when(command, payload)` execute command
- `expectEvent(event)` expect event dispatched from command
- `inspectState(state => expectCode)` inspectState where state could be verify
- `whenThrow(command, payload)` execute command that throw errors

```javascript
const { CQRSFixture } = require("moleculer-cqrs");

const aggregate = require("..");

const {
  commands: { createNews, deleteNews, addComment },
  events: { NewsCreatedEvent, NewsDeletedEvent, AddCommentEvent },
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
    expect(() => createNews({}, {})).toThrow("Aggregate validation error");
  });

  test("should createNews command return an NewsCreatedEvent", () => {
    expect(createNews({}, { payload })).toMatchSnapshot();
  });
});

describe("Testing  aggregate with cqrs fixture", () => {
  let fixture;

  beforeEach(() => {
    fixture = new CQRSFixture(aggregate);
  });

  test("should call raw command", () => {
    fixture
      .givenEvents([])
      .when({
        aggregateId: "aggregate-uuid-1",
        aggregateName: "news",
        type: "createNews",
        payload,
      })
      .expectEvent(NewsCreatedEvent({ ...payload, createdAt: Date.now() }));
  });

  test("should createNews return an NewsCreatedEvent event", () => {
    fixture
      .givenEvents()
      .when(createNews, payload)
      .expectEvent(NewsCreatedEvent({ ...payload, createdAt: Date.now() }));
  });

  test("should reject all next commands when aggregate is already deleted", () => {
    const initialEventStream = [
      NewsCreatedEvent({ ...payload, createdAt: Date.now() }),
      NewsDeletedEvent({ deletedAt: Date.now() }),
    ];
    fixture
      .givenEvents(initialEventStream)
      .whenThrow(deleteNews, {})
      .toThrow("Aggregate is already deleted");

    fixture
      .givenEvents(initialEventStream)
      .whenThrow(addComment, {})
      .toThrow("Aggregate is already deleted");
  });

  test("should add comments to news", () => {
    const initialEventStream = [
      NewsCreatedEvent({ ...payload, createdAt: Date.now() }),
      AddCommentEvent({
        commentId: "uuid-comment-1",
        text: "Comment text 1",
        author: "author 1",
        createdAt: Date.now(),
      }),
    ];
    fixture
      .givenEvents(initialEventStream)
      .when(addComment, {
        commentId: "uuid-comment-2",
        text: "Comment text 2",
        author: "author 2",
      })
      .expectEvent(
        AddCommentEvent({
          commentId: "uuid-comment-2",
          text: "Comment text 2",
          author: "author 2",
          createdAt: Date.now(),
        })
      )
      .inspectState(state =>
        expect(Object.keys(state.comments).length).toEqual(2)
      );
  });
});
```
