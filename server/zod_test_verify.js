try {
    const zodRequire = require('zod');
    console.log('Type of require("zod"):', typeof zodRequire);
    console.log('Is "z" property present?:', 'z' in zodRequire);
    console.log('Is "object" property present?:', 'object' in zodRequire); // z.object()

    // Check destructuring
    const { z } = require('zod');
    console.log('Type of { z }: ', typeof z);
} catch (e) {
    console.error(e);
}
