const {
  types: { CREATED, DELETED, GENERIC_EVENT },
} = require("./events");

module.exports = {
  Init: () => ({}),
  [CREATED]: (state, { payload }) => ({
    ...state,
    ...payload,
  }),

  [DELETED]: state => ({
    ...state,
    deleted: true,
  }),

  [GENERIC_EVENT]: (state, { payload }) => ({
    ...state,
    ...payload,
  }),
};
