/*
 * moleculer-cli
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer-cli)
 * MIT Licensed
 */

const fs = require("fs");
const path = require("path");
const inquirer = require("inquirer");
const { render } = require("consolidate").handlebars;
const glob = require("glob").sync;

const fail = err => {
  console.error(err);
  throw new Error(err);
};

const templates = glob(
  path.join(__dirname, "aggregate-template", "*.template")
).map(f => path.parse(f).name);

function getRenderedTemplatePath(values, templateName) {
  switch (templateName) {
    case "view-model-service":
      return path.join(
        values.serviceFolder,
        `${values.viewModelName}.service.js`
      );
    case "cqrs-service":
      return path.join(
        values.serviceFolder,
        `${values.aggregateName}.service.js`
      );
    case "tests":
      return path.join(
        values.newAggregatePath,
        "__tests__",
        `${values.aggregateName}.js`
      );
    default:
      return path.join(values.newAggregatePath, `${templateName}.js`);
  }
}

function generateAggeregate(opts) {
  const values = { ...opts };

  return (
    Promise.resolve()
      .then(() => {
        return inquirer
          .prompt([
            {
              type: "input",
              name: "aggregateFolder",
              message: "Aggregate directory: ",
              default: "./aggregates",
              validate(input) {
                if (!fs.existsSync(path.resolve(input)))
                  return `The '${input}' directory is not exists! Full path: ${path.resolve(
                    input
                  )}`;

                return true;
              },
            },
            {
              type: "input",
              name: "aggregateName",
              message: "Aggregate name: ",
              default: "hello",
            },
            {
              type: "confirm",
              name: "generateService",
              message: "Do you want generate a view model service? ",
            },
            {
              when: response => {
                return response.generateService;
              },
              type: "input",
              name: "serviceFolder",
              message: "Services directory: ",
              default: "./services",
              validate(input) {
                if (!fs.existsSync(path.resolve(input)))
                  return `The '${input}' directory is not exists! Full path: ${path.resolve(
                    input
                  )}`;

                return true;
              },
            },
            {
              when: response => {
                return response.generateService;
              },
              type: "input",
              name: "viewModelName",
              message: "View model name: ",
              default: "model-list",
            },
          ])
          .then(answers => {
            Object.assign(values, answers);

            const newAggregatePath = path.join(
              values.aggregateFolder,
              values.aggregateName
            );
            const newAggregateTestsPath = path.join(
              newAggregatePath,
              "__tests__"
            );
            values.newAggregatePath = newAggregatePath;
            values.newAggregateTestsPath = newAggregateTestsPath;

            const [first, ...rest] = values.aggregateName;
            values.camelCaseName = `${first.toUpperCase()}${rest.join("")}`;

            if (fs.existsSync(newAggregatePath)) {
              return inquirer
                .prompt([
                  {
                    type: "confirm",
                    name: "sure",
                    message: "The file is exists! Overwrite? ",
                    default: false,
                  },
                ])
                .then(({ sure }) => {
                  if (!sure) fail("Aborted");
                });
            }
            fs.mkdirSync(newAggregatePath);
            fs.mkdirSync(newAggregateTestsPath);

            return Promise.resolve();
          });
      })
      .then(async () => {
        await Promise.all(
          templates.map(templateName => {
            const templatePath = path.join(
              __dirname,
              "aggregate-template",
              `${templateName}.template`
            );
            const template = fs.readFileSync(templatePath, "utf8");

            return new Promise((resolve, reject) => {
              render(template, values, function(err, res) {
                if (err) return reject(err);

                const renderedTemplatePath = getRenderedTemplatePath(
                  values,
                  templateName
                );
                console.log(
                  `Create new service file to '${renderedTemplatePath}'...`
                );
                fs.writeFileSync(
                  path.resolve(renderedTemplatePath),
                  res,
                  "utf8"
                );

                return resolve();
              });
            });
          })
        );
      })

      // Error handler
      .catch(err => fail(err))
  );
}

/**
 * Yargs command
 */
module.exports = {
  command: "cqrs generate",
  describe:
    "Generate aggregate skeleton, moleculer read-model service and view-model",
  action(_, opts) {
    return generateAggeregate(opts.name);
  },
};
