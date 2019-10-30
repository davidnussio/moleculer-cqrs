module.exports = function(plop) {
  plop.setGenerator("controller", {
    description: "application controller logic",
    prompts: [
      {
        type: "input",
        name: "aggregateDir",
        message: "Aggregate directory:",
        default: "aggregates",
      },
      {
        type: "input",
        name: "name",
        message: "Aggregate name:",
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
        name: "serviceDir",
        message: "Services directory:",
        default: "services",
      },
      {
        when: response => {
          return response.generateService;
        },
        type: "input",
        name: "viewModelName",
        message: "View model name:",
      },
    ],
    actions: answers => {
      const actions = [
        {
          type: "add",
          path: "{{aggregateDir}}/validate.js",
          templateFile: "templates/validate.hbs",
          skipIfExists: true,
        },
        {
          type: "add",
          path: "{{aggregateDir}}/{{dashCase name}}/commands/index.js",
          templateFile: "templates/command-index.hbs",
        },
        {
          type: "add",
          path:
            "{{aggregateDir}}/{{dashCase name}}/commands/create{{properCase name}}.js",
          templateFile: "templates/command-create.hbs",
        },
        {
          type: "add",
          path:
            "{{aggregateDir}}/{{dashCase name}}/commands/delete{{properCase name}}.js",
          templateFile: "templates/command-delete.hbs",
        },
        {
          type: "add",
          path:
            "{{aggregateDir}}/{{dashCase name}}/commands/genericCommand{{properCase name}}.js",
          templateFile: "templates/command-generic.hbs",
        },
        {
          type: "add",
          path: "{{aggregateDir}}/{{dashCase name}}/events.js",
          templateFile: "templates/events.hbs",
        },
        {
          type: "add",
          path: "{{aggregateDir}}/{{dashCase name}}/projection.js",
          templateFile: "templates/projection.hbs",
        },
        {
          type: "add",
          path: "{{aggregateDir}}/{{dashCase name}}/index.js",
          templateFile: "templates/index.hbs",
        },
        {
          type: "add",
          path:
            "{{aggregateDir}}/{{dashCase name}}/__tests__/{{dashCase name}}.spec.js",
          templateFile: "templates/aggregate.spec.hbs",
        },
      ];

      if (answers.generateService) {
        return actions.concat([
          {
            type: "add",
            path: "{{serviceDir}}/cqrs.{{dashCase name}}.service.js",
            templateFile: "templates/cqrs-service.hbs",
          },
          {
            type: "add",
            path: "{{serviceDir}}/{{viewModelName}}.service.js",
            templateFile: "templates/view-model-service.hbs",
          },
        ]);
      }

      return actions;
    },
  });
};
