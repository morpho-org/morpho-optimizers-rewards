// enable user to disable logging
if (process.env.DISABLE_TEST_VERBOSE_LOGGING === "true") console.log = jest.fn();

jest.setTimeout(60 * 15 * 1e3);
