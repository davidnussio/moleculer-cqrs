const vorpal = require("@moleculer/vorpal")();

const aggregateGenerator = require("../src/aggregate-generator");

vorpal
  .command(aggregateGenerator.command)
  .description(aggregateGenerator.describe)
  // .autocomplete(["aggregate"])
  .action(function(args, callback) {
    aggregateGenerator.action(callback, args);
  });

vorpal.show().parse(process.argv);
