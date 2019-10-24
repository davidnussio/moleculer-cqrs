/* eslint-disable global-require */
const {
  Errors: { MoleculerClientError, MoleculerServerError },
} = require("moleculer");
const commandHandler = require("resolve-command").default;
const createEsStorage = require("resolve-storage-lite").default;
// const createSnapshotAdapter = require("resolve-snapshot-lite").default;
const createEventStore = require("resolve-es").default;
const Validator = require("fastest-validator");

const aggregateSchema = {
  name: { type: "string", min: 3 },
  projection: {
    type: "object",
    props: { Init: "function" },
  },
  commands: { type: "object" },
  events: { type: "object", props: { types: { type: "object" } } },
  // invariantHash: string?,
  // serializeState: function
  // deserializeState: function
};

module.exports = function CQRSEventSource({
  aggregate = false,
  replay = false,
}) {
  const v = new Validator();
  let vRes;

  if (aggregate) {
    // eslint-disable-next-line no-cond-assign
    if ((vRes = v.validate(aggregate, aggregateSchema)) !== true) {
      throw new Error(
        `CQRSEventSource${vRes.map(err => err.message).join("\n")}`
      );
    }
  }

  return {
    storage: undefined,
    commandHandler: undefined,
    aggregateName: undefined,
    eventStore: undefined,
    aggregate: undefined,
    metadata: {
      aggregate: false,
      commands: [],
      projection: [],
      events: [],
    },
    settings: {
      aggregate,
      replay,
    },
    actions: {
      command: {
        params: {
          aggregateId: "any",
          type: "string",
          payload: "object",
        },
        async handler(ctx) {
          const { aggregateId, type } = ctx.params;
          try {
            if (!this.aggregate) {
              throw new MoleculerClientError(
                `Aggregate '${this.aggregateName}' is not configurated, command action is disabled!`
              );
            }
            this.logger.debug(
              `AggregateName: ${this.aggregateName} → ${aggregateId} → ${ctx.params.type}`
            );
            await this.commandHandler({
              ...ctx.params,
              aggregateName: this.aggregateName,
            });
          } catch (e) {
            this.logger.error(e.message, ctx.params);
            throw new MoleculerClientError(
              `Aggregate command (id:${aggregateId}) '${this.aggregateName}.${type}' failed: ${e.message}`
            );
          }
          return {
            status: true,
            aggregateName: this.aggregateName,
            aggregateId,
          };
        },
      },
      "read-model": {
        params: {
          aggregateId: "any",
          finishTime: { type: "number", optional: true },
        },
        async handler(ctx) {
          if (!this.aggregate) {
            return "Aggregate is not configurated, read-model action is disabled!";
          }
          const hrstart = process.hrtime();
          const { aggregateId, finishTime } = ctx.params;

          this.logger.info(aggregateId, ctx.params);

          this.logger.info(
            `Load event history for aggregate '${this.aggregateName}' with aggregateId '${aggregateId}', finishTime {finishTime}`
          );

          const eventFilter = {
            aggregateIds: [aggregateId],
            finishTime,
          };

          const result = await this.materializeReadModelState(eventFilter);

          const hrend = process.hrtime(hrstart);
          this.logger.info(
            `Materialized ${
              this.aggregateName
            } with aggregateId ${aggregateId} ${hrend[0]}s ${hrend[1] /
              1000000}ms`
          );
          return result;
        },
      },
      history: {
        params: {
          aggregateId: "any",
        },
        async handler(ctx) {
          if (!this.aggregate) {
            return "Aggregate is not configurated, history action is disabled!";
          }
          const hrstart = process.hrtime();
          const {
            aggregateId,
            payload = false,
            startTime,
            finishTime,
          } = ctx.params;

          this.logger.info(aggregateId, ctx.params);

          this.logger.info(
            `Load event history for aggregate '${this.aggregateName}' with aggregateId '${aggregateId}'`
          );

          this.logger.info(
            `Options: payload=${payload}, startTime=${startTime}, finishTime=${finishTime}`
          );

          const eventFilter = {
            // eventTypes: ["news/created"] // Or null to load ALL event types
            aggregateIds: [aggregateId], // Or null to load ALL aggregate ids
            startTime, // Or null to load events from beginning of time
            finishTime, // Or null to load events to current time
          };

          const result = await this.loadHistory(eventFilter, payload);

          const hrend = process.hrtime(hrstart);
          this.logger.info(
            `Materialized ${this.aggregateName} with aggregateId ${aggregateId} %ds %dms`,
            hrend[0],
            hrend[1] / 1000000
          );
          return result;
        },
      },
      replay: {
        params: {
          viewModels: { type: "array" },
          broadcast: { type: "boolean", optional: true },
        },
        async handler(ctx) {
          const hrstart = process.hrtime();

          const events = this.broker.registry.getEventList({
            onlyLocal: false,
            onlyAvailable: true,
            skipInternal: true,
            withEndpoints: false,
          });

          const {
            viewModels,
            startTime,
            finishTime,
            broadcast = false,
          } = ctx.params;

          const eventTypes = [
            ...new Set(
              events.filter(e => viewModels.includes(e.group)).map(e => e.name)
            ),
          ];

          this.logger.info("Replay events", viewModels);

          this.logger.info(
            `Options: startTime=${startTime}, finishTime=${finishTime}, broadcast events=${broadcast}`
          );

          const eventFilter = {
            eventTypes, // Or null to load ALL event types
            startTime, // Or null to load events from beginning of time
            finishTime, // Or null to load events to current time
          };

          let eventCount = 0;

          const eventHandler = async event => {
            this.logger.debug(event.type, event, viewModels);
            if (broadcast) {
              await this.broker.broadcast(event.type, event, viewModels);
            } else {
              await this.broker.emit(
                event.type,
                { ...event, sequence: eventCount },
                viewModels
              );
            }
            await this.delay(10);
            eventCount++;
          };

          await Promise.all(
            viewModels.map(viewModel => {
              return this.broker.call(`${viewModel}.dispose`).catch(e => {
                if (e.code !== 404) {
                  this.logger.error(e);
                  throw new MoleculerServerError(e.message);
                }
              });
            })
          );

          await this.eventStore.loadEvents(eventFilter, eventHandler);

          const hrend = process.hrtime(hrstart);
          this.logger.info(
            `Replayed event types (${eventTypes.join(
              ", "
            )}), total events emitted ${eventCount} (broadcast mode → ${broadcast}) ${
              hrend[0]
            }s ${hrend[1] / 1000000}ms`
          );
          return { eventFilter, eventCount };
        },
      },
    },
    methods: {
      async delay(ms = 10) {
        return new Promise(resolve => setTimeout(resolve, ms));
      },
      async loadHistory(eventFilter, withPayload) {
        let eventCount = 0;
        const state = [];

        const eventHandler = async event => {
          state.push({
            version: event.aggregateVersion,
            timestamp: event.timestamp,
            datetime: new Date(event.timestamp).toISOString(),
            eventType: event.type,
            ...{ ...(withPayload && { payload: event.payload }) },
          });
          eventCount++;
        };

        await this.eventStore.loadEvents(eventFilter, eventHandler);

        this.logger.info("Loaded %d", eventCount);
        return state;
      },
      async materializeReadModelState(eventFilter) {
        let eventCount = 0;
        const { projection } = this.aggregate;
        let state = projection.Init();

        const eventHandler = event => {
          state = projection[event.type](state, event);
          eventCount++;
        };

        await this.eventStore.loadEvents(eventFilter, eventHandler);

        this.logger.info("Loaded %d events", eventCount);

        return state;
      },
    },

    created() {
      if (!this.schema.storage) {
        this.logger.info("No storage defined, use default memory storage");
        this.storage = createEsStorage({ databaseFile: ":memory:" });
      } else {
        this.storage = this.schema.storage;
      }

      if (this.schema.aggregateName) {
        this.aggregateName = this.schema.aggregateName;
      } else {
        this.aggregateName = this.name;
      }

      const publishEvent = ctx => event => {
        ctx.broker.broadcast(event.type, event);
      };

      this.eventStore = createEventStore({
        storage: this.storage,
        publishEvent: publishEvent(this),
      });

      if (this.settings.aggregate) {
        this.aggregate = this.settings.aggregate;
        delete this.settings.aggregate;
        this.commandHandler = commandHandler({
          eventStore: this.eventStore,
          aggregates: [this.aggregate],
          // snapshotAdapter
        });
        this.metadata.aggregate = true;
        this.metadata.commands = Object.keys(this.aggregate.commands).map(
          name => name
        );
        this.metadata.projection = Object.keys(this.aggregate.projection).map(
          name => name
        );
        this.metadata.events = Object.keys(this.aggregate.events.types).map(
          name => this.aggregate.events.types[name]
        );
      }
    },
  };
};
